import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { api, errorMessage, queryClient } from "../lib/api";
import { useSession } from "./hooks";
import { Button } from "../components/ui/button";
export function FavoriteButton({ id, name }: { id: string; name: string }) {
  const { data: session } = useSession(),
    path = useRouterState({ select: (s) => s.location.href });
  const token = localStorage.getItem("jungle-token"),
    key = ["private", session?.user.id, "favorites"];
  const favorites = useQuery({
    queryKey: key,
    enabled: !!session,
    queryFn: async ({ signal }) =>
      (await api.get<string[]>("/favorites", { signal })).data,
  });
  const mutation = useMutation({
    mutationFn: async (add: boolean) =>
      (
        await api.request<string[]>({
          method: add ? "PUT" : "DELETE",
          url: `/favorites/${encodeURIComponent(id)}`,
          data: add ? {} : undefined,
        })
      ).data,
    onMutate: async (add) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<string[]>(key) || [];
      if (localStorage.getItem("jungle-token") === token)
        queryClient.setQueryData(
          key,
          add ? [...new Set([...before, id])] : before.filter((i) => i !== id),
        );
      return { before };
    },
    onError: (_error, _add, context) => {
      if (localStorage.getItem("jungle-token") === token)
        queryClient.setQueryData(key, context?.before || []);
    },
    onSuccess: (data) => {
      if (localStorage.getItem("jungle-token") === token)
        queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      if (localStorage.getItem("jungle-token") === token)
        void queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const selected = favorites.data?.includes(id) || false;
  if (!session)
    return (
      <Link className="favorite-login" to="/login" search={{ returnTo: path }}>
        <Heart size={16} /> Entrar para favoritar
      </Link>
    );
  return (
    <div className="favorite-action">
      <Button
        variant="outline"
        aria-pressed={selected}
        aria-label={`${selected ? "Remover" : "Adicionar"} ${name} ${selected ? "dos" : "aos"} favoritos`}
        disabled={
          favorites.isPending || favorites.isError || mutation.isPending
        }
        onClick={() => mutation.mutate(!selected)}
      >
        <Heart size={17} fill={selected ? "currentColor" : "none"} />
        {selected ? "Favoritado" : "Favoritar"}
      </Button>
      {(mutation.error || favorites.error) && (
        <p role="alert" className="form-error">
          {errorMessage(mutation.error || favorites.error)}
        </p>
      )}
      {favorites.isError && (
        <button
          className="text-button"
          onClick={() => void favorites.refetch()}
        >
          Tentar carregar favoritos
        </button>
      )}
    </div>
  );
}

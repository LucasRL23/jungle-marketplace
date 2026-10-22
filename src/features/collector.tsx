import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { Profile, Session } from "../domain";
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
export function FavoritesPanel() {
  const { data: session } = useSession();
  const favorites = useQuery({
    queryKey: ["private", session?.user.id, "favorites"],
    enabled: !!session,
    queryFn: async ({ signal }) =>
      (await api.get<string[]>("/favorites", { signal })).data,
  });
  return (
    <div className="account-favorites">
      <h2>Meus favoritos</h2>
      {favorites.isPending ? (
        <p>Carregando favoritos…</p>
      ) : favorites.isError ? (
        <p role="alert">{errorMessage(favorites.error)}</p>
      ) : favorites.data?.length ? (
        <ul>
          {favorites.data.map((id) => (
            <li key={id}>
              <Link to="/nft/$id" params={{ id }}>
                Ver NFT {id.replace("nft-", "")} →
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>Você ainda não tem favoritos.</p>
      )}
    </div>
  );
}
async function readAvatar(file: File) {
  if (
    file.size > 256 * 1024 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("Use uma imagem PNG, JPEG ou WebP de até 256 KB.");
  const value = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = value;
  try {
    await image.decode();
  } catch {
    throw new Error("O arquivo de imagem é inválido.");
  }
  return value;
}
export function ProfileEditor() {
  const { data: session } = useSession(),
    token = localStorage.getItem("jungle-token");
  const key = ["private", session?.user.id, "profile"];
  const profile = useQuery({
    queryKey: key,
    enabled: !!session,
    queryFn: async ({ signal }) =>
      (await api.get<Profile>("/profile", { signal })).data,
  });
  const [notice, setNotice] = useState(""),
    [imageError, setImageError] = useState(""),
    [passwordError, setPasswordError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const save = async (value: Profile) => {
    if (localStorage.getItem("jungle-token") !== token) return;
    await queryClient.cancelQueries({ queryKey: ["session"] });
    if (localStorage.getItem("jungle-token") !== token) return;
    queryClient.setQueryData(key, value);
    queryClient.setQueryData<Session | null>(["session"], (old) =>
      old
        ? {
            ...old,
            user: { id: value.id, name: value.name, email: value.email },
          }
        : old,
    );
  };
  const update = useMutation({
    mutationFn: async (body: Record<string, FormDataEntryValue>) =>
      (await api.patch<Profile>("/profile", body)).data,
    onSuccess: async (value) => {
      await save(value);
      setNotice("Perfil atualizado com sucesso.");
    },
  });
  const avatar = useMutation({
    mutationFn: async (value: string) =>
      (await api.patch<Profile>("/profile/avatar", { avatar: value })).data,
    onSuccess: async (value) => {
      await save(value);
      setNotice("Foto do perfil atualizada.");
      if (fileRef.current) fileRef.current.value = "";
    },
  });
  const password = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.post("/password", body),
    onSuccess: () =>
      setNotice(
        "Senha alterada com sucesso. As outras sessões foram encerradas.",
      ),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotice("");
    update.mutate(Object.fromEntries(new FormData(e.currentTarget)));
  };
  const changePassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setNotice("");
    const form = e.currentTarget,
      data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setPasswordError("A confirmação da senha não corresponde.");
      return;
    }
    password.mutate(
      {
        currentPassword: String(data.get("currentPassword")),
        newPassword: String(data.get("newPassword")),
      },
      { onSuccess: () => form.reset() },
    );
  };
  if (profile.isPending)
    return (
      <div
        className="skeleton summary-skeleton"
        aria-label="Carregando perfil"
        role="status"
      />
    );
  if (profile.isError)
    return (
      <div role="alert">
        <p>{errorMessage(profile.error)}</p>
        <Button onClick={() => void profile.refetch()}>
          Tentar carregar perfil
        </Button>
      </div>
    );
  const data = profile.data!;
  return (
    <div className="profile-editor">
      <h2>Perfil do colecionador</h2>
      <div className="profile-avatar">
        {data.avatar ? (
          <img src={data.avatar} alt={`Avatar de ${data.name}`} />
        ) : (
          <div className="avatar-placeholder" aria-label="Sem foto de perfil">
            {data.name.charAt(0)}
          </div>
        )}
        <div>
          <label className="field">
            Foto do perfil
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={avatar.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageError("");
                setNotice("");
                void readAvatar(file)
                  .then((value) => avatar.mutate(value))
                  .catch((error) => {
                    setImageError((error as Error).message);
                    if (fileRef.current) fileRef.current.value = "";
                  });
              }}
            />
          </label>
          <small>PNG, JPEG ou WebP · até 256 KB</small>
          {data.avatar && (
            <button
              className="text-button"
              disabled={avatar.isPending}
              onClick={() => avatar.mutate("")}
            >
              Remover foto do perfil
            </button>
          )}
        </div>
      </div>
      {(imageError || avatar.error) && (
        <p className="form-error" role="alert">
          {imageError || errorMessage(avatar.error)}
        </p>
      )}
      <div className="commerce-grid">
        <form
          className="form summary"
          onSubmit={submit}
          key={`${data.id}:${data.name}:${data.email}`}
        >
          <label className="field">
            Nome do perfil
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={data.name}
              aria-describedby={update.error ? "profile-error" : undefined}
            />
          </label>
          <label className="field">
            E-mail do perfil
            <input
              name="email"
              type="email"
              required
              defaultValue={data.email}
              aria-describedby={update.error ? "profile-error" : undefined}
            />
          </label>
          <label className="field">
            Biografia
            <textarea
              name="bio"
              maxLength={500}
              defaultValue={data.bio}
              rows={4}
            />
          </label>
          {update.error && (
            <p id="profile-error" className="form-error" role="alert">
              {errorMessage(update.error)}
            </p>
          )}
          <Button disabled={update.isPending}>Salvar perfil</Button>
        </form>
        <form className="form summary" onSubmit={changePassword}>
          <h3>Alterar senha</h3>
          <label className="field">
            Senha atual
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              aria-describedby={
                password.error || passwordError ? "password-error" : undefined
              }
            />
          </label>
          <label className="field">
            Nova senha
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-describedby={
                password.error || passwordError ? "password-error" : undefined
              }
            />
          </label>
          <label className="field">
            Confirmar nova senha
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <small>Ao menos 8 caracteres, incluindo letras e números.</small>
          {(passwordError || password.error) && (
            <p id="password-error" role="alert" className="form-error">
              {passwordError || errorMessage(password.error)}
            </p>
          )}
          <Button disabled={password.isPending}>Alterar senha</Button>
        </form>
      </div>
      <p role="status">{notice}</p>
    </div>
  );
}

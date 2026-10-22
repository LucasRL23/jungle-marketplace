import { useQuery } from "@tanstack/react-query";
import type { Cart, Wallet } from "../domain";
import { api, sessionOptions } from "../lib/api";
export const useSession = () => useQuery(sessionOptions);
export function useCart() {
  const { data: session } = useSession();
  const owner = session?.user.id || "guest";
  const queryKey = session ? ["private", owner, "cart"] : ["guest-cart"];
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      (await api.get<Cart>("/cart", { signal })).data,
  });
  return { ...query, queryKey, owner };
}
export function useWallets() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["private", session?.user.id, "wallets"],
    enabled: !!session,
    queryFn: async ({ signal }) =>
      (await api.get<Wallet[]>("/wallets", { signal })).data,
  });
}

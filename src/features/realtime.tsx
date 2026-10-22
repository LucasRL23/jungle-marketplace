import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { Cart, Catalog, Nft, Order, ResourceEvent } from "../domain";
import { api, queryClient } from "../lib/api";
import { useSession } from "./hooks";

export function Realtime() {
  const { data: session } = useSession();
  const token = localStorage.getItem("jungle-token"),
    userId = session?.user.id;
  const [state, setState] = useState({
    status: "Conectando atualizações…",
    notice: "",
    connectionId: "",
  });
  useEffect(() => {
    let active = true;
    const versions = new Map<string, number>(),
      seen = new Set<string>();
    const current = () =>
      active && localStorage.getItem("jungle-token") === token;
    const socket = io(location.origin, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnectionDelay: 500,
      reconnectionDelayMax: 1500,
      randomizationFactor: 0,
    });

    const isInventoryQuery = (key: readonly unknown[]) =>
      ["nfts", "nft", "guest-cart", "guest-quote"].includes(String(key[0])) ||
      (key[0] === "private" &&
        key[1] === userId &&
        (key.includes("cart") || key.includes("quote")));
    const accept = (
      type: string,
      event: ResourceEvent<Nft | Order>,
      cachedVersion = 0,
    ) => {
      const key = `${type}:${event.resourceId}`;
      if (
        !current() ||
        !event.id ||
        event.data.id !== event.resourceId ||
        event.version !== event.data.version ||
        seen.has(event.id) ||
        event.version <= Math.max(versions.get(key) || 0, cachedVersion)
      )
        return false;
      versions.set(key, event.version);
      seen.add(event.id);
      if (seen.size > 256) seen.delete(seen.values().next().value!);
      return true;
    };
    socket.on("connect", () => socket.emit("subscribe", { token }));
    socket.on("session.expired", () => {
      if (current()) void api.get("/session").catch(() => undefined);
    });

    socket.on("session.ready", ({ connectionId }: { connectionId: string }) => {
      if (!current()) return;
      setState((prev) => ({
        ...prev,
        status: "Atualizações conectadas",
        connectionId,
      }));
      void queryClient.invalidateQueries({
        predicate: (q) =>
          isInventoryQuery(q.queryKey) ||
          (q.queryKey[0] === "private" &&
            q.queryKey[1] === userId &&
            (q.queryKey.includes("order") || q.queryKey.includes("orders"))),
      });
    });
    socket.on("disconnect", () => {
      if (current())
        setState((prev) => ({ ...prev, status: "Reconectando atualizações…" }));
    });
    socket.on("connect_error", () => {
      if (current())
        setState((prev) => ({
          ...prev,
          status: "Atualizações indisponíveis. Tentando reconectar…",
        }));
    });
    socket.on("nft.updated", async (event: ResourceEvent<Nft>) => {
      const detail = queryClient.getQueryData<Nft>(["nft", event.resourceId]);
      const catalogVersions = queryClient
        .getQueriesData<Catalog>({ queryKey: ["nfts"] })
        .flatMap(
          ([, data]) =>
            data?.items
              .filter((n) => n.id === event.resourceId)
              .map((n) => n.version) || [],
        );
      const cartVersions = queryClient
        .getQueriesData<Cart>({
          predicate: (q) =>
            q.queryKey[0] === "guest-cart" ||
            (q.queryKey[0] === "private" &&
              q.queryKey[1] === userId &&
              q.queryKey[2] === "cart"),
        })
        .flatMap(
          ([, data]) =>
            data?.items
              .filter((i) => i.nftId === event.resourceId)
              .map((i) => i.nft.version) || [],
        );
      if (
        !accept(
          "nft",
          event,
          Math.max(detail?.version || 0, ...catalogVersions, ...cartVersions),
        )
      )
        return;
      await queryClient.cancelQueries({
        predicate: (q) => isInventoryQuery(q.queryKey),
      });
      if (
        !current() ||
        versions.get(`nft:${event.resourceId}`) !== event.version
      )
        return;
      queryClient.setQueryData<Nft>(["nft", event.resourceId], (old) =>
        old && old.version < event.version ? event.data : old,
      );
      queryClient.setQueriesData<Catalog>({ queryKey: ["nfts"] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((n) =>
                n.id === event.resourceId && n.version < event.version
                  ? event.data
                  : n,
              ),
            }
          : old,
      );
      setState((prev) => ({
        ...prev,
        notice: `Preço ou disponibilidade de ${event.data.name} atualizado. Revise seu carrinho.`,
      }));
      void queryClient.invalidateQueries({
        predicate: (q) => isInventoryQuery(q.queryKey),
      });
    });
    socket.on("order.updated", async (event: ResourceEvent<Order>) => {
      if (!userId || event.data.userId !== userId) return;
      const key = ["private", userId, "order", event.resourceId];
      const cached = queryClient.getQueryData<Order>(key);
      if (cached && cached.status !== "pending") return;
      if (!accept("order", event, cached?.version || 0)) return;
      await queryClient.cancelQueries({ queryKey: key });
      if (!current()) return;
      queryClient.setQueryData<Order>(key, (old) =>
        old && old.status !== "pending"
          ? old
          : old && old.version >= event.version
            ? old
            : event.data,
      );
      void queryClient.invalidateQueries({
        queryKey: ["private", userId, "orders"],
      });
      if (event.data.status === "confirmed")
        void queryClient.invalidateQueries({
          predicate: (q) => isInventoryQuery(q.queryKey),
        });
    });
    const reset = () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
    window.addEventListener("jungle-session-reset", reset);
    return () => {
      window.removeEventListener("jungle-session-reset", reset);
      reset();
    };
  }, [token, userId]);
  return (
    <div className="realtime-notice" aria-live="polite">
      <span
        data-testid="realtime-status"
        data-connection-id={state.connectionId}
      >
        {state.status}
      </span>
      {state.notice && <p>{state.notice}</p>}
    </div>
  );
}

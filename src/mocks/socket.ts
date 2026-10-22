import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import type { Nft, Order, ResourceEvent } from "../domain";
import { authenticate, getDb } from "./store";
import { mockEvents } from "./events";

// MSW 2 normalizes /socket.io/ to / before matching WebSocket links.
const channel = ws.link(location.origin.replace(/^http/, "ws") + "/");
export const socketHandler = channel.addEventListener(
  "connection",
  (connection) => {
    if (new URL(connection.client.url).pathname !== "/socket.io/") {
      connection.server.connect();
      return;
    }

    const io = toSocketIo(connection);
    let token: string | null = null,
      userId: string | null = null,
      ready = false,
      closed = false;
    const request = () =>
      new Request(new URL("/api/session", location.origin), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    const expired = () => {
      ready = false;
      io.client.emit("session.expired");
      setTimeout(() => {
        if (!closed) connection.client.close(4001, "Session expired");
      }, 0);
    };
    io.client.on("subscribe", (_event, credentials: { token?: string }) => {
      token = typeof credentials?.token === "string" ? credentials.token : null;
      void getDb().then((db) => {
        if (closed) return;
        try {
          userId = authenticate(db, request(), false)?.id || null;
          ready = true;
          io.client.emit("session.ready", {
            connectionId: crypto.randomUUID(),
          });
        } catch {
          expired();
        }
      });
    });
    const forward =
      (type: "nft.updated" | "order.updated") => (event: Event) => {
        const envelope = (event as CustomEvent<ResourceEvent<Nft | Order>>)
          .detail;
        void getDb().then((db) => {
          if (!ready || closed) return;
          try {
            const current = authenticate(db, request(), false);
            if ((current?.id || null) !== userId) return;
            if (
              type === "order.updated" &&
              (!userId || (envelope.data as Order).userId !== userId)
            )
              return;
            io.client.emit(type, envelope);
          } catch {
            expired();
          }
        });
      };
    const nft = forward("nft.updated"),
      order = forward("order.updated");
    const disconnect = () =>
      connection.client.close(1012, "Simulated interruption");
    const ping = setInterval(() => {
      if (!closed) connection.client.send("2");
    }, 20000);
    mockEvents.addEventListener("nft.updated", nft);
    mockEvents.addEventListener("order.updated", order);
    mockEvents.addEventListener("demo.disconnect", disconnect);
    connection.client.addEventListener("close", () => {
      closed = true;
      clearInterval(ping);
      mockEvents.removeEventListener("nft.updated", nft);
      mockEvents.removeEventListener("order.updated", order);
      mockEvents.removeEventListener("demo.disconnect", disconnect);
    });
  },
);

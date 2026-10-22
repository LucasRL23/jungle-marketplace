import type { Nft, Order, ResourceEvent } from "../domain";
export const mockEvents = new EventTarget();
export function publish(
  type: "nft.updated" | "order.updated",
  resource: Nft | Order,
  delivery = "normal",
) {
  const data = structuredClone(resource);
  if (delivery === "stale") {
    data.version = Math.max(0, data.version - 1);
    if ("price" in data) data.price = "0.01";
    if ("status" in data) data.status = "pending";
  }
  const envelope: ResourceEvent<Nft | Order> = {
    id: crypto.randomUUID(),
    resourceId: data.id,
    version: data.version,
    data,
  };
  mockEvents.dispatchEvent(new CustomEvent(type, { detail: envelope }));
  if (delivery === "duplicate")
    mockEvents.dispatchEvent(new CustomEvent(type, { detail: envelope }));
}

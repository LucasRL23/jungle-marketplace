import type { CartItem, Nft, Order, Quote, User, Wallet } from "../domain";
import { eth, wei } from "../lib/money";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}
interface StoredUser extends User {
  salt: string;
  passwordHash: string;
  wallets: Wallet[];
}
interface StoredCart {
  items: CartItem[];
  coupon: string;
  version: number;
}
interface StoredOrder extends Order {
  key: string;
  payload: string;
  settleAt: number;
  outcome: "confirmed" | "declined";
}
interface Database {
  users: StoredUser[];
  sessions: Record<string, { userId: string; expiresAt: number }>;
  carts: Record<string, StoredCart>;
  quotes: Record<string, Quote & { owner: string }>;
  orders: StoredOrder[];
  inventory: Nft[];
}
const storageKey = "jungle-database-v2";
let database: Promise<Database> | undefined;
const names = [
  "Cosmic Perspective",
  "Golden Hour",
  "The Wanderer",
  "Quiet Dimensions",
  "Parallel Worlds",
  "After the Rain",
  "Digital Bloom",
  "Beyond the Horizon",
  "Inner Light",
  "New Beginnings",
  "Wild Spirit",
  "Dream State",
  "Infinite Garden",
  "Solitude",
  "Moonwalker",
  "Electric Soul",
  "Hidden Paradise",
  "The Observer",
  "Soft Motion",
  "Future Memories",
  "Echoes",
  "Organic Forms",
  "Another Universe",
  "Slow Days",
];
export const publicUser = (u: StoredUser): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
});
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function persist(db: Database) {
  localStorage.setItem(storageKey, JSON.stringify(db));
}
export function scenario() {
  return localStorage.getItem("jungle-scenario") || "success";
}
export async function getDb(): Promise<Database> {
  database ??= (async () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved) as Database;
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    const users: StoredUser[] = [];
    for (const [i, name] of ["Alex Collector", "Luna Collector"].entries()) {
      const salt = `fixture-${i}`;
      users.push({
        id: `user-${i + 1}`,
        name,
        email: i === 0 ? "alex@example.test" : "luna@example.test",
        salt,
        passwordHash: await passwordHash("Jungle123!", salt),
        wallets: [
          {
            id: `wallet-${i + 1}`,
            label: "Primary wallet",
            address: `0x${String(i + 1).repeat(40)}`,
            network: "Ethereum",
          },
        ],
      });
    }
    const db: Database = {
      users,
      sessions: {},
      carts: {},
      quotes: {},
      orders: [],
      inventory: names.map((name, i) => ({
        id: `nft-${i + 1}`,
        name,
        creator: ["Alex Morgan", "Luna Studio", "Noah Chen"][i % 3],
        category: ["Art", "Photography", "Collectibles"][i % 3],
        price: `${1 + (i % 4)}.${String((i * 17 + 25) % 100).padStart(2, "0")}`,
        stock: i === 7 ? 0 : 8 + i,
        version: 1,
        image: `/artwork/${i % 6}.svg`,
      })),
    };
    persist(db);
    return db;
  })();
  return database;
}
export function authenticate(db: Database, request: Request, required = true) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const session = token && db.sessions[token];
  if (
    token &&
    (!session || session.expiresAt <= Date.now() || scenario() === "expired")
  )
    fail(401, "Sua sessão expirou. Entre novamente para continuar.");
  const user = session && db.users.find((u) => u.id === session.userId);
  if (required && !user) fail(401, "Entre na sua conta para continuar.");
  return user || null;
}
export function ownerOf(db: Database, request: Request) {
  const user = authenticate(db, request, false);
  return user?.id || `guest:${request.headers.get("x-visitor") || "default"}`;
}
export function storedCart(db: Database, owner: string): StoredCart {
  return (db.carts[owner] ??= { items: [], coupon: "", version: 1 });
}
export function availability(nft: Nft, edition: string) {
  return edition === "limited" ? Math.min(3, nft.stock) : nft.stock;
}
export function unitPrice(nft: Nft, edition: string) {
  return edition === "limited" ? eth(wei(nft.price) * 2n) : nft.price;
}
export function viewCart(db: Database, owner: string) {
  const cart = storedCart(db, owner);
  return {
    ...cart,
    items: cart.items.map((item) => {
      const nft = db.inventory.find((n) => n.id === item.nftId)!;
      return {
        ...item,
        nft: structuredClone(nft),
        available: availability(nft, item.edition),
        unitPrice: unitPrice(nft, item.edition),
      };
    }),
  };
}
export function quoteCart(db: Database, owner: string): Quote {
  const cart = storedCart(db, owner);
  if (!cart.items.length) fail(409, "Seu carrinho está vazio.");
  if (cart.coupon && cart.coupon !== "JUNGLE10")
    fail(422, "Cupom inválido ou expirado.");
  const items = cart.items.map((item) => {
    const nft =
      db.inventory.find((n) => n.id === item.nftId) ||
      fail(404, "NFT não encontrado.");
    const reserved = db.orders
      .filter((o) => o.status === "pending")
      .flatMap((o) => o.quote.items)
      .filter((i) => i.nftId === nft.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalInCart = cart.items
      .filter((i) => i.nftId === nft.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (
      item.quantity > availability(nft, item.edition) ||
      totalInCart > nft.stock - reserved
    )
      fail(
        409,
        `A disponibilidade de ${nft.name} mudou. Revise as quantidades.`,
      );
    return {
      ...item,
      name: nft.name,
      unitPrice: unitPrice(nft, item.edition),
      image: nft.image,
    };
  });
  const subtotal = items.reduce(
    (sum, i) => sum + wei(i.unitPrice) * BigInt(i.quantity),
    0n,
  );
  const discount = cart.coupon ? subtotal / 10n : 0n;
  const networkFee = wei("0.0025");
  const quote: Quote = {
    id: crypto.randomUUID(),
    cartVersion: cart.version,
    items,
    coupon: cart.coupon,
    subtotal: eth(subtotal),
    discount: eth(discount),
    networkFee: eth(networkFee),
    total: eth(subtotal - discount + networkFee),
    expiresAt: Date.now() + 120000,
  };
  db.quotes[quote.id] = { ...quote, owner };
  persist(db);
  return quote;
}
export const equivalentQuotes = (a: Quote, b: Quote) =>
  JSON.stringify({
    items: a.items,
    total: a.total,
    coupon: a.coupon,
    version: a.cartVersion,
  }) ===
  JSON.stringify({
    items: b.items,
    total: b.total,
    coupon: b.coupon,
    version: b.cartVersion,
  });
export function settleOrder(db: Database, order: StoredOrder) {
  if (order.status !== "pending" || Date.now() < order.settleAt) return false;
  order.status = order.outcome;
  order.version++;
  if (order.status === "confirmed") {
    order.transaction = `SIM-${order.id}`;
    const cart = storedCart(db, order.userId);
    for (const item of order.quote.items) {
      const nft = db.inventory.find((n) => n.id === item.nftId)!;
      nft.stock -= item.quantity;
      nft.version++;
      const line = cart.items.find(
        (i) => i.nftId === item.nftId && i.edition === item.edition,
      );
      if (line) line.quantity = Math.max(0, line.quantity - item.quantity);
    }
    cart.items = cart.items.filter((i) => i.quantity > 0);
    cart.version++;
  } else
    order.reason =
      "O pagamento foi recusado na simulação. Nenhum item foi cobrado.";
  persist(db);
  return true;
}
export const publicOrder = (order: StoredOrder): Order => {
  const {
    id,
    userId,
    status,
    version,
    quote,
    collector,
    wallet,
    createdAt,
    transaction,
    reason,
  } = order;
  return structuredClone({
    id,
    userId,
    status,
    version,
    quote,
    collector,
    wallet,
    createdAt,
    transaction,
    reason,
  });
};

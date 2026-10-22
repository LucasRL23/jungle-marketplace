import { http, HttpResponse, delay } from "msw";
import type {
  CartItem,
  LoginResult,
  Order,
  Session,
  Wallet,
  Profile,
} from "../domain";
import { wei } from "../lib/money";
import {
  ApiError,
  authenticate,
  availability,
  equivalentQuotes,
  fail,
  getDb,
  ownerOf,
  passwordHash,
  persist,
  publicOrder,
  publicUser,
  quoteCart,
  scenario,
  scheduleOrder,
  settleOrder,
  storedCart,
  viewCart,
} from "./store";

import { mockEvents, publish } from "./events";
const text = (b: Record<string, unknown>, key: string) =>
  typeof b[key] === "string" ? (b[key] as string).trim() : "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const success = (data: unknown, status = 200) =>
  new HttpResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
async function serve(request: Request) {
  const url = new URL(request.url),
    path = url.pathname.replace("/api", ""),
    method = request.method;
  await delay(
    scenario() === "slow" ? 2500 : scenario() === "favorite-error" ? 700 : 100,
  );
  if (scenario() === "offline") return HttpResponse.error();
  if (scenario() === "server-error")
    fail(503, "Serviço indisponível. Tente novamente.");
  const db = await getDb();
  // Reconcile elapsed pending orders even if the browser was closed.
  for (const order of db.orders) {
    if (settleOrder(db, order)) {
      publish("order.updated", publicOrder(order));
      for (const item of order.quote.items)
        publish(
          "nft.updated",
          db.inventory.find((n) => n.id === item.nftId)!,
        );
    }
  }
  const body = ["POST", "PUT", "PATCH"].includes(method)
    ? ((await request.json()) as Record<string, unknown>)
    : {};
  if (path === "/session" && method === "GET") {
    const user = authenticate(db, request, false);
    if (!user) return success(null);
    const session = db.sessions[request.headers.get("authorization")!.slice(7)];
    return success({
      user: publicUser(user),
      expiresAt: session.expiresAt,
    } satisfies Session);
  }
  if ((path === "/login" || path === "/register") && method === "POST") {
    const email = text(body, "email").toLowerCase(),
      password = typeof body.password === "string" ? body.password : "",
      name = text(body, "name");
    if (!emailPattern.test(email) || password.length < 8)
      fail(
        422,
        "Informe um e-mail válido e uma senha de pelo menos 8 caracteres.",
      );
    let user = db.users.find((u) => u.email === email);
    if (path === "/register") {
      if (name.length < 2) fail(422, "Informe seu nome completo.");
      if (user) fail(409, "Já existe uma conta com este e-mail.");
      const salt = crypto.randomUUID(),
        hash = await passwordHash(password, salt);
      if (db.users.some((u) => u.email === email))
        fail(409, "Já existe uma conta com este e-mail.");
      user = {
        id: crypto.randomUUID(),
        name,
        email,
        salt,
        passwordHash: hash,
        wallets: [],
        avatar: "",
        bio: "",
        favorites: [],
      };
      db.users.push(user);
    } else if (
      !user ||
      (await passwordHash(password, user.salt)) !== user.passwordHash
    )
      fail(401, "E-mail ou senha incorretos.");
    if (!user) fail(401, "E-mail ou senha incorretos.");
    const guest = storedCart(
        db,
        `guest:${request.headers.get("x-visitor") || "default"}`,
      ),
      cart = storedCart(db, user.id);
    for (const line of guest.items) {
      const nft = db.inventory.find((n) => n.id === line.nftId)!;
      const existing = cart.items.find(
        (i) => i.nftId === line.nftId && i.edition === line.edition,
      );
      const other = cart.items
        .filter((i) => i.nftId === line.nftId && i.edition !== line.edition)
        .reduce((s, i) => s + i.quantity, 0);
      const quantity = Math.max(
        0,
        Math.min(
          (existing?.quantity || 0) + line.quantity,
          availability(nft, line.edition),
          nft.stock - other,
        ),
      );
      if (existing) existing.quantity = quantity;
      else if (quantity) cart.items.push({ ...line, quantity });
    }
    cart.items = cart.items.filter((i) => i.quantity > 0);
    cart.version++;
    if (!cart.coupon && guest.coupon) cart.coupon = guest.coupon;
    guest.items = [];
    guest.coupon = "";
    guest.version++;
    const token = crypto.randomUUID(),
      expiresAt = Date.now() + 3600000;
    db.sessions[token] = { userId: user.id, expiresAt };
    persist(db);
    return success({
      token,
      user: publicUser(user),
      expiresAt,
    } satisfies LoginResult);
  }
  if (path === "/logout" && method === "POST") {
    const token = request.headers.get("authorization")?.slice(7);
    if (token) delete db.sessions[token];
    persist(db);
    return success({ ok: true });
  }
  if (path === "/favorites" || path.startsWith("/favorites/")) {
    const user = authenticate(db, request)!;
    if (method === "GET" && path === "/favorites")
      return success(user.favorites);
    const id = decodeURIComponent(path.slice("/favorites/".length));
    if (!db.inventory.some((n) => n.id === id))
      fail(404, "NFT não encontrado.");
    if (scenario() === "favorite-error")
      fail(
        503,
        "Não foi possível salvar o favorito. Seu estado anterior foi restaurado.",
      );
    if (method === "PUT")
      user.favorites = [...new Set([...user.favorites, id])];
    else if (method === "DELETE")
      user.favorites = user.favorites.filter((i) => i !== id);
    else fail(405, "Método não permitido.");
    persist(db);
    return success(user.favorites);
  }
  if (path === "/profile" || path === "/profile/avatar") {
    const user = authenticate(db, request)!;
    const view = (): Profile => ({
      ...publicUser(user),
      avatar: user.avatar,
      bio: user.bio,
    });
    if (method === "GET") return success(view());
    if (method === "PATCH" && path === "/profile/avatar") {
      const avatar = text(body, "avatar");
      if (
        avatar.length > 350000 ||
        (avatar &&
          !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(avatar))
      )
        fail(422, "Use uma imagem PNG, JPEG ou WebP de até 256 KB.");
      if (avatar) {
        let raw = "";
        try {
          raw = atob(avatar.split(",")[1]);
        } catch {
          fail(422, "O arquivo de imagem é inválido.");
        }
        const valid =
          raw.startsWith("\x89PNG\r\n\x1a\n") ||
          raw.startsWith("\xff\xd8\xff") ||
          (raw.startsWith("RIFF") && raw.slice(8, 12) === "WEBP");
        if (!valid) fail(422, "O arquivo de imagem é inválido.");
      }
      user.avatar = avatar;
    } else if (method === "PATCH") {
      const name = text(body, "name"),
        email = text(body, "email").toLowerCase(),
        bio = text(body, "bio");
      if (
        name.length < 2 ||
        name.length > 80 ||
        !emailPattern.test(email) ||
        bio.length > 500
      )
        fail(
          422,
          "Confira nome, e-mail e biografia (máximo de 500 caracteres).",
        );
      if (db.users.some((u) => u.id !== user.id && u.email === email))
        fail(409, "Já existe uma conta com este e-mail.");
      user.name = name;
      user.email = email;
      user.bio = bio;
    } else fail(405, "Método não permitido.");
    persist(db);
    return success(view());
  }
  if (path === "/password" && method === "POST") {
    const user = authenticate(db, request)!,
      token = request.headers.get("authorization")!.slice(7);
    const current =
        typeof body.currentPassword === "string" ? body.currentPassword : "",
      next = typeof body.newPassword === "string" ? body.newPassword : "";
    if ((await passwordHash(current, user.salt)) !== user.passwordHash)
      fail(422, "A senha atual está incorreta.");
    if (
      next.length < 8 ||
      !/[a-zA-Z]/.test(next) ||
      !/\d/.test(next) ||
      next === current
    )
      fail(
        422,
        "A nova senha precisa de 8 caracteres, letras e números, e deve ser diferente da atual.",
      );
    const salt = crypto.randomUUID(),
      hash = await passwordHash(next, salt);
    authenticate(db, request); // The session may expire during hashing.
    user.salt = salt;
    user.passwordHash = hash;
    for (const [key, session] of Object.entries(db.sessions))
      if (session.userId === user.id && key !== token) delete db.sessions[key];
    persist(db);
    return success({ ok: true });
  }
  if (path === "/demo/nft" && method === "POST") {
    const nft =
      db.inventory.find((n) => n.id === text(body, "id")) ||
      fail(404, "NFT não encontrado.");
    const delivery = text(body, "delivery");
    if (delivery !== "stale") {
      const price = text(body, "price") || nft.price,
        stock = body.stock === undefined ? nft.stock : Number(body.stock);
      if (
        !/^\d+(\.\d{1,18})?$/.test(price) ||
        wei(price) <= 0n ||
        !Number.isInteger(stock) ||
        stock < 0
      )
        fail(422, "Preço ou estoque inválido.");
      const reserved = db.orders
        .filter((o) => o.status === "pending")
        .flatMap((o) => o.quote.items)
        .filter((i) => i.nftId === nft.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      if (stock < reserved)
        fail(409, "Este estoque já está reservado por um pedido pendente.");
      nft.price = price;
      nft.stock = stock;
      nft.version++;
      for (const cart of Object.values(db.carts))
        if (cart.items.some((i) => i.nftId === nft.id)) cart.version++;
      persist(db);
    }
    publish("nft.updated", nft, delivery);
    return success(nft);
  }
  if (path === "/demo/disconnect" && method === "POST") {
    mockEvents.dispatchEvent(new CustomEvent("demo.disconnect"));
    return success({ ok: true });
  }
  if (path === "/demo/advance-orders" && method === "POST") {
    for (const order of db.orders)
      if (order.status === "pending") {
        order.settleAt = Date.now();
        if (settleOrder(db, order)) {
          publish("order.updated", publicOrder(order));
          for (const item of order.quote.items)
            publish(
              "nft.updated",
              db.inventory.find((n) => n.id === item.nftId)!,
            );
        }
      }
    return success({ ok: true });
  }
  if (path === "/demo/order" && method === "POST") {
    const user = authenticate(db, request)!;
    const order =
      db.orders.find(
        (o) => o.id === text(body, "id") && o.userId === user.id,
      ) || fail(404, "Pedido não encontrado.");
    if (body.delivery === "settle" && order.status === "pending") {
      order.settleAt = Date.now();
      settleOrder(db, order);
      for (const item of order.quote.items)
        publish(
          "nft.updated",
          db.inventory.find((n) => n.id === item.nftId)!,
        );
    }
    publish("order.updated", publicOrder(order), text(body, "delivery"));
    return success(publicOrder(order));
  }
  if (path === "/nfts" && method === "GET") {
    if (scenario() === "error") fail(503, "O catálogo está indisponível.");
    const p = url.searchParams,
      q = (p.get("q") || "").toLowerCase();
    let items =
      scenario() === "empty"
        ? []
        : db.inventory.filter(
            (n) =>
              (!q || `${n.name} ${n.creator}`.toLowerCase().includes(q)) &&
              (!p.get("category") || n.category === p.get("category")),
          );
    const sort = p.get("sort");
    if (sort === "price-asc" || sort === "price-desc")
      items = [...items].sort(
        (a, b) =>
          (wei(a.price) < wei(b.price)
            ? -1
            : wei(a.price) > wei(b.price)
              ? 1
              : 0) * (sort === "price-desc" ? -1 : 1),
      );
    const page = Math.max(1, Number(p.get("page")) || 1);
    return success({
      items: items.slice((page - 1) * 8, page * 8),
      total: items.length,
      pages: Math.ceil(items.length / 8),
    });
  }
  if (path.startsWith("/nfts/") && method === "GET")
    return success(
      db.inventory.find((n) => n.id === decodeURIComponent(path.slice(6))) ||
        fail(404, "NFT não encontrado."),
    );
  if (path === "/cart") {
    const owner = ownerOf(db, request),
      cart = storedCart(db, owner);
    if (method === "GET") return success(viewCart(db, owner));
    if (method === "PATCH") {
      if ("coupon" in body) {
        const code = text(body, "coupon").toUpperCase();
        if (code && code !== "JUNGLE10")
          fail(
            422,
            code === "EXPIRED" ? "Este cupom expirou." : "Cupom inválido.",
          );
        cart.coupon = code;
      } else {
        const nftId = text(body, "nftId"),
          edition = text(body, "edition"),
          quantity = Number(body.quantity);
        const nft =
          db.inventory.find((n) => n.id === nftId) ||
          fail(404, "NFT não encontrado.");
        if (
          !["standard", "limited"].includes(edition) ||
          !Number.isInteger(quantity) ||
          quantity < 0
        )
          fail(422, "Edição ou quantidade inválida.");
        const other = cart.items
          .filter((i) => i.nftId === nftId && i.edition !== edition)
          .reduce((s, i) => s + i.quantity, 0);
        if (
          quantity > availability(nft, edition) ||
          quantity + other > nft.stock
        )
          fail(409, "Quantidade indisponível para esta edição.");
        const existing = cart.items.find(
          (i) => i.nftId === nftId && i.edition === edition,
        );
        if (existing) existing.quantity = quantity;
        else if (quantity)
          cart.items.push({
            nftId,
            edition: edition as CartItem["edition"],
            quantity,
          });
        cart.items = cart.items.filter((i) => i.quantity > 0);
      }
      cart.version++;
      persist(db);
      return success(viewCart(db, owner));
    }
  }
  if (path === "/quote" && method === "POST")
    return success(quoteCart(db, ownerOf(db, request)));
  if (path === "/wallets") {
    const user = authenticate(db, request)!;
    if (method === "GET") return success(user.wallets);
    if (method === "POST" || method === "PUT") {
      const id = text(body, "id"),
        label = text(body, "label"),
        address = text(body, "address"),
        network = text(body, "network");
      if (
        label.length < 2 ||
        !/^0x[a-fA-F0-9]{40}$/.test(address) ||
        !["Ethereum", "Polygon"].includes(network)
      )
        fail(422, "Informe um nome, endereço 0x válido e rede suportada.");
      const existing = user.wallets.find((w) => w.id === id);
      if (id && !existing) fail(404, "Carteira não encontrada.");
      if (!existing && user.wallets.length >= 2)
        fail(409, "Você pode cadastrar até duas carteiras.");
      const wallet: Wallet = {
        id: existing?.id || crypto.randomUUID(),
        label,
        address,
        network: network as Wallet["network"],
      };
      if (existing) Object.assign(existing, wallet);
      else user.wallets.push(wallet);
      persist(db);
      return success(wallet, existing ? 200 : 201);
    }
  }
  if (path === "/orders" && method === "POST") {
    const user = authenticate(db, request)!,
      key =
        request.headers.get("idempotency-key") ||
        fail(422, "Chave de idempotência obrigatória.");
    if (key.length > 100) fail(422, "Chave inválida.");
    const payload = JSON.stringify(
        Object.fromEntries(
          Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
        ),
      ),
      existing = db.orders.find((o) => o.userId === user.id && o.key === key);
    if (existing) {
      if (existing.payload !== payload)
        fail(409, "A chave já foi utilizada com outro conteúdo.");
      return success(publicOrder(existing));
    }
    const quoteId = text(body, "quoteId"),
      stored = db.quotes[quoteId];
    if (!stored || stored.owner !== user.id)
      fail(409, "Solicite uma nova cotação.");
    if (stored.expiresAt < Date.now())
      fail(409, "A cotação expirou. Revise os valores novamente.");
    const current = quoteCart(db, user.id);
    if (!equivalentQuotes(stored, current))
      fail(409, "Os valores ou itens mudaram. Revise a nova cotação.");
    const wallet =
      user.wallets.find((w) => w.id === text(body, "walletId")) ||
      fail(422, "Selecione uma carteira cadastrada.");
    if (body.network !== wallet.network || body.connected !== true)
      fail(422, "Conecte a carteira na rede selecionada.");
    const name = text(body, "name"),
      email = text(body, "email");
    if (name.length < 2 || !emailPattern.test(email))
      fail(422, "Confira os dados do colecionador.");
    const order = {
      id: crypto.randomUUID(),
      userId: user.id,
      status: "pending" as const,
      version: 1,
      quote: structuredClone(stored),
      collector: { name, email },
      wallet: structuredClone(wallet),
      createdAt: Date.now(),
      transaction: "",
      key,
      payload,
      settleAt: Date.now() + (scenario() === "pending" ? 30000 : 1800),
      outcome:
        scenario() === "declined"
          ? ("declined" as const)
          : ("confirmed" as const),
    };
    db.orders.push(order);
    persist(db);
    scheduleOrder(db, order);
    if (scenario() === "timeout") {
      await delay(11000);
      return HttpResponse.error();
    }
    return success(publicOrder(order), 202);
  }
  if (path.startsWith("/orders/") && method === "GET") {
    const user = authenticate(db, request)!,
      order =
        db.orders.find((o) => o.id === path.slice(8)) ||
        fail(404, "Pedido não encontrado.");
    if (order.userId !== user.id)
      fail(403, "Você não tem acesso a este pedido.");
    return success(publicOrder(order));
  }
  if (path === "/orders" && method === "GET") {
    const user = authenticate(db, request)!;
    return success(
      db.orders
        .filter((o) => o.userId === user.id)
        .map(publicOrder)
        .reverse() satisfies Order[],
    );
  }
  fail(404, "Endpoint não encontrado.");
}
export const handlers = [
  http.all("/api/*", async ({ request }) => {
    try {
      return await serve(request);
    } catch (error) {
      if (error instanceof ApiError)
        return success({ message: error.message }, error.status);
      if (error instanceof SyntaxError)
        return success({ message: "Corpo JSON inválido." }, 400);
      console.error("[mock API]", error);
      return success({ message: "Falha inesperada na simulação." }, 500);
    }
  }),
];

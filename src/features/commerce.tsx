import { useEffect, useState, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CartItem, LoginResult, Nft, Order, Quote } from "../domain";
import { api, clearPrivateData, errorMessage, queryClient } from "../lib/api";
import { Button } from "../components/ui/button";
import { useCart, useSession, useWallets } from "./hooks";

function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p className="form-error" role="alert">
      {errorMessage(error)}
    </p>
  ) : null;
}
function Loading({ label = "Carregando" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="skeleton summary-skeleton"
    />
  );
}
function Field({
  name,
  label,
  type = "text",
  defaultValue,
  minLength,
  children,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  minLength?: number;
  children?: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          required
          minLength={minLength}
        />
      )}
    </label>
  );
}
const safeReturn = (value: string | null) =>
  value?.startsWith("/") &&
  !value.startsWith("//") &&
  !value.startsWith("/login") &&
  !value.startsWith("/register")
    ? value
    : "/";

export function SessionGuard() {
  const { data: session } = useSession();
  const path = useRouterState({ select: (s) => s.location.href });
  useEffect(() => {
    const expired = () => {
      if (
        ["/checkout", "/account", "/wallets", "/orders"].some((p) =>
          path.startsWith(p),
        )
      )
        window.location.assign(`/login?returnTo=${encodeURIComponent(path)}`);
    };
    const timer = session
      ? window.setTimeout(
          () => {
            localStorage.removeItem("jungle-token");
            void clearPrivateData();
            queryClient.setQueryData(["session"], null);
            expired();
          },
          Math.max(0, session.expiresAt - Date.now()),
        )
      : undefined;
    window.addEventListener("jungle-session-expired", expired);
    const storage = (e: StorageEvent) => {
      if (e.key === "jungle-token") {
        void clearPrivateData();
        void queryClient.invalidateQueries({ queryKey: ["session"] });
        expired();
      }
    };
    window.addEventListener("storage", storage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("jungle-session-expired", expired);
      window.removeEventListener("storage", storage);
    };
  }, [session, path]);
  return null;
}
export function AccountNavigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const logout = useMutation({
    mutationFn: (token: string | null) =>
      api.post(
        "/logout",
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      ),
  });
  return (
    <div className="account-nav">
      <Link to="/cart">Carrinho</Link>
      {session ? (
        <>
          <Link to="/account">{session.user.name.split(" ")[0]}</Link>
          <button
            onClick={() => {
              const token = localStorage.getItem("jungle-token");
              localStorage.removeItem("jungle-token");
              void queryClient.cancelQueries({ queryKey: ["session"] });
              void clearPrivateData();
              queryClient.setQueryData(["session"], null);
              logout.mutate(token);
              void router.navigate({
                to: "/",
                search: { q: "", category: "", sort: "recent", page: 1 },
              });
            }}
            disabled={logout.isPending}
          >
            Sair
          </button>
        </>
      ) : (
        <Link to="/login" search={{ returnTo: "/" }}>
          Entrar
        </Link>
      )}
    </div>
  );
}
export function LoginPage() {
  const path = useRouterState({ select: (s) => s.location.pathname }),
    register = path === "/register";
  const { data: session } = useSession();
  const mutation = useMutation({
    mutationFn: async (body: Record<string, FormDataEntryValue>) =>
      (await api.post<LoginResult>(register ? "/register" : "/login", body))
        .data,
    onSuccess: async (result) => {
      await queryClient.cancelQueries();
      queryClient.clear();
      localStorage.setItem("jungle-token", result.token);
      queryClient.setQueryData(["session"], {
        user: result.user,
        expiresAt: result.expiresAt,
      });
      window.location.assign(
        safeReturn(new URLSearchParams(location.search).get("returnTo")),
      );
    },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(Object.fromEntries(new FormData(e.currentTarget)));
  };
  return (
    <section className="auth-page">
      <p className="eyebrow">YOUR COLLECTION STARTS HERE</p>
      <h1>{register ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
      {session ? (
        <>
          <p>Você está conectado como {session.user.name}.</p>
          <Link to="/account">Ir para minha conta</Link>
        </>
      ) : (
        <form onSubmit={submit} className="form">
          {register && (
            <Field name="name" label="Nome completo" minLength={2} />
          )}
          <Field name="email" label="E-mail" type="email" />
          <Field name="password" label="Senha" type="password" minLength={8} />
          <ErrorNotice error={mutation.error} />
          <Button disabled={mutation.isPending}>
            {mutation.isPending
              ? "Aguarde…"
              : register
                ? "Criar conta"
                : "Entrar"}
          </Button>
        </form>
      )}
      <p>
        {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
        <Link
          to={register ? "/login" : "/register"}
          search={{
            returnTo: safeReturn(
              new URLSearchParams(location.search).get("returnTo"),
            ),
          }}
        >
          {register ? "Entrar" : "Cadastre-se"}
        </Link>
      </p>
      <aside className="notice">
        Conta de demonstração: alex@example.test · senha Jungle123!
      </aside>
    </section>
  );
}
export function PurchaseControls({ nft }: { nft: Nft }) {
  const [edition, setEdition] = useState<CartItem["edition"]>("standard"),
    [quantity, setQuantity] = useState(1),
    [notice, setNotice] = useState("");
  const cart = useCart();
  const mutation = useMutation({
    mutationFn: async () => {
      const old =
        cart.data?.items.find(
          (i) => i.nftId === nft.id && i.edition === edition,
        )?.quantity || 0;
      return (
        await api.patch("/cart", {
          nftId: nft.id,
          edition,
          quantity: old + quantity,
        })
      ).data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cart.queryKey, data);
      setNotice("NFT adicionado ao carrinho.");
    },
  });
  const maximum = edition === "limited" ? Math.min(3, nft.stock) : nft.stock;
  return (
    <div className="purchase-controls">
      <label className="field">
        Edição
        <select
          value={edition}
          onChange={(e) => {
            setEdition(e.target.value as CartItem["edition"]);
            setQuantity(1);
          }}
        >
          <option value="standard">Standard · {nft.price} ETH</option>
          <option value="limited">Limited · preço em dobro</option>
        </select>
      </label>
      <label className="field">
        Quantidade
        <input
          type="number"
          min={1}
          max={maximum}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>
      <Button
        disabled={
          mutation.isPending ||
          cart.isPending ||
          maximum === 0 ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > maximum
        }
        onClick={() => mutation.mutate()}
      >
        {maximum === 0
          ? "Esgotado"
          : mutation.isPending
            ? "Adicionando…"
            : "Adicionar ao carrinho"}
      </Button>
      <ErrorNotice error={mutation.error || cart.error} />
      <p role="status">{notice}</p>
      {notice && <Link to="/cart">Ver carrinho →</Link>}
    </div>
  );
}
function Totals({ quote }: { quote: Quote }) {
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{quote.subtotal} ETH</dd>
      </div>
      <div>
        <dt>Desconto</dt>
        <dd>−{quote.discount} ETH</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>{quote.networkFee} ETH</dd>
      </div>
      <div className="total">
        <dt>Total</dt>
        <dd>{quote.total} ETH</dd>
      </div>
    </dl>
  );
}
export function CartPage() {
  const cart = useCart(),
    [coupon, setCoupon] = useState("");
  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.patch("/cart", body)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(cart.queryKey, data);
      void queryClient.invalidateQueries({ queryKey: ["quote"] });
    },
  });
  const quote = useQuery({
    queryKey:
      cart.owner === "guest"
        ? ["guest-quote", cart.data?.version]
        : ["private", cart.owner, "quote", cart.data?.version],
    enabled: !!cart.data?.items.length,
    queryFn: async () => (await api.post<Quote>("/quote", {})).data,
    retry: false,
  });
  if (cart.isPending)
    return (
      <section>
        <h1>Seu carrinho</h1>
        <Loading />
      </section>
    );
  if (cart.isError)
    return (
      <section>
        <ErrorNotice error={cart.error} />
        <Button onClick={() => void cart.refetch()}>Tentar novamente</Button>
      </section>
    );
  return (
    <section>
      <p className="eyebrow">YOUR NEXT COLLECTIBLE</p>
      <h1>Seu carrinho</h1>
      {!cart.data?.items.length ? (
        <div className="empty">
          <h2>Seu carrinho está vazio.</h2>
          <a href="/">Explorar NFTs →</a>
        </div>
      ) : (
        <div className="commerce-grid">
          <div>
            {cart.data.items.map((item) => (
              <article
                className="cart-line"
                key={`${item.nftId}-${item.edition}`}
              >
                <img src={item.nft.image} alt={item.nft.name} />
                <div>
                  <Link to="/nft/$id" params={{ id: item.nftId }}>
                    <h3>{item.nft.name}</h3>
                  </Link>
                  <p>
                    {item.edition} · {item.unitPrice} ETH / unidade
                  </p>
                  <label>
                    Quantidade de {item.nft.name}
                    <input
                      aria-label={`Quantidade de ${item.nft.name}`}
                      type="number"
                      value={item.quantity}
                      min={1}
                      max={item.available}
                      disabled={mutation.isPending}
                      onChange={(e) => {
                        const quantity = Number(e.target.value);
                        if (Number.isInteger(quantity) && quantity > 0)
                          mutation.mutate({
                            nftId: item.nftId,
                            edition: item.edition,
                            quantity,
                          });
                      }}
                    />
                  </label>
                  {item.quantity > item.available && (
                    <p role="alert">
                      Disponibilidade alterada: restam {item.available}. Ajuste
                      ou remova este item.
                    </p>
                  )}
                  <button
                    className="text-button"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        nftId: item.nftId,
                        edition: item.edition,
                        quantity: 0,
                      })
                    }
                  >
                    Remover {item.nft.name}
                  </button>
                </div>
              </article>
            ))}
            <form
              className="coupon-form"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({ coupon });
              }}
            >
              <label className="field">
                Cupom
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="JUNGLE10"
                />
              </label>
              <Button variant="outline" disabled={mutation.isPending}>
                Aplicar cupom
              </Button>
            </form>
            {cart.data.coupon && (
              <p>
                Cupom {cart.data.coupon} aplicado.{" "}
                <button
                  className="text-button"
                  onClick={() => mutation.mutate({ coupon: "" })}
                >
                  Remover cupom
                </button>
              </p>
            )}
            <ErrorNotice error={mutation.error} />
          </div>
          <aside className="summary">
            <h2>Resumo</h2>
            {quote.isPending ? (
              <Loading label="Carregando resumo" />
            ) : quote.data ? (
              <Totals quote={quote.data} />
            ) : (
              <ErrorNotice error={quote.error} />
            )}
            {quote.data ? (
              <Button asChild>
                <Link to="/checkout">Ir para pagamento</Link>
              </Button>
            ) : (
              <Button disabled>Ir para pagamento</Button>
            )}
            <p className="muted">A cotação será revalidada antes da compra.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
interface Attempt {
  key: string;
  body: {
    quoteId: string;
    walletId: string;
    network: string;
    connected: boolean;
    name: string;
    email: string;
  };
}
export function CheckoutPage() {
  const { data: session } = useSession(),
    cart = useCart(),
    wallets = useWallets();
  const [walletId, setWalletId] = useState(""),
    [connected, setConnected] = useState(false),
    [connectionError, setConnectionError] = useState(""),
    [review, setReview] = useState<Quote | null>(null),
    [collector, setCollector] = useState({ name: "", email: "" });
  const busy = useRef(false);
  const attemptKey = `jungle-attempt:${session?.user.id}`;
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(attemptKey) || "null");
    } catch {
      return null;
    }
  });
  const [changed, setChanged] = useState(false);
  const quote = useMutation({
    mutationFn: async () => (await api.post<Quote>("/quote", {})).data,
    onSuccess: (data) => {
      setReview(data);
      setChanged(false);
    },
  });
  const order = useMutation({
    mutationFn: async (value: Attempt) =>
      (
        await api.post<Order>("/orders", value.body, {
          headers: { "Idempotency-Key": value.key },
        })
      ).data,
    onSuccess: (result) => {
      sessionStorage.removeItem(attemptKey);
      setAttempt(null);
      window.location.assign(`/orders/${result.id}`);
    },
    onError: (error) => {
      // A definitive 4xx means this attempt was rejected before creating an order.
      if (error && typeof error === "object" && "response" in error) {
        const status = (error as { response?: { status: number } }).response
          ?.status;
        if (status && status < 500) {
          sessionStorage.removeItem(attemptKey);
          setAttempt(null);
          setReview(null);
          setChanged(true);
        }
      }
    },
  });
  const selected = wallets.data?.find((w) => w.id === walletId);
  const reviewOrder = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCollector({
      name: String(form.get("name")),
      email: String(form.get("email")),
    });
    quote.mutate();
  };
  const submit = async () => {
    if (busy.current || order.isPending || !review || !selected || !connected)
      return;
    busy.current = true;
    try {
      const fresh = await quote.mutateAsync().catch(() => null);
      if (!fresh) return;
      if (
        JSON.stringify([fresh.items, fresh.total, fresh.cartVersion]) !==
        JSON.stringify([review.items, review.total, review.cartVersion])
      ) {
        setReview(fresh);
        setChanged(true);
        return;
      }
      const value: Attempt = {
        key: crypto.randomUUID(),
        body: {
          quoteId: fresh.id,
          walletId: selected.id,
          network: selected.network,
          connected,
          ...collector,
        },
      };
      sessionStorage.setItem(attemptKey, JSON.stringify(value));
      setAttempt(value);
      await order.mutateAsync(value).catch(() => undefined);
    } finally {
      busy.current = false;
    }
  };
  if (cart.isPending || wallets.isPending)
    return (
      <section>
        <h1>Pagamento</h1>
        <Loading />
      </section>
    );
  return (
    <section>
      <p className="eyebrow">ALMOST YOURS</p>
      <h1>Pagamento</h1>
      {attempt ? (
        <div className="summary">
          <h2>Recuperar tentativa de compra</h2>
          <p>
            Uma tentativa está em andamento. Consulte o mesmo pedido para evitar
            outra compra.
          </p>
          <Button
            disabled={order.isPending}
            onClick={() => order.mutate(attempt)}
          >
            {order.isPending ? "Consultando…" : "Recuperar meu pedido"}
          </Button>
          <ErrorNotice error={order.error} />
        </div>
      ) : !cart.data?.items.length ? (
        <p>
          Seu carrinho está vazio. <a href="/">Voltar ao catálogo</a>
        </p>
      ) : (
        <div className="commerce-grid">
          <form className="form" onSubmit={reviewOrder}>
            <h2>Dados do colecionador</h2>
            <Field
              name="name"
              label="Nome completo"
              defaultValue={session?.user.name}
              minLength={2}
            />
            <Field
              name="email"
              label="E-mail"
              type="email"
              defaultValue={session?.user.email}
            />
            <h2>Carteira e rede</h2>
            {wallets.data?.length ? (
              <>
                <label className="field">
                  Carteira
                  <select
                    required
                    value={walletId}
                    onChange={(e) => {
                      setWalletId(e.target.value);
                      setConnected(false);
                      setReview(null);
                    }}
                  >
                    <option value="">Selecione sua carteira</option>
                    {wallets.data.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label} · {w.network}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <>
                    <label className="field">
                      Rede
                      <select
                        value={selected.network}
                        onChange={() => {
                          setConnected(false);
                          setReview(null);
                        }}
                      >
                        <option>{selected.network}</option>
                      </select>
                    </label>
                    <p className="wallet-address">{selected.address}</p>
                    <div className="wallet-actions">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setConnected(!connected);
                          setConnectionError("");
                          setReview(null);
                        }}
                      >
                        {connected
                          ? "Desconectar"
                          : "Conectar carteira simulada"}
                      </Button>
                      {!connected && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setConnectionError(
                              "Conexão recusada pelo usuário. Tente novamente.",
                            );
                            setConnected(false);
                          }}
                        >
                          Simular recusa de conexão
                        </button>
                      )}
                    </div>
                    <p role="status">
                      {connected
                        ? "Carteira conectada na simulação."
                        : connectionError}
                    </p>
                  </>
                )}
              </>
            ) : (
              <p>
                Cadastre uma carteira antes de continuar.{" "}
                <Link to="/wallets">Gerenciar carteiras →</Link>
              </p>
            )}
            <ErrorNotice error={wallets.error} />
            <ErrorNotice error={quote.error} />
            <Button disabled={!connected || quote.isPending || order.isPending}>
              {quote.isPending ? "Validando…" : "Revisar pedido"}
            </Button>
          </form>
          <aside className="summary">
            <h2>Revisão do pedido</h2>
            {(changed ||
              !!(
                review &&
                cart.data &&
                review.cartVersion !== cart.data.version
              )) && (
              <p role="alert">
                Os valores ou itens mudaram. Confira a cotação e confirme
                novamente.
              </p>
            )}
            {review ? (
              <>
                <ul className="order-items">
                  {review.items.map((i) => (
                    <li key={`${i.nftId}-${i.edition}`}>
                      {i.quantity} × {i.name} · {i.edition}
                    </li>
                  ))}
                </ul>
                <Totals quote={review} />
                <p>
                  {collector.name} · {collector.email}
                </p>
                <Button
                  disabled={order.isPending || quote.isPending || !connected}
                  onClick={() => void submit()}
                >
                  {order.isPending ? "Enviando…" : "Confirmar compra simulada"}
                </Button>
              </>
            ) : (
              <p>Revise os dados para consultar o valor final.</p>
            )}
            <ErrorNotice error={order.error} />
          </aside>
        </div>
      )}
    </section>
  );
}
export function OrderPage() {
  const id = useRouterState({
      select: (s) => s.location.pathname.split("/").pop()!,
    }),
    { data: session } = useSession();
  const query = useQuery({
    queryKey: ["private", session?.user.id, "order", id],
    enabled: !!session,
    queryFn: async ({ signal }) =>
      (await api.get<Order>(`/orders/${id}`, { signal })).data,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 1500 : false),
    retry: false,
  });
  useEffect(() => {
    if (query.data?.status === "confirmed") {
      void queryClient.invalidateQueries({
        queryKey: ["private", session?.user.id, "cart"],
      });
      void queryClient.invalidateQueries({ queryKey: ["nfts"] });
      void queryClient.invalidateQueries({ queryKey: ["nft"] });
      void queryClient.invalidateQueries({
        queryKey: ["private", session?.user.id, "orders"],
      });
    }
  }, [query.data?.status, session?.user.id]);
  if (query.isPending)
    return (
      <section>
        <Loading label="Consultando pedido" />
      </section>
    );
  if (query.isError)
    return (
      <section>
        <ErrorNotice error={query.error} />
        <Button onClick={() => void query.refetch()}>
          Consultar novamente
        </Button>
      </section>
    );
  const order = query.data;
  return (
    <section className="receipt">
      <p className="eyebrow">YOUR COLLECTION</p>
      <h1>
        {order.status === "confirmed"
          ? "Compra confirmada"
          : order.status === "declined"
            ? "Pagamento recusado"
            : "Pedido em processamento"}
      </h1>
      <p role="status">
        {order.status === "pending"
          ? "Estamos aguardando o resultado da simulação. Você pode atualizar esta página com segurança."
          : order.status === "declined"
            ? order.reason
            : "Seu pedido foi confirmado pela API simulada."}
      </p>
      <div className="summary">
        <p className="wallet-address">Pedido {order.id}</p>
        {order.status === "confirmed" && (
          <p className="wallet-address">
            Transação simulada: {order.transaction}
          </p>
        )}
        <ul className="order-items">
          {order.quote.items.map((i) => (
            <li key={`${i.nftId}-${i.edition}`}>
              <img src={i.image} alt="" />
              {i.quantity} × {i.name} · {i.edition} · {i.unitPrice} ETH
            </li>
          ))}
        </ul>
        <Totals quote={order.quote} />
        <p>
          {order.collector.name} · {order.collector.email}
        </p>
        <p>
          {order.wallet.label} · {order.wallet.network}
        </p>
      </div>
      {order.status === "declined" && (
        <Button asChild>
          <Link to="/cart">Voltar ao carrinho</Link>
        </Button>
      )}
      <p>
        <Link to="/account">Meus pedidos →</Link>
      </p>
    </section>
  );
}
export function AccountPage() {
  const { data: session } = useSession();
  const orders = useQuery({
    queryKey: ["private", session?.user.id, "orders"],
    enabled: !!session,
    queryFn: async ({ signal }) =>
      (await api.get<Order[]>("/orders", { signal })).data,
  });
  return (
    <section>
      <p className="eyebrow">YOUR SPACE</p>
      <h1>Olá, {session?.user.name}</h1>
      <p>{session?.user.email}</p>
      <Link to="/wallets">Gerenciar carteiras →</Link>
      <h2 className="mt-8">Meus pedidos</h2>
      {orders.isPending ? (
        <Loading />
      ) : orders.isError ? (
        <ErrorNotice error={orders.error} />
      ) : orders.data?.length ? (
        orders.data.map((o) => (
          <article className="account-order" key={o.id}>
            <Link to="/orders/$id" params={{ id: o.id }}>
              {o.status === "confirmed"
                ? "Confirmado"
                : o.status === "declined"
                  ? "Recusado"
                  : "Pendente"}{" "}
              · {o.quote.total} ETH{" "}
              <span className="wallet-address">{o.id}</span>
            </Link>
          </article>
        ))
      ) : (
        <p>Você ainda não tem pedidos.</p>
      )}
    </section>
  );
}
export function WalletsPage() {
  const wallets = useWallets(),
    { data: session } = useSession(),
    [editing, setEditing] = useState(""),
    [saved, setSaved] = useState(false);
  const wallet = wallets.data?.find((w) => w.id === editing);
  const mutation = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue>) =>
      api.request({
        method: editing ? "PUT" : "POST",
        url: "/wallets",
        data: { ...body, id: editing },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["private", session?.user.id, "wallets"],
      });
      setEditing("");
      setSaved(true);
    },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    mutation.mutate(Object.fromEntries(new FormData(e.currentTarget)));
  };
  return (
    <section>
      <Link to="/account">← Minha conta</Link>
      <h1>Minhas carteiras</h1>
      <div className="commerce-grid">
        <div>
          {wallets.isPending ? (
            <Loading />
          ) : (
            wallets.data?.map((w, i) => (
              <article className="summary" key={w.id}>
                <p className="eyebrow">
                  {i === 0 ? "PRINCIPAL" : "SECUNDÁRIA"}
                </p>
                <h2>{w.label}</h2>
                <p className="wallet-address">{w.address}</p>
                <p>{w.network}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(w.id);
                    setSaved(false);
                  }}
                >
                  Editar {w.label}
                </Button>
              </article>
            ))
          )}
          <ErrorNotice error={wallets.error} />
        </div>
        <form key={editing} className="form summary" onSubmit={submit}>
          <h2>{editing ? "Editar carteira" : "Nova carteira"}</h2>
          <Field
            name="label"
            label="Nome da carteira"
            defaultValue={wallet?.label}
            minLength={2}
          />
          <Field
            name="address"
            label="Endereço da carteira"
            defaultValue={wallet?.address}
          />
          <Field name="network" label="Rede">
            <select name="network" defaultValue={wallet?.network || "Ethereum"}>
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </Field>
          <ErrorNotice error={mutation.error} />
          <Button
            disabled={
              mutation.isPending ||
              (!editing && (wallets.data?.length || 0) >= 2)
            }
          >
            Salvar carteira
          </Button>
          {editing && (
            <button type="button" onClick={() => setEditing("")}>
              Cancelar edição
            </button>
          )}
          <p role="status">{saved ? "Carteira salva com sucesso." : ""}</p>
        </form>
      </div>
    </section>
  );
}

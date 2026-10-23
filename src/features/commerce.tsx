import { ErrorNotice, Loading, Field } from "../components/commerce-fields";
import { LogoutButton } from "./session";
import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { LoginResult, Order, Quote } from "../domain";
import { api, clearPrivateData, queryClient } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  useCart,
  useSession,
  useWallets,
  useCartQuote,
  useProfile,
} from "./hooks";
import { eth, wei } from "../lib/money";
import { Artwork } from "../components/artwork";
import { Breadcrumb } from "../components/breadcrumb";
import { RelatedNfts } from "./related-nfts";

import { ProfileEditor, FavoritesPanel } from "./collector";
import { AccountShell } from "./account-shell";
import {
  X,
  Plus,
  Minus,
  Trash2,
  BadgeCheck,
  Clock3,
  CircleX,
} from "lucide-react";
import { MarketplaceCatalog } from "./catalog";
import { PasswordField } from "../components/ui/password-field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../components/ui/dialog";

const safeReturn = (value: string | null) =>
  value?.startsWith("/") &&
  !value.startsWith("//") &&
  !value.startsWith("/login") &&
  !value.startsWith("/register")
    ? value
    : "/";

const authCatalog = {
  q: "",
  category: "",
  sort: "recent" as const,
  page: 1,
  minPrice: "",
  maxPrice: "",
};
export function LoginPage() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return <LoginDialog key={path} register={path === "/register"} />;
}
function LoginDialog({ register }: { register: boolean }) {
  const returnTo = safeReturn(
    new URLSearchParams(location.search).get("returnTo"),
  );
  const router = useRouter(),
    dialogRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [validation, setValidation] = useState("");
  const mutation = useMutation({
    mutationFn: async (body: Record<string, FormDataEntryValue>) =>
      (await api.post<LoginResult>(register ? "/register" : "/login", body))
        .data,
    onSuccess: async (result) => {
      await queryClient.cancelQueries();
      // Keep the session Query instance so mounted guards and sockets observe
      // the new identity during SPA navigation. Drop only owner-scoped caches.
      await clearPrivateData();
      queryClient.removeQueries({
        predicate: (query) =>
          ["guest-cart", "guest-quote"].includes(String(query.queryKey[0])),
      });
      localStorage.setItem("jungle-token", result.token);
      queryClient.setQueryData(["session"], {
        user: result.user,
        expiresAt: result.expiresAt,
      });
      await router.navigate({ href: returnTo });
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidation("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (register && data.password !== data.confirmPassword) {
      setValidation("A confirmação da senha não corresponde.");
      return;
    }
    mutation.mutate(data);
  };
  const authErrorId = validation
    ? "auth-validation"
    : mutation.error
      ? "auth-error"
      : undefined;
  return (
    <>
      <MarketplaceCatalog
        search={authCatalog}
        onChange={(patch) =>
          router.navigate({
            to: "/",
            search: { ...authCatalog, ...patch, page: 1 },
          })
        }
      />
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) void router.navigate({ to: "/", search: authCatalog });
        }}
      >
        <DialogContent
          className="auth-dialog"
          ref={dialogRef}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (["/login", "/register"].includes(location.pathname)) return;
            document
              .querySelector<HTMLAnchorElement>(
                '.account-nav a[href^="/login"]',
              )
              ?.focus();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            dialogRef.current
              ?.querySelector<HTMLInputElement>("input")
              ?.focus();
          }}
        >
          <div className="auth-brand" aria-hidden="true">
            KURIO
          </div>
          <DialogTitle className="sr-only">
            {register ? "Crie sua conta" : "Bem-vindo de volta"}
          </DialogTitle>
          <nav className="auth-tabs" aria-label="Acesso à conta">
            <Link
              to="/login"
              search={{ returnTo }}
              aria-current={!register ? "page" : undefined}
            >
              Entrar
            </Link>
            <Link
              to="/register"
              search={{ returnTo }}
              aria-current={register ? "page" : undefined}
            >
              Criar conta
            </Link>
          </nav>
          <DialogDescription>
            {register
              ? "Crie seu perfil de colecionador e comece sua coleção."
              : "Entre para gerenciar suas carteiras, coleção e perfil de colecionador."}
          </DialogDescription>
          {session ? (
            <div className="auth-signed-in">
              <p>Você está conectado como {session.user.name}.</p>
              <Button asChild>
                <Link to="/account">Ir para minha conta</Link>
              </Button>
            </div>
          ) : (
            <form
              key={register ? "register" : "login"}
              onSubmit={submit}
              className="form auth-form"
              aria-describedby={authErrorId}
            >
              {register && (
                <>
                  <Field
                    name="name"
                    label="Nome completo"
                    minLength={2}
                    errorId={authErrorId}
                  />
                  <Field
                    name="username"
                    label="Nome de usuário"
                    minLength={3}
                    errorId={authErrorId}
                  />
                </>
              )}
              <Field name="email" label="E-mail" type="email">
                <input
                  name="email"
                  type="email"
                  placeholder="Digite seu e-mail"
                  aria-describedby={authErrorId}
                  autoComplete="email"
                  required
                />
              </Field>
              <PasswordField
                name="password"
                label="Senha"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={8}
                errorId={authErrorId}
              />
              {register && (
                <PasswordField
                  name="confirmPassword"
                  label="Confirmar senha"
                  autoComplete="new-password"
                  minLength={8}
                  errorId={authErrorId}
                />
              )}
              {validation && (
                <p className="form-error" role="alert" id="auth-validation">
                  {validation}
                </p>
              )}
              <ErrorNotice error={mutation.error} id="auth-error" />
              <Button disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Aguarde…"
                  : register
                    ? "Criar conta"
                    : "Entrar"}
              </Button>
            </form>
          )}
          <div className="auth-social">
            <p>Ou continue com</p>
            <button disabled>Continuar com Google</button>
            <button disabled>Continuar com Facebook</button>
            <small>Login social indisponível nesta demonstração.</small>
          </div>
          <aside className="auth-demo">
            Conta de demonstração:
            <br />
            alex@example.test · senha Jungle123!
          </aside>
          <DialogClose
            className="dialog-close"
            aria-label="Fechar acesso à conta"
          >
            <X size={18} />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
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
function QuoteItems({ quote }: { quote: Quote }) {
  return (
    <ul className="checkout-items">
      {quote.items.map((item) => (
        <li key={item.nftId + item.edition}>
          <Artwork src={item.image} alt="" sizes="64px" />
          <div>
            <strong>{item.name}</strong>
            <small>
              {item.quantity} × {item.edition}
            </small>
          </div>
          <b>{eth(wei(item.unitPrice) * BigInt(item.quantity))} ETH</b>
        </li>
      ))}
    </ul>
  );
}
function CouponForm({ cart }: { cart: ReturnType<typeof useCart> }) {
  const [coupon, setCoupon] = useState("");
  const token = localStorage.getItem("jungle-token");
  const mutation = useMutation({
    mutationFn: async (value: string) =>
      (await api.patch("/cart", { coupon: value })).data,
    onSuccess: (data) => {
      if (localStorage.getItem("jungle-token") === token)
        queryClient.setQueryData(cart.queryKey, data);
    },
  });
  return (
    <div className="coupon-panel">
      <form
        className="coupon-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(coupon);
        }}
      >
        <label className="field">
          Cupom
          <input
            value={coupon}
            onChange={(event) => setCoupon(event.target.value)}
            placeholder="Código promocional"
          />
        </label>
        <Button variant="outline" disabled={mutation.isPending}>
          Aplicar cupom
        </Button>
      </form>
      {cart.data?.coupon && (
        <p className="coupon-applied">
          Cupom {cart.data.coupon} aplicado.{" "}
          <button
            className="text-button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("")}
          >
            Remover cupom
          </button>
        </p>
      )}
      <ErrorNotice error={mutation.error} />
    </div>
  );
}
export function CartPage() {
  const cart = useCart(),
    token = localStorage.getItem("jungle-token");
  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.patch("/cart", body)).data,
    onSuccess: (data) => {
      if (localStorage.getItem("jungle-token") === token)
        queryClient.setQueryData(cart.queryKey, data);
    },
  });
  const quote = useCartQuote(cart);
  if (cart.isPending)
    return (
      <section className="commerce-page">
        <h1>Seu carrinho</h1>
        <Loading />
      </section>
    );
  if (cart.isError)
    return (
      <section className="commerce-page">
        <ErrorNotice error={cart.error} />
        <Button onClick={() => void cart.refetch()}>Tentar novamente</Button>
      </section>
    );
  return (
    <section className="commerce-page cart-page">
      <Breadcrumb current="Carrinho" />
      <h1>Seu carrinho</h1>
      {!cart.data?.items.length ? (
        <div className="empty">
          <h2>Seu carrinho está vazio.</h2>
          <Link to="/" search={authCatalog}>
            Explorar NFTs →
          </Link>
        </div>
      ) : (
        <div className="commerce-grid cart-layout">
          <div>
            <div className="cart-row-heading" aria-hidden="true">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            {cart.data.items.map((item) => (
              <article className="cart-line" key={item.nftId + item.edition}>
                <Link
                  to="/nft/$id"
                  params={{ id: item.nftId }}
                  className="cart-identity"
                >
                  <Artwork src={item.nft.image} alt="" sizes="64px" />
                  <div>
                    <h3>{item.nft.name}</h3>
                    <small>
                      ID do token: {item.nftId} · {item.edition}
                    </small>
                  </div>
                </Link>
                <div className="cart-unit">
                  <span className="mobile-label">Preço</span>
                  {item.unitPrice} ETH
                </div>
                <div className="cart-quantity">
                  <label
                    htmlFor={"quantity-" + item.nftId + item.edition}
                    className="sr-only"
                  >
                    Quantidade de {item.nft.name}
                  </label>
                  <button
                    aria-label={"Diminuir quantidade de " + item.nft.name}
                    disabled={mutation.isPending || item.quantity <= 1}
                    onClick={() =>
                      mutation.mutate({
                        nftId: item.nftId,
                        edition: item.edition,
                        quantity: item.quantity - 1,
                      })
                    }
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    id={"quantity-" + item.nftId + item.edition}
                    type="number"
                    value={item.quantity}
                    min={1}
                    max={item.available}
                    disabled={mutation.isPending}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      if (Number.isInteger(quantity) && quantity > 0)
                        mutation.mutate({
                          nftId: item.nftId,
                          edition: item.edition,
                          quantity,
                        });
                    }}
                  />
                  <button
                    aria-label={"Aumentar quantidade de " + item.nft.name}
                    disabled={
                      mutation.isPending || item.quantity >= item.available
                    }
                    onClick={() =>
                      mutation.mutate({
                        nftId: item.nftId,
                        edition: item.edition,
                        quantity: item.quantity + 1,
                      })
                    }
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="cart-line-total">
                  <span className="mobile-label">Total</span>
                  {eth(wei(item.unitPrice) * BigInt(item.quantity))} ETH
                </div>
                <button
                  className="remove-cart-item"
                  aria-label={"Remover " + item.nft.name}
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      nftId: item.nftId,
                      edition: item.edition,
                      quantity: 0,
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
                {item.quantity > item.available && (
                  <p className="stock-warning" role="alert">
                    Disponibilidade alterada: restam {item.available}. Ajuste ou
                    remova este item.
                  </p>
                )}
              </article>
            ))}
            <ErrorNotice error={mutation.error} />
          </div>
          <aside className="summary cart-summary">
            <h2>Resumo da carteira</h2>
            <CouponForm cart={cart} />
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
            <Link className="continue-shopping" to="/" search={authCatalog}>
              Continuar explorando
            </Link>
            <p className="muted">A cotação será revalidada antes da compra.</p>
          </aside>
        </div>
      )}
      <RelatedNfts exclude={cart.data?.items.map((item) => item.nftId)} />
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
    note?: string;
  };
}
export function CheckoutPage() {
  const { data: session } = useSession(),
    cart = useCart(),
    wallets = useWallets();
  const previewQuote = useCartQuote(cart),
    profile = useProfile(),
    token = localStorage.getItem("jungle-token");
  const [walletId, setWalletId] = useState(""),
    [network, setNetwork] = useState(""),
    [connected, setConnected] = useState(false),
    [connectionError, setConnectionError] = useState(""),
    [review, setReview] = useState<Quote | null>(null),
    [collector, setCollector] = useState({ name: "", email: "", note: "" });
  const busy = useRef(false);
  const revision = useRef(0);
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
  });
  const order = useMutation({
    mutationFn: async (value: Attempt) =>
      (
        await api.post<Order>("/orders", value.body, {
          headers: { "Idempotency-Key": value.key },
        })
      ).data,
    onSuccess: (result) => {
      if (
        localStorage.getItem("jungle-token") !== token ||
        result.userId !== session?.user.id
      )
        return;
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
  const reviewOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCollector({
      name: String(form.get("name")),
      email: String(form.get("email")),
      note: String(form.get("note") || ""),
    });
    const requestedRevision = revision.current;
    const data = await quote.mutateAsync().catch(() => null);
    if (
      data &&
      requestedRevision === revision.current &&
      localStorage.getItem("jungle-token") === token
    ) {
      setReview(data);
      setChanged(false);
    }
  };
  const submit = async () => {
    if (
      busy.current ||
      order.isPending ||
      !review ||
      !selected ||
      !connected ||
      network !== selected.network
    )
      return;
    busy.current = true;
    const requestedRevision = revision.current;
    try {
      const fresh = await quote.mutateAsync().catch(() => null);
      if (!fresh) return;
      if (
        requestedRevision !== revision.current ||
        localStorage.getItem("jungle-token") !== token
      )
        return;
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
          network,
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
  const displayQuote = review || previewQuote.data;
  return (
    <section className="commerce-page checkout-page">
      <Breadcrumb current="Pagamento" />
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
          Seu carrinho está vazio.{" "}
          <Link to="/" search={authCatalog}>
            Voltar ao catálogo
          </Link>
        </p>
      ) : (
        <div className="commerce-grid checkout-layout">
          <form
            className="form checkout-form"
            onSubmit={reviewOrder}
            onChange={() => {
              revision.current++;
              setReview(null);
            }}
          >
            <h2>Perfil do colecionador</h2>
            <Field
              name="name"
              label="Nome completo"
              defaultValue={session?.user.name}
              minLength={2}
            />
            <label className="field">
              Nome de usuário
              <input value={profile.data?.username || ""} readOnly />
            </label>
            <Field
              name="email"
              label="E-mail"
              type="email"
              defaultValue={session?.user.email}
            />
            <label className="field">
              Nome ENS (opcional)
              <input
                value={profile.data?.ens || ""}
                readOnly
                placeholder="Não informado"
              />
            </label>
            <h2>Carteira e rede</h2>
            {wallets.data?.length ? (
              <>
                <label className="field">
                  Carteira
                  <select
                    required
                    value={walletId}
                    onChange={(event) => {
                      const id = event.target.value;
                      setWalletId(id);
                      setNetwork(
                        wallets.data.find((w) => w.id === id)?.network || "",
                      );
                      setConnected(false);
                      setReview(null);
                      setConnectionError("");
                    }}
                  >
                    <option value="">Selecione sua carteira</option>
                    {wallets.data.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.label} · {wallet.network}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <>
                    <label className="field">
                      Rede
                      <select
                        value={network}
                        onChange={(event) => {
                          setNetwork(event.target.value);
                          setConnected(false);
                          setReview(null);
                          setConnectionError("");
                        }}
                      >
                        <option>Ethereum</option>
                        <option>Polygon</option>
                      </select>
                    </label>
                    <label className="field checkout-address">
                      Endereço da carteira
                      <input value={selected.address} readOnly />
                    </label>
                    {network !== selected.network && (
                      <p className="form-error full-row" role="alert">
                        Rede incompatível. Selecione {selected.network} para
                        esta carteira.
                      </p>
                    )}
                    <div className="wallet-actions full-row">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={network !== selected.network}
                        onClick={() => {
                          revision.current++;
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
                            revision.current++;
                            setConnectionError(
                              "Conexão recusada pelo usuário. Tente novamente.",
                            );
                            setConnected(false);
                            setReview(null);
                          }}
                        >
                          Simular recusa de conexão
                        </button>
                      )}
                    </div>
                    <p className="full-row muted" role="status">
                      {connected
                        ? "Carteira conectada na simulação."
                        : connectionError}
                    </p>
                  </>
                )}
              </>
            ) : (
              <p className="full-row">
                Cadastre uma carteira antes de continuar.{" "}
                <Link to="/wallets">Gerenciar carteiras →</Link>
              </p>
            )}
            <label className="field full-row">
              Observação do colecionador (opcional)
              <textarea name="note" maxLength={500} rows={4} />
            </label>
            <div className="full-row">
              <ErrorNotice error={wallets.error} />
              <ErrorNotice error={quote.error} />
            </div>
            <Button
              className="full-row review-button"
              disabled={!connected || quote.isPending || order.isPending}
            >
              {quote.isPending ? "Validando…" : "Revisar pedido"}
            </Button>
          </form>
          <aside className="summary checkout-summary">
            <h2>Seus NFTs</h2>
            {(changed ||
              !!(
                review &&
                cart.data &&
                review.cartVersion !== cart.data.version
              )) && (
              <p role="alert" className="form-error">
                Os valores ou itens mudaram. Confira a cotação e confirme
                novamente.
              </p>
            )}
            {displayQuote ? (
              <>
                <QuoteItems quote={displayQuote} />
                <CouponForm cart={cart} />
                <Totals quote={displayQuote} />
              </>
            ) : previewQuote.isPending ? (
              <Loading label="Carregando resumo" />
            ) : (
              <ErrorNotice error={previewQuote.error} />
            )}
            {review ? (
              <>
                <p className="muted">
                  {collector.name} · {collector.email}
                </p>
                {collector.note && (
                  <p className="collector-note">{collector.note}</p>
                )}
                <Button
                  disabled={
                    order.isPending ||
                    quote.isPending ||
                    !connected ||
                    review.cartVersion !== cart.data?.version
                  }
                  onClick={() => void submit()}
                >
                  {order.isPending ? "Enviando…" : "Confirmar compra simulada"}
                </Button>
              </>
            ) : (
              <p className="muted">
                Revise os dados para confirmar o valor final.
              </p>
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
    refetchInterval: (q) =>
      q.state.data?.status === "pending" ? 15000 : false,
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
      <article className="receipt-card">
        <div className="receipt-symbol" aria-hidden="true">
          {order.status === "confirmed" ? (
            <BadgeCheck size={48} />
          ) : order.status === "declined" ? (
            <CircleX size={48} />
          ) : (
            <Clock3 size={48} />
          )}
        </div>
        <h1>
          {order.status === "confirmed"
            ? "Compra confirmada"
            : order.status === "declined"
              ? "Pagamento recusado"
              : "Pedido em processamento"}
        </h1>
        <p className="receipt-status" role="status">
          {order.status === "pending"
            ? "Estamos aguardando o resultado da simulação. Você pode atualizar esta página com segurança."
            : order.status === "declined"
              ? order.reason
              : "Compra simulada confirmada. Seus NFTs já aparecem no histórico."}
        </p>
        <dl className="receipt-metadata">
          <div>
            <dt>Pedido</dt>
            <dd className="receipt-code">{order.id}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>
              <time
                className="receipt-date"
                dateTime={new Date(order.createdAt).toISOString()}
              >
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(order.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Carteira</dt>
            <dd>
              {order.wallet.label} · {order.wallet.network}
            </dd>
          </div>
          {order.transaction && (
            <div className="receipt-transaction">
              <dt>Transação simulada</dt>
              <dd className="receipt-code">{order.transaction}</dd>
            </div>
          )}
        </dl>
        <h2>Detalhes da compra</h2>
        <QuoteItems quote={order.quote} />
        <Totals quote={order.quote} />
        <p className="muted">
          {order.collector.name} · {order.collector.email}
        </p>
        {order.collector.note && (
          <p className="collector-note">{order.collector.note}</p>
        )}
        {order.status === "declined" && (
          <Button asChild>
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        )}
        <Link className="receipt-account" to="/account">
          Meus pedidos →
        </Link>
      </article>
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
    <AccountShell logout={<LogoutButton />}>
      <h1 className="account-greeting">Olá, {session?.user.name}</h1>

      <ProfileEditor />
      <div id="favorites">
        <FavoritesPanel />
      </div>
      <h2 id="orders" className="account-section-title">
        Meus pedidos
      </h2>
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
    </AccountShell>
  );
}
export function WalletsPage() {
  const wallets = useWallets(),
    { data: session } = useSession(),
    [editing, setEditing] = useState(""),
    [saved, setSaved] = useState(false);
  const profile = useProfile();
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
    <AccountShell logout={<LogoutButton />}>
      <h1 className="account-page-title">Minhas carteiras</h1>
      <p className="muted">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs
        comprados na simulação.
      </p>
      <div className="wallets-layout">
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
        <form
          key={editing}
          className="form wallet-form"
          onSubmit={submit}
          aria-describedby={mutation.error ? "wallet-error" : undefined}
        >
          <h2>{editing ? "Editar carteira" : "Nova carteira"}</h2>
          <label className="field">
            Nome de exibição
            <input value={profile.data?.name || ""} readOnly />
          </label>
          <Field
            name="label"
            label="Nome da carteira"
            defaultValue={wallet?.label}
            minLength={2}
            errorId={mutation.error ? "wallet-error" : undefined}
          />
          <Field name="network" label="Rede">
            <select
              name="network"
              defaultValue={wallet?.network || "Ethereum"}
              aria-describedby={mutation.error ? "wallet-error" : undefined}
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </Field>
          <label className="field">
            Nome do perfil
            <input value={profile.data?.username || ""} readOnly />
          </label>
          <Field
            name="address"
            label="Endereço da carteira"
            defaultValue={wallet?.address}
            errorId={mutation.error ? "wallet-error" : undefined}
          />
          <label className="field">
            Nome ENS do perfil
            <input
              value={profile.data?.ens || ""}
              placeholder="colecionador.eth"
              readOnly
            />
          </label>
          <label className="field">
            E-mail do perfil
            <input type="email" value={profile.data?.email || ""} readOnly />
          </label>
          <ErrorNotice error={mutation.error} id="wallet-error" />
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
    </AccountShell>
  );
}

import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowUpRight, Hexagon } from "lucide-react";
import type { Catalog, CatalogSearch, Nft } from "./domain";
import { api, errorMessage, queryClient, sessionOptions } from "./lib/api";
import { Button } from "./components/ui/button";

import {
  AccountNavigation,
  SessionGuard,
  LoginPage,
  PurchaseControls,
  CartPage,
  CheckoutPage,
  OrderPage,
  AccountPage,
  WalletsPage,
} from "./features/commerce";

function Layout() {
  return (
    <>
      <a className="skip" href="#main">
        Pular para o conteúdo
      </a>
      <header>
        <Link
          to="/"
          search={{ q: "", category: "", sort: "recent", page: 1 }}
          className="brand"
        >
          <Hexagon />
          JUNGLE®
        </Link>
        <nav>
          <Link
            to="/"
            search={{ q: "", category: "", sort: "recent", page: 1 }}
          >
            Marketplace
          </Link>
        </nav>
        <AccountNavigation />
      </header>
      <SessionGuard />
      <main id="main">
        <Outlet />
      </main>
      <footer>JUNGLE® · NFTs e valores fictícios</footer>
    </>
  );
}
function Skeleton() {
  return (
    <div className="grid" role="status" aria-label="Carregando catálogo">
      {Array.from({ length: 8 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
function CatalogPage() {
  const search = catalogRoute.useSearch();
  const navigate = catalogRoute.useNavigate();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["nfts", search],
    queryFn: async ({ signal }) =>
      (await api.get<Catalog>("/nfts", { params: search, signal })).data,
  });
  const change = (patch: Partial<CatalogSearch>) =>
    navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }) });
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">A NEW WORLD OF COLLECTING</p>
          <h1>
            Discover art.
            <br />
            Collect <em>extraordinary.</em>
          </h1>
          <p>
            Explore unique digital creations and find the next piece of your
            collection.
          </p>
          <Button asChild>
            <a href="#catalog">
              Explore marketplace <ArrowUpRight size={18} />
            </a>
          </Button>
        </div>
        <img
          src="/artwork/0.svg"
          alt="Composição abstrata de esferas douradas"
          width="600"
          height="600"
        />
      </section>
      <section id="catalog">
        <p className="eyebrow">CURATED FOR YOU</p>
        <h2>Explore the marketplace</h2>
        <div className="filters">
          <label className="search">
            <Search size={18} />
            <span className="sr-only">Buscar NFTs</span>
            <input
              value={search.q}
              placeholder="Search artworks or creators"
              onChange={(e) => void change({ q: e.target.value })}
            />
          </label>
          <label>
            <span className="sr-only">Categoria</span>
            <select
              value={search.category}
              onChange={(e) => void change({ category: e.target.value })}
            >
              <option value="">All categories</option>
              {["Art", "Photography", "Collectibles"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Ordenação</span>
            <select
              value={search.sort}
              onChange={(e) =>
                void change({ sort: e.target.value as CatalogSearch["sort"] })
              }
            >
              <option value="recent">Recently added</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
        {isPending ? (
          <Skeleton />
        ) : isError ? (
          <div role="alert" className="empty">
            <h3>Não foi possível carregar o catálogo.</h3>
            <Button onClick={() => void refetch()}>Tentar novamente</Button>
          </div>
        ) : (
          <>
            <p className="count" aria-live="polite">
              {data.total} artworks
            </p>
            {data.items.length === 0 ? (
              <div className="empty">
                <h3>No artworks found</h3>
                <Button
                  variant="outline"
                  onClick={() => void change({ q: "", category: "" })}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid">
                {data.items.map((n) => (
                  <Link
                    to="/nft/$id"
                    params={{ id: n.id }}
                    className="card"
                    key={n.id}
                  >
                    <img
                      src={n.image}
                      alt={n.name}
                      loading="lazy"
                      width="600"
                      height="600"
                    />
                    <div>
                      <small>
                        {n.creator} · {n.category}
                      </small>
                      <h3>{n.name}</h3>
                      <p>
                        <b>{n.price} ETH</b>
                        <span>
                          {n.stock ? "Available" : "Sold out"}{" "}
                          <ArrowUpRight size={16} />
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {data.pages > 1 && (
              <nav className="pagination" aria-label="Paginação">
                <Button
                  variant="outline"
                  disabled={search.page <= 1}
                  onClick={() => void change({ page: search.page - 1 })}
                >
                  Anterior
                </Button>
                <span>
                  {search.page} / {data.pages}
                </span>
                <Button
                  variant="outline"
                  disabled={search.page >= data.pages}
                  onClick={() => void change({ page: search.page + 1 })}
                >
                  Próxima
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
function DetailPage() {
  const { id } = detailRoute.useParams();
  const query = useQuery({
    queryKey: ["nft", id],
    queryFn: async ({ signal }) =>
      (await api.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
    retry: false,
  });
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <div className="empty" role="alert">
        <h1>NFT indisponível</h1>
        <p>O item não existe ou não foi possível consultá-lo.</p>
        <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
        <p>
          <Link
            to="/"
            search={{ q: "", category: "", sort: "recent", page: 1 }}
          >
            Voltar ao catálogo
          </Link>
        </p>
      </div>
    );
  const n = query.data;
  return (
    <section>
      <Link to="/" search={{ q: "", category: "", sort: "recent", page: 1 }}>
        ← Back to marketplace
      </Link>
      <div className="detail">
        <img src={n.image} alt={n.name} />
        <div>
          <p className="eyebrow">{n.category}</p>
          <h1>{n.name}</h1>
          <p>Created by {n.creator}</p>
          <h2>{n.price} ETH</h2>
          <p>{n.stock} editions available</p>
          <PurchaseControls nft={n} />
        </div>
      </div>
    </section>
  );
}
function RouteFailure({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <section className="empty" role="alert">
      <h1>Não foi possível carregar esta página.</h1>
      <p>{errorMessage(error)}</p>
      <Button onClick={() => void router.invalidate()}>Tentar novamente</Button>
    </section>
  );
}
const rootRoute = createRootRoute({
  component: Layout,
  errorComponent: RouteFailure,
  notFoundComponent: () => (
    <div className="empty">
      <h1>Página não encontrada</h1>
      <Link to="/" search={{ q: "", category: "", sort: "recent", page: 1 }}>
        Voltar ao catálogo
      </Link>
    </div>
  ),
});
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (s: Record<string, unknown>): CatalogSearch => ({
    q: typeof s.q === "string" ? s.q : "",
    category: ["Art", "Photography", "Collectibles"].includes(
      String(s.category),
    )
      ? String(s.category)
      : "",
    sort: s.sort === "price-asc" || s.sort === "price-desc" ? s.sort : "recent",
    page: Math.max(1, Math.floor(Number(s.page) || 1)),
  }),
  component: CatalogPage,
});
const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$id",
  component: DetailPage,
});
async function requireSession({ location }: { location: { href: string } }) {
  let session = null;
  try {
    session = await queryClient.fetchQuery(sessionOptions);
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 401) throw error;
  }
  if (!session)
    throw redirect({ to: "/login", search: { returnTo: location.href } });
}
const authSearch = (s: Record<string, unknown>) => ({
  returnTo: typeof s.returnTo === "string" ? s.returnTo : "/",
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: authSearch,
  component: LoginPage,
});
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  validateSearch: authSearch,
  component: LoginPage,
});
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: CartPage,
});
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  beforeLoad: requireSession,
  component: CheckoutPage,
});
const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders/$id",
  beforeLoad: requireSession,
  component: OrderPage,
});
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  beforeLoad: requireSession,
  component: AccountPage,
});
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  beforeLoad: requireSession,
  component: WalletsPage,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    catalogRoute,
    detailRoute,
    loginRoute,
    registerRoute,
    cartRoute,
    checkoutRoute,
    orderRoute,
    accountRoute,
    walletsRoute,
  ]),
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
export default function App() {
  return <RouterProvider router={router} />;
}

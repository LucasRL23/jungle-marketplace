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
import { ArrowUpRight } from "lucide-react";
import { Artwork } from "./components/artwork";
import {
  Hero,
  CatalogFilters,
  CatalogToolbar,
  MarketplaceFooter,
} from "./features/marketplace";
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

import { Realtime } from "./features/realtime";
import { FavoriteButton } from "./features/collector";

function Layout() {
  return (
    <>
      <a className="skip" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <Link
          to="/"
          search={{ q: "", category: "", sort: "recent", page: 1 }}
          className="brand"
        >
          KURIO
        </Link>
        <nav className="main-navigation" aria-label="Navegação principal">
          <Link
            to="/"
            search={{ q: "", category: "", sort: "recent", page: 1 }}
          >
            Início
          </Link>
          <a href="/#catalog">Mercado</a>
          <a href="/#about-kurio">Sobre a Kurio</a>
        </nav>
        <AccountNavigation />
      </header>
      <SessionGuard />
      <Realtime />
      <main id="main">
        <Outlet />
      </main>
      <MarketplaceFooter />
    </>
  );
}
function Skeleton() {
  return (
    <div className="grid" role="status" aria-label="Carregando catálogo">
      {Array.from({ length: 9 }, (_, i) => (
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
      <Hero />
      <section id="catalog" className="marketplace-catalog">
        <CatalogFilters
          key={`${search.minPrice}:${search.maxPrice}`}
          search={search}
          change={change}
        />
        <div className="catalog-results">
          <CatalogToolbar search={search} change={change} />
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
                {data.total}{" "}
                {data.total === 1 ? "obra encontrada" : "obras encontradas"}
              </p>
              {data.items.length === 0 ? (
                <div className="empty">
                  <h3>Nenhuma obra encontrada</h3>
                  <Button
                    variant="outline"
                    onClick={() =>
                      void change({
                        q: "",
                        category: "",
                        minPrice: "",
                        maxPrice: "",
                      })
                    }
                  >
                    Limpar filtros
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
                      <Artwork
                        src={n.image}
                        alt={n.name}
                        loading="lazy"
                        width="600"
                        height="600"
                      />
                      <div>
                        <h3>{n.name}</h3>
                        <p>
                          <b>{n.price} ETH</b>
                          <span>
                            {n.stock ? "" : "Esgotado"}{" "}
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
        </div>
      </section>
      <section id="about-kurio" className="collection-story">
        <div>
          <p className="eyebrow">UM NOVO UNIVERSO CRIATIVO</p>
          <h2>
            Arte digital selecionada.
            <br />
            Possibilidades extraordinárias.
          </h2>
          <p>
            Uma coleção de personagens, perspectivas e histórias. Encontre a
            peça que combina com a sua.
          </p>
          <Button asChild>
            <a href="#catalog">
              CONHECER A COLEÇÃO <ArrowUpRight size={16} />
            </a>
          </Button>
        </div>
        <Artwork
          src="/artwork/kurio/ape-4-480.webp"
          alt="Ape dourado com fones de ouvido"
          loading="lazy"
          sizes="(max-width: 700px) 85vw, 350px"
        />
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
        Início / Mercado
      </Link>
      <div className="detail">
        <Artwork
          src={n.image}
          alt={n.name}
          sizes="(max-width: 700px) 90vw, 550px"
          fetchPriority="high"
        />
        <div>
          <p className="eyebrow">{n.category}</p>
          <h1>{n.name}</h1>
          <p>Criado por {n.creator}</p>
          <h2>{n.price} ETH</h2>
          <p>{n.stock} edições disponíveis</p>
          <FavoriteButton id={n.id} name={n.name} />
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
    minPrice:
      typeof s.minPrice === "string" && /^\d+(\.\d{1,18})?$/.test(s.minPrice)
        ? s.minPrice
        : "",
    maxPrice:
      typeof s.maxPrice === "string" && /^\d+(\.\d{1,18})?$/.test(s.maxPrice)
        ? s.maxPrice
        : "",
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

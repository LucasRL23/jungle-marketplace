import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "./components/breadcrumb";
import { DetailGallery } from "./features/detail-gallery";
import { RelatedNfts } from "./features/related-nfts";
import { MarketplaceFooter } from "./features/marketplace";
import {
  MarketplaceCatalog,
  CatalogSkeleton as Skeleton,
} from "./features/catalog";
import type { CatalogSearch, Nft } from "./domain";
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
  const path = useRouterState({ select: (state) => state.location.pathname });
  const market = ["/nft/", "/cart", "/checkout", "/orders/"].some((prefix) =>
    path.startsWith(prefix),
  );
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
            data-active={!market}
          >
            Início
          </Link>
          <a
            href="/#catalog"
            data-active={market}
            aria-current={market ? "location" : undefined}
          >
            Mercado
          </a>
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
function CatalogPage() {
  const search = catalogRoute.useSearch();
  const navigate = catalogRoute.useNavigate();
  return (
    <MarketplaceCatalog
      search={search}
      onChange={(patch) =>
        navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }) })
      }
    />
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
    <section className="nft-page">
      <Breadcrumb current={n.name} />
      <div className="detail">
        <DetailGallery key={n.id} nft={n} />
        <div>
          <p className="eyebrow">{n.category}</p>
          <h1>{n.name}</h1>
          <p>Criado por {n.creator}</p>
          <p className="nft-intro">
            Uma peça da coleção Kurio Editions. Explore seus detalhes e escolha
            uma edição para a sua coleção.
          </p>
          <h2>{n.price} ETH</h2>
          <p>{n.stock} edições disponíveis</p>
          <FavoriteButton id={n.id} name={n.name} />
          <PurchaseControls nft={n} />
        </div>
      </div>
      <div className="nft-description">
        <h2>Detalhes da obra</h2>
        <p>
          Arte digital da coleção Kurio, disponível em edições standard e
          limited. Preços, disponibilidade e compras fazem parte de uma
          experiência simulada.
        </p>
        <dl>
          <div>
            <dt>ID do token</dt>
            <dd>{n.id}</dd>
          </div>
          <div>
            <dt>Criador</dt>
            <dd>{n.creator}</dd>
          </div>
          <div>
            <dt>Rede</dt>
            <dd>Ethereum (simulada)</dd>
          </div>
          <div>
            <dt>Edições disponíveis</dt>
            <dd>{n.stock}</dd>
          </div>
        </dl>
      </div>
      <RelatedNfts exclude={[n.id]} />
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

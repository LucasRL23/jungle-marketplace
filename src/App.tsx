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
import { Search } from "lucide-react";
import { MarketplaceFooter } from "./features/marketplace";
import {
  MarketplaceCatalog,
  CatalogSkeleton as Skeleton,
} from "./features/catalog";
import type { CatalogSearch } from "./domain";
import { errorMessage, queryClient, sessionOptions } from "./lib/api";
import { Button } from "./components/ui/button";
import { DetailSkeleton } from "./components/detail-skeleton";

import { lazy, Suspense } from "react";
import { AccountNavigation, SessionGuard } from "./features/session";
import { mocksReady } from "./lib/mock-ready";
const LoginPage = lazy(() =>
  import("./features/commerce").then((module) => ({
    default: module.LoginPage,
  })),
);
const CartPage = lazy(() =>
  import("./features/commerce").then((module) => ({
    default: module.CartPage,
  })),
);
const CheckoutPage = lazy(() =>
  import("./features/commerce").then((module) => ({
    default: module.CheckoutPage,
  })),
);
const OrderPage = lazy(() =>
  import("./features/commerce").then((module) => ({
    default: module.OrderPage,
  })),
);
const AccountPage = lazy(() =>
  import("./features/commerce").then((module) => ({
    default: module.AccountPage,
  })),
);
const WalletsPage = lazy(() =>
  import("./features/commerce").then((module) => ({
    default: module.WalletsPage,
  })),
);
const DetailContent = lazy(() => import("./features/detail-page"));
function DetailPage() {
  const { id } = detailRoute.useParams();
  return <DetailContent id={id} />;
}

const Realtime = lazy(async () => {
  // Engine.IO captures WebSocket at import time, after MSW installs interception.
  await mocksReady;
  return import("./features/realtime").then((module) => ({
    default: module.Realtime,
  }));
});

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
          <button disabled title="Criadores indisponível nesta demonstração">
            Criadores
          </button>
          <a href="/#about-kurio">Aprenda</a>
        </nav>
        <a
          className="header-search"
          href="/#catalog"
          aria-label="Explorar coleções"
        >
          <Search size={20} />
        </a>
        <AccountNavigation />
      </header>
      <SessionGuard />
      <Suspense fallback={null}>
        <Realtime />
      </Suspense>
      <main
        id="main"
        className={
          ["/", "/login", "/register"].includes(path)
            ? "discovery-page"
            : undefined
        }
      >
        <Suspense
          fallback={
            path.startsWith("/nft/") ? <DetailSkeleton /> : <Skeleton />
          }
        >
          <Outlet />
        </Suspense>
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

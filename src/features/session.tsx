import { useEffect } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { api, clearPrivateData, queryClient } from "../lib/api";
import { useSession } from "./hooks";
import {
  LogOut,
  ShoppingCart,
  Home,
  Heart,
  Gem,
  UserRound,
  LogIn,
} from "lucide-react";
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
export function LogoutButton() {
  const router = useRouter();
  const logout = useMutation({
    mutationFn: (token: string | null) =>
      api.post(
        "/logout",
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      ),
  });
  return (
    <button
      className="logout-button"
      aria-label="Sair"
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
      <LogOut size={16} />
      Sair
    </button>
  );
}
export function AccountNavigation() {
  const { data: session } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const collectorArea = path === "/account" || path === "/wallets";
  return (
    <div className="account-nav">
      <Link
        className="mobile-nav-item"
        to="/"
        search={{ q: "", category: "", sort: "recent", page: 1 }}
        aria-label="Início"
      >
        <Home size={21} />
      </Link>
      <Link
        className="mobile-nav-item"
        to="/account"
        hash="favorites"
        aria-label="Meus favoritos"
      >
        <Heart size={21} />
      </Link>
      <a
        className="mobile-nav-item mobile-explore"
        href="/#catalog"
        aria-label="Explorar coleção"
      >
        <Gem size={25} />
      </a>
      <Link to="/cart" aria-label="Carrinho">
        <ShoppingCart size={21} />
        <span className="nav-caption">Carrinho</span>
      </Link>
      {session ? (
        <>
          <Link to="/account" aria-label={session.user.name.split(" ")[0]}>
            <UserRound className="mobile-nav-icon" size={21} />
            <span className="account-caption">
              {session.user.name.split(" ")[0]}
            </span>
          </Link>
          {!collectorArea && <LogoutButton />}
        </>
      ) : (
        <Link to="/login" aria-label="Entrar" search={{ returnTo: "/" }}>
          <LogIn size={17} />
          <span className="account-caption">Entrar</span>
        </Link>
      )}
    </div>
  );
}

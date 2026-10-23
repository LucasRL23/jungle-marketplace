import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { UserRound, Wallet, ShoppingBag, Heart } from "lucide-react";

export function AccountShell({
  children,
  logout,
}: {
  children: ReactNode;
  logout: ReactNode;
}) {
  return (
    <section className="account-layout">
      <aside className="account-sidebar">
        <h2>Meu perfil</h2>
        <nav aria-label="Menu do colecionador">
          <Link
            to="/account"
            activeOptions={{ exact: true, includeHash: true }}
          >
            <UserRound size={17} />
            Dados do perfil
          </Link>
          <Link
            to="/wallets"
            activeOptions={{ exact: true, includeHash: true }}
          >
            <Wallet size={17} />
            Carteiras
          </Link>
          <Link
            to="/account"
            hash="orders"
            activeOptions={{ exact: true, includeHash: true }}
          >
            <ShoppingBag size={17} />
            Atividade
          </Link>
          <Link
            to="/account"
            hash="favorites"
            activeOptions={{ exact: true, includeHash: true }}
          >
            <Heart size={17} />
            Lista de interesse
          </Link>
        </nav>
        <div className="account-sidebar-logout">{logout}</div>
      </aside>
      <div className="account-content">{children}</div>
    </section>
  );
}

import { Link } from "@tanstack/react-router";

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav className="breadcrumb" aria-label="Caminho de navegação">
      <Link to="/" search={{ q: "", category: "", sort: "recent", page: 1 }}>
        Início
      </Link>
      <span aria-hidden="true">/</span>
      <a href="/#catalog">Mercado</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

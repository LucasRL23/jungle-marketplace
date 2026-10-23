import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  Gem,
} from "lucide-react";
import type { CatalogSearch } from "../domain";
import { Button } from "../components/ui/button";
import { Artwork } from "../components/artwork";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Bem-vindo à Kurio</p>
        <h1>
          Seja dono do futuro
          <br />
          da arte digital
        </h1>
        <p>
          Descubra NFTs selecionados de criadores emergentes e consagrados.
          Colecione arte digital rara, apoie artistas e tenha uma parte da
          cultura da internet.
        </p>
        <Button asChild>
          <a href="#catalog">
            EXPLORAR <ArrowUpRight size={16} />
          </a>
        </Button>
        <span className="hero-marker" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      <Artwork
        className="hero-art"
        src="/artwork/kurio/ape-1-480.webp"
        alt="Ape com óculos e jaqueta verde, arte da coleção Kurio"
        loading="eager"
        fetchPriority="high"
        sizes="(max-width: 700px) 90vw, 450px"
      />
    </section>
  );
}

export function CatalogFilters({
  search,
  change,
}: {
  search: CatalogSearch;
  change: (patch: Partial<CatalogSearch>) => unknown;
}) {
  const [min, setMin] = useState(search.minPrice || ""),
    [max, setMax] = useState(search.maxPrice || "");
  return (
    <aside className="catalog-sidebar" aria-label="Filtros do catálogo">
      <details className="filter-disclosure" open>
        <summary>
          <SlidersHorizontal size={16} /> Filtrar coleção
        </summary>
        <div className="filter-panel">
          <h2>Coleções</h2>
          <div className="category-links">
            {[
              ["", "Todas as coleções"],
              ["Art", "Arte digital"],
              ["Photography", "Fotografia"],
              ["Collectibles", "Colecionáveis"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={search.category === value}
                onClick={() => void change({ category: value })}
              >
                {label}
                <span>{value ? "08" : "24"}</span>
              </button>
            ))}
          </div>
        </div>
        <form
          className="filter-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void change({ minPrice: min, maxPrice: max });
          }}
        >
          <h2>Faixa de preço</h2>
          <p className="muted">Valores em ETH</p>
          <div className="price-inputs">
            <label>
              <span>Mínimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={min}
                placeholder="0.00"
                onChange={(e) => setMin(e.target.value)}
              />
            </label>
            <span>—</span>
            <label>
              <span>Máximo</span>
              <input
                type="number"
                min={min || "0"}
                step="0.01"
                value={max}
                placeholder="12.30"
                onChange={(e) => setMax(e.target.value)}
              />
            </label>
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
        <div className="filter-panel">
          <h2>Rede</h2>
          <p className="network-label">
            <span className="network-dot" /> Ethereum <span>24</span>
          </p>
          <p className="muted">
            Todos os itens desta coleção usam a rede Ethereum simulada.
          </p>
        </div>
      </details>
      <Link className="featured-nft" to="/nft/$id" params={{ id: "nft-2" }}>
        <span>NFT EM DESTAQUE</span>
        <Artwork
          src="/artwork/kurio/ape-2-480.webp"
          alt="Sage Nomad #009"
          loading="lazy"
        />
        <strong>
          OFERTA LIMITADA <ArrowUpRight size={16} />
        </strong>
      </Link>
    </aside>
  );
}

export function CatalogToolbar({
  search,
  change,
}: {
  search: CatalogSearch;
  change: (patch: Partial<CatalogSearch>) => unknown;
}) {
  return (
    <>
      <div className="catalog-toolbar">
        <h2>Todos os NFTs</h2>
        <label>
          <span>Ordenar por:</span>
          <select
            aria-label="Ordenação"
            value={search.sort}
            onChange={(e) =>
              void change({ sort: e.target.value as CatalogSearch["sort"] })
            }
          >
            <option value="recent">Listados recentemente</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </label>
      </div>
      <label className="catalog-search">
        <Search size={16} />
        <span className="sr-only">Buscar NFTs</span>
        <input
          value={search.q}
          placeholder="Buscar arte ou criador"
          onChange={(e) => void change({ q: e.target.value })}
        />
      </label>
    </>
  );
}

export function MarketplaceFooter() {
  return (
    <footer className="marketplace-footer">
      <div className="footer-benefits">
        <article>
          <ShieldCheck />
          <h2>Colecione com confiança</h2>
          <p>
            Confira a edição, o criador e a disponibilidade antes de escolher
            sua próxima peça.
          </p>
        </article>
        <article>
          <Wallet />
          <h2>Sua coleção, seu controle</h2>
          <p>
            Gerencie suas carteiras, acompanhe os pedidos e encontre suas obras
            favoritas.
          </p>
        </article>
        <article>
          <Gem />
          <h2>Um novo olhar para a arte</h2>
          <p>
            Explore uma seleção de arte digital e descubra o que faz sentido
            para você.
          </p>
        </article>
      </div>
      <div className="footer-bottom">
        <div>
          <strong>KURIO</strong>
          <p>Arte digital. Novas perspectivas.</p>
        </div>
        <nav aria-label="Links do rodapé">
          <a href="/#catalog">Explorar mercado</a>
          <Link to="/account">Meu perfil</Link>
          <Link to="/wallets">Minhas carteiras</Link>
        </nav>
        <p className="demo-label">
          Projeto para o desafio Jungle.
          <br />
          NFTs, pagamentos e carteiras simulados.
        </p>
      </div>
      <p className="footer-copyright">
        © 2026 Kurio · Uma experiência de coleção digital.
      </p>
    </footer>
  );
}

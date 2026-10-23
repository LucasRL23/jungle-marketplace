import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import type { Catalog, CatalogSearch } from "../domain";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Artwork } from "../components/artwork";
import { Hero, CatalogFilters, CatalogToolbar } from "./marketplace";
export function CatalogSkeleton() {
  return (
    <div className="grid" role="status" aria-label="Carregando catálogo">
      {Array.from({ length: 9 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function MarketplaceCatalog({
  search,
  onChange,
}: {
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>) => unknown;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["nfts", search],
    queryFn: async ({ signal }) =>
      (await api.get<Catalog>("/nfts", { params: search, signal })).data,
  });
  const change = onChange;
  return (
    <>
      <button
        className="mobile-filter-trigger"
        aria-label="Abrir filtros da coleção"
        onClick={() => {
          const filters =
            document.querySelector<HTMLDetailsElement>(".filter-disclosure");
          if (filters) {
            filters.open = true;
            filters.scrollIntoView({ behavior: "instant", block: "start" });
            filters
              .querySelector<HTMLButtonElement>(".category-links button")
              ?.focus();
          }
        }}
      >
        <SlidersHorizontal size={20} />
      </button>
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
            <CatalogSkeleton />
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
                      <div className="card-art">
                        <Artwork
                          src={n.image}
                          alt={n.name}
                          loading="lazy"
                          width="600"
                          height="600"
                        />
                      </div>
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
        {[
          {
            image: 1,
            title: "Lançamentos gênesis de edição limitada",
            description:
              "Colecione edições especiais dos criadores e descubra sua próxima peça.",
            category: "Art",
          },
          {
            image: 3,
            title: "Arte digital selecionada e muito mais",
            description:
              "Explore novos artistas e coleções que definem a cultura digital.",
            category: "Collectibles",
          },
        ].map((item) => (
          <article className="collection-promo" key={item.image}>
            <Artwork
              src={`/artwork/kurio/ape-${item.image}-480.webp`}
              alt=""
              loading="lazy"
              sizes="(max-width:700px) 130px, 280px"
            />
            <div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <Button asChild>
                <Link
                  to="/"
                  search={{
                    q: "",
                    category: item.category,
                    sort: "recent",
                    page: 1,
                  }}
                  hash="catalog"
                >
                  EXPLORAR <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
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

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Catalog } from "../domain";
import { api } from "../lib/api";
import { Artwork } from "../components/artwork";

const search = {
  q: "",
  category: "",
  sort: "recent",
  page: 1,
  minPrice: "",
  maxPrice: "",
};
export function RelatedNfts({ exclude = [] }: { exclude?: string[] }) {
  const id = useId();
  const query = useQuery({
    queryKey: ["nfts", search],
    queryFn: async ({ signal }) =>
      (await api.get<Catalog>("/nfts", { params: search, signal })).data,
  });
  return (
    <div className="related-nfts" aria-labelledby={id}>
      <h2 id={id}>Explore também</h2>
      {query.isError ? (
        <p className="muted">Não foi possível carregar outras obras.</p>
      ) : (
        <div className="related-grid">
          {query.isPending
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton" aria-hidden="true" />
              ))
            : query.data.items
                .filter((n) => !exclude.includes(n.id))
                .slice(0, 5)
                .map((n) => (
                  <Link
                    key={n.id}
                    to="/nft/$id"
                    params={{ id: n.id }}
                    className="card"
                  >
                    <div className="card-art">
                      <Artwork
                        src={n.image}
                        alt=""
                        loading="lazy"
                        sizes="(max-width: 700px) 170px, 230px"
                      />
                    </div>
                    <div>
                      <h3>{n.name}</h3>
                      <p>{n.price} ETH</p>
                    </div>
                  </Link>
                ))}
        </div>
      )}
    </div>
  );
}

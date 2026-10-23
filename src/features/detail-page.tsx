import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Nft } from "../domain";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Breadcrumb } from "../components/breadcrumb";
import { DetailGallery } from "./detail-gallery";
import { RelatedNfts } from "./related-nfts";
import { FavoriteButton } from "./favorite-button";
import { PurchaseControls } from "./purchase-controls";
import { DetailSkeleton } from "../components/detail-skeleton";
export default function DetailPage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["nft", id],
    queryFn: async ({ signal }) =>
      (await api.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
    retry: false,
  });
  if (query.isPending) return <DetailSkeleton />;
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
          <h2>{n.price} ETH</h2>
          <p>Criado por {n.creator}</p>
          <p className="nft-intro">
            Uma peça da coleção Kurio Editions. Explore seus detalhes e escolha
            uma edição para a sua coleção.
          </p>
          <p>{n.stock} edições disponíveis</p>
          <PurchaseControls
            nft={n}
            favorite={<FavoriteButton id={n.id} name={n.name} />}
          />
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

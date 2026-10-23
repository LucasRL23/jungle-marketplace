import { useState } from "react";
import { ZoomIn, X } from "lucide-react";
import type { Nft } from "../domain";
import { Artwork } from "../components/artwork";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../components/ui/dialog";

const views = [
  { id: "full", label: "Arte completa" },
  { id: "face", label: "Detalhe do rosto" },
  { id: "outfit", label: "Detalhe do traje" },
];
export function DetailGallery({ nft }: { nft: Nft }) {
  const [view, setView] = useState("full");
  return (
    <div className="nft-gallery">
      <div className="gallery-thumbnails" aria-label="Vistas da obra">
        {views.map((item) => (
          <button
            key={item.id}
            aria-label={item.label}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            <Artwork
              src={nft.image}
              alt=""
              sizes="72px"
              className={`crop-${item.id}`}
            />
          </button>
        ))}
      </div>
      <div className="gallery-stage" data-view={view}>
        <Artwork
          src={nft.image}
          alt={nft.name}
          fetchPriority="high"
          sizes="(max-width: 700px) 90vw, 550px"
        />
        <Dialog>
          <DialogTrigger asChild>
            <button className="gallery-zoom" aria-label="Ampliar arte">
              <ZoomIn size={20} />
            </button>
          </DialogTrigger>
          <DialogContent className="artwork-dialog">
            <DialogTitle className="sr-only">Arte de {nft.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Visualização ampliada da arte completa.
            </DialogDescription>
            <Artwork src={nft.image} alt={nft.name} sizes="90vw" />
            <DialogClose
              className="dialog-close"
              aria-label="Fechar arte ampliada"
            >
              <X size={20} />
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

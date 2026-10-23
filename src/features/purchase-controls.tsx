import { useState, useId } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Plus, Minus } from "lucide-react";
import type { CartItem, Nft } from "../domain";
import { api, queryClient } from "../lib/api";
import { Button } from "../components/ui/button";
import { ErrorNotice } from "../components/commerce-fields";
import { useCart } from "./hooks";
export function PurchaseControls({
  nft,
  favorite,
}: {
  nft: Nft;
  favorite?: ReactNode;
}) {
  const quantityId = useId();
  const [edition, setEdition] = useState<CartItem["edition"]>("standard"),
    [quantity, setQuantity] = useState(1),
    [notice, setNotice] = useState("");
  const cart = useCart();
  const token = localStorage.getItem("jungle-token");
  const mutation = useMutation({
    mutationFn: async () => {
      const old =
        cart.data?.items.find(
          (i) => i.nftId === nft.id && i.edition === edition,
        )?.quantity || 0;
      return (
        await api.patch("/cart", {
          nftId: nft.id,
          edition,
          quantity: old + quantity,
        })
      ).data;
    },
    onSuccess: (data) => {
      if (localStorage.getItem("jungle-token") !== token) return;
      queryClient.setQueryData(cart.queryKey, data);
      setNotice("NFT adicionado ao carrinho.");
    },
  });
  const maximum = edition === "limited" ? Math.min(3, nft.stock) : nft.stock;
  return (
    <div className="purchase-controls">
      <label className="field">
        Edição
        <select
          value={edition}
          onChange={(e) => {
            setEdition(e.target.value as CartItem["edition"]);
            setQuantity(1);
          }}
        >
          <option value="standard">Standard · {nft.price} ETH</option>
          <option value="limited">Limited · preço em dobro</option>
        </select>
      </label>
      <div className="field">
        <label htmlFor={quantityId}>Quantidade</label>
        <div className="quantity-stepper">
          <button
            type="button"
            aria-label="Diminuir quantidade do NFT"
            disabled={quantity <= 1}
            onClick={() => setQuantity(quantity - 1)}
          >
            <Minus size={12} />
          </button>
          <input
            id={quantityId}
            type="number"
            min={1}
            max={maximum}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <button
            type="button"
            aria-label="Aumentar quantidade do NFT"
            disabled={quantity >= maximum}
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
      <Button
        disabled={
          mutation.isPending ||
          cart.isPending ||
          maximum === 0 ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > maximum
        }
        onClick={() => mutation.mutate()}
      >
        {maximum === 0
          ? "Esgotado"
          : mutation.isPending
            ? "Adicionando…"
            : "Adicionar ao carrinho"}
      </Button>
      {favorite}
      <ErrorNotice error={mutation.error || cart.error} />
      <p role="status">{notice}</p>
      {notice && <Link to="/cart">Ver carrinho →</Link>}
    </div>
  );
}

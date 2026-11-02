import { useState } from "react";
import { motion } from "motion/react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/menu";
import { formatSum } from "@/lib/format";
import { productImage } from "@/lib/food-images";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export function ProductCard({
  product,
  categorySlug,
  index,
}: {
  product: Product;
  categorySlug?: string | null | undefined;
  index: number;
}) {
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const image = productImage(product.image_url, categorySlug, index);
  const price = Number(product.price);
  const oldPrice = product.old_price ? Number(product.old_price) : null;
  const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  function add() {
    cart.add(
      {
        productId: product.id,
        name: product.name,
        price,
        cost: Number(product.cost_price),
        image,
        badge: product.badge,
      },
      qty,
    );
    toast.success(`${product.name} savatga qo'shildi`);
    setQty(1);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: (index % 6) * 0.04 }}
      className="group flex flex-col overflow-hidden rounded-3xl glass shadow-soft"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          width={800}
          height={600}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.badge ? (
            <span className="rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-glow">
              {product.badge}
            </span>
          ) : null}
          {discount > 0 ? (
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
              -{discount}%
            </span>
          ) : null}
          {product.is_new ? (
            <span className="rounded-full glass-strong px-3 py-1 text-xs font-semibold text-foreground">
              Yangi
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-foreground">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            {oldPrice ? (
              <div className="text-xs text-muted-foreground line-through">
                {formatSum(oldPrice)}
              </div>
            ) : null}
            <div className="text-base font-extrabold text-foreground sm:text-lg">{formatSum(price)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary p-1">
            <button
              type="button"
              aria-label="Kamaytirish"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-7 w-7 place-items-center rounded-full text-foreground press"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-bold text-foreground">{qty}</span>
            <button
              type="button"
              aria-label="Ko'paytirish"
              onClick={() => setQty((q) => q + 1)}
              className="grid h-7 w-7 place-items-center rounded-full text-foreground press"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={add}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground press shadow-glow"
        >
          <ShoppingBag className="h-4 w-4" />
          Savatga
        </button>
      </div>
    </motion.article>
  );
}

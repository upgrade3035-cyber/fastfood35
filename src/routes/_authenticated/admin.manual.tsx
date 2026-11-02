import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { productsQuery, placeOrder } from "@/lib/menu";
import { formatSum } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/manual")({
  component: ManualOrderPage,
});

function ManualOrderPage() {
  const products = useQuery(productsQuery);
  const queryClient = useQueryClient();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [table, setTable] = useState("");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);

  const list = (products.data ?? []).filter((p) => p.is_visible);
  const lines = list
    .filter((p) => (qty[p.id] ?? 0) > 0)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      price: Number(p.price),
      cost: Number(p.cost_price),
      quantity: qty[p.id]!,
    }));
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  async function submit() {
    if (!lines.length) {
      toast.error("Mahsulot tanlang");
      return;
    }
    if (!table.trim()) {
      toast.error("Stol raqamini kiriting");
      return;
    }
    setSaving(true);
    try {
      const order = await placeOrder({
        tableNumber: table.trim(),
        customerName: customer.trim(),
        source: "manual",
        lines,
      });

      toast.success(`Buyurtma #${order.order_no} yaratildi`);
      setQty({});
      setTable("");
      setCustomer("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch {
      toast.error("Buyurtma yaratilmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl glass p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">{formatSum(p.price)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary p-1">
              <button
                aria-label="Kamaytirish"
                onClick={() =>
                  setQty((q) => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))
                }
                className="grid h-7 w-7 place-items-center rounded-full press"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-sm font-bold">{qty[p.id] ?? 0}</span>
              <button
                aria-label="Ko'paytirish"
                onClick={() => setQty((q) => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))}
                className="grid h-7 w-7 place-items-center rounded-full press"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-3xl glass p-5 lg:sticky lg:top-4">
        <h2 className="text-sm font-extrabold text-foreground">Yangi buyurtma</h2>
        <input
          value={table}
          onChange={(e) => setTable(e.target.value)}
          placeholder="Stol raqami"
          aria-label="Stol raqami"
          className="mt-3 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Mijoz ismi (ixtiyoriy)"
          aria-label="Mijoz ismi"
          className="mt-2 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-2">
              <span className="truncate">
                {l.name} × {l.quantity}
              </span>
              <span className="shrink-0">{formatSum(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Jami</span>
          <span className="text-lg font-extrabold text-foreground">{formatSum(total)}</span>
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="mt-4 w-full rounded-2xl gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground press shadow-glow disabled:opacity-60"
        >
          Buyurtmani yaratish
        </button>
      </aside>
    </div>
  );
}

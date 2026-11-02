import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useLiveOrders, updateOrderStatus } from "@/lib/live-orders";
import { formatTime, STATUS_LABELS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/kitchen")({
  component: KitchenPage,
});

function KitchenPage() {
  const orders = useLiveOrders();
  const active = (orders.data ?? []).filter((o) =>
    ["pending", "accepted", "preparing", "ready"].includes(o.status),
  );

  async function set(id: string, status: string) {
    try {
      await updateOrderStatus(id, status);
    } catch {
      toast.error("Xatolik");
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {active.map((o) => (
        <motion.article key={o.id} layout className="rounded-3xl glass p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-black text-foreground">#{o.order_no}</p>
            <span className="rounded-full gradient-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
              Stol {o.table_number ?? "-"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatTime(o.created_at)} · {STATUS_LABELS[o.status]}
          </p>
          <ul className="mt-3 space-y-1.5">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex justify-between text-base font-bold text-foreground">
                <span className="truncate">{i.product_name}</span>
                <span className="shrink-0 text-primary">× {i.quantity}</span>
              </li>
            ))}
          </ul>
          {o.notes ? (
            <p className="mt-3 rounded-xl bg-secondary p-2 text-xs text-muted-foreground">
              {o.notes}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => set(o.id, "preparing")}
              className="flex-1 rounded-2xl bg-secondary py-3 text-xs font-bold text-foreground press"
            >
              Tayyorlanmoqda
            </button>
            <button
              onClick={() => set(o.id, "ready")}
              className="flex-1 rounded-2xl gradient-primary py-3 text-xs font-extrabold text-primary-foreground press"
            >
              Tayyor
            </button>
          </div>
        </motion.article>
      ))}
      {active.length === 0 ? (
        <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
          Faol buyurtmalar yo‘q.
        </p>
      ) : null}
    </div>
  );
}

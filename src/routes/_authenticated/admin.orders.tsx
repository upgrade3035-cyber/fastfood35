import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Printer, Bell, X, Trash2 } from "lucide-react";
import { useLiveOrders, updateOrderStatus } from "@/lib/live-orders";
import { supabase } from "@/integrations/supabase/client";
import { formatSum, formatDateTime, STATUS_LABELS } from "@/lib/format";
import { printReceipt } from "@/lib/receipt";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

const FILTERS = ["preparing", "delivered"] as const;

function OrdersPage() {
  const [popupId, setPopupId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("preparing");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const orders = useLiveOrders((id) => setPopupId(id));
  const queryClient = useQueryClient();

  const list = useMemo(
    () =>
      (orders.data ?? []).filter((o) =>
        filter === "delivered"
          ? o.status === "delivered"
          : o.status !== "delivered" && o.status !== "cancelled",
      ),
    [orders.data, filter],
  );
  const popup = (orders.data ?? []).find((o) => o.id === popupId) ?? null;

  async function advance(id: string, status: string) {
    try {
      await updateOrderStatus(id, status);
      toast.success(`Holat: ${STATUS_LABELS[status]}`);
    } catch {
      toast.error("Holatni yangilab bo‘lmadi");
    }
  }

  async function removeOrder(id: string, orderNo: number) {
    if (!window.confirm(`#${orderNo} chek butunlay o‘chirilsin? Hisob-kitobdan ham chiqadi.`)) {
      return;
    }
    setDeletingId(id);
    const { error } = await supabase.from("orders").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["live-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
    ]);
    toast.success("Chek o‘chirildi va hisob-kitobdan chiqarildi");
  }


  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold press ${
              filter === f
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "glass text-muted-foreground"
            }`}
          >
            {STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => {
          const isActive = o.status !== "cancelled" && o.status !== "delivered";
          return (
            <motion.article
              key={o.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl glass p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-extrabold text-foreground">#{o.order_no}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Stol {o.table_number ?? "-"} · {formatDateTime(o.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                    isActive
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {isActive ? "Tayyorlanmoqda" : (STATUS_LABELS[o.status] ?? o.status)}
                </span>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2 text-muted-foreground">
                    <span className="truncate">
                      {i.product_name} × {i.quantity}
                    </span>
                    <span className="shrink-0">{formatSum(Number(i.unit_price) * i.quantity)}</span>
                  </li>
                ))}
              </ul>

              {o.latitude != null && o.longitude != null ? (
                <a
                  href={`https://yandex.uz/maps/?pt=${o.longitude},${o.latitude}&z=17&l=map`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-foreground"
                >
                  <span className="truncate">
                    📍 Yetkazish joyi{o.address ? ` · ${o.address}` : ""}
                  </span>
                  <span className="shrink-0 text-primary">Xaritada</span>
                </a>
              ) : o.address ? (
                <p className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  📍 {o.address}
                </p>
              ) : null}


              {o.notes ? (
                <p className="mt-2 rounded-xl bg-secondary p-2 text-xs text-muted-foreground">
                  {o.notes}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-base font-extrabold text-foreground">
                  {formatSum(o.total)}
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    aria-label="Chek chiqarish"
                    onClick={() => printReceipt(o)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-secondary press"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  {isActive ? (
                    <>
                      <button
                        onClick={() => advance(o.id, "cancelled")}
                        className="rounded-full bg-secondary px-4 py-2 text-xs font-bold text-destructive press"
                      >
                        Bekor
                      </button>
                      <button
                        onClick={() => advance(o.id, "delivered")}
                        className="rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground press"
                      >
                        Yetkazildi
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => void removeOrder(o.id, o.order_no)}
                      disabled={deletingId === o.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-destructive press disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === o.id ? "O‘chirilmoqda…" : "O‘chirish"}
                    </button>
                  )}

                </div>
              </div>
            </motion.article>
          );
        })}

        {list.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Buyurtmalar yo‘q.
          </p>
        ) : null}
      </div>

      <AnimatePresence>
        {popup ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-sm rounded-[2rem] glass-strong p-6 text-center shadow-glow"
            >
              <motion.div
                animate={{ rotate: [0, -12, 12, -8, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
                className="mx-auto grid h-16 w-16 place-items-center rounded-full gradient-primary text-primary-foreground"
              >
                <Bell className="h-7 w-7" />
              </motion.div>
              <h2 className="mt-4 font-display text-xl font-extrabold text-foreground">
                Yangi buyurtma #{popup.order_no}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Stol {popup.table_number ?? "-"} · {formatSum(popup.total)}
              </p>
              <ul className="mt-3 space-y-1 text-left text-sm text-muted-foreground">
                {popup.order_items.map((i) => (
                  <li key={i.id}>
                    {i.product_name} × {i.quantity}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setPopupId(null)}
                  className="flex-1 rounded-2xl bg-secondary py-3 text-sm font-bold text-foreground press"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    void advance(popup.id, "accepted");
                    setPopupId(null);
                  }}
                  className="flex-[2] rounded-2xl gradient-primary py-3 text-sm font-extrabold text-primary-foreground press"
                >
                  Qabul qilish
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

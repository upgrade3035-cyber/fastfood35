import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, PackageSearch, UtensilsCrossed } from "lucide-react";
import { PageShell } from "@/components/customer/page-shell";
import { useMyOrders } from "@/lib/use-my-orders";
import { formatSum, formatDateTime, customerStatusLabel } from "@/lib/format";

export const Route = createFileRoute("/buyurtmalar")({
  head: () => ({
    meta: [
      { title: "Buyurtmalarim — Lazzat Fast Food" },
      {
        name: "description",
        content:
          "Manzilga yetkazish uchun bergan buyurtmalaringiz holatini real vaqtda kuzatib boring.",
      },
      { property: "og:title", content: "Buyurtmalarim — Lazzat" },
      {
        property: "og:description",
        content: "Yetkazib berish buyurtmalaringiz va ularning holati.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data, isLoading } = useMyOrders();
  const orders = data ?? [];

  return (
    <PageShell title="Buyurtmalar" subtitle="Stolga va manzilga bergan buyurtmalaringiz">
      <Link
        to="/"
        className="flex items-center justify-center gap-2 rounded-2xl gradient-primary px-5 py-3.5 text-sm font-extrabold text-primary-foreground press shadow-glow"
      >
        <Bike className="h-4 w-4" />
        Yangi buyurtma berish
      </Link>
      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl glass p-8 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-bold text-foreground">Hozircha buyurtma yo‘q</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bosh sahifadan savatni to‘ldiring, savat ichida “Stolga yetkazish” yoki “Manzilga
            yetkazish”ni tanlab buyurtma bering.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-2xl gradient-primary px-6 py-3 text-sm font-extrabold text-primary-foreground press shadow-glow"
          >
            Menyuga o‘tish
          </Link>
        </div>
      ) : (
        orders.map((o) => (
          <article key={o.id} className="rounded-3xl glass p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                  {o.order_type === "delivery" ? (
                    <Bike className="h-4 w-4 text-primary" />
                  ) : (
                    <UtensilsCrossed className="h-4 w-4 text-primary" />
                  )}
                  Buyurtma #{o.order_no}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {o.order_type === "delivery"
                    ? "Manzilga yetkazish"
                    : `Stol: ${o.table_number || "-"}`}{" "}
                  · {formatDateTime(o.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                  o.status === "delivered"
                    ? "gradient-primary text-primary-foreground"
                    : o.status === "cancelled"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-secondary text-secondary-foreground"
                }`}
              >
                {customerStatusLabel(o.status, o.order_type)}
              </span>
            </div>

            {o.address ? (
              <p className="mt-3 text-xs text-muted-foreground">Manzil: {o.address}</p>
            ) : null}

            <ul className="mt-3 space-y-1">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 text-xs text-foreground">
                  <span className="truncate">
                    {i.product_name} × {i.quantity}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatSum(Number(i.unit_price) * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Jami</span>
              <span className="text-base font-extrabold text-foreground">{formatSum(o.total)}</span>
            </div>
          </article>
        ))
      )}
    </PageShell>
  );
}

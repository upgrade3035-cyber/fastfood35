import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, ReceiptText } from "lucide-react";
import { PageShell } from "@/components/customer/page-shell";
import { useMyOrders } from "@/lib/use-my-orders";
import { formatSum, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/cheklar")({
  head: () => ({
    meta: [
      { title: "Cheklarim — Lazzat Fast Food" },
      {
        name: "description",
        content: "Bergan buyurtmalaringiz cheklari: mahsulotlar, summa va chop etish imkoniyati.",
      },
      { property: "og:title", content: "Cheklarim — Lazzat" },
      { property: "og:description", content: "Buyurtmalaringiz cheklari bir joyda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReceiptsPage,
});

type ReceiptOrder = {
  order_no: number;
  created_at: string;
  table_number: string;
  address: string | null;
  total: number | string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number | string }[];
};

function printReceipt(order: ReceiptOrder) {
  const rows = order.order_items
    .map(
      (i) =>
        `<tr><td>${i.product_name} × ${i.quantity}</td><td style="text-align:right">${formatSum(
          Number(i.unit_price) * i.quantity,
        )}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Chek #${order.order_no}</title>
<style>body{font-family:ui-monospace,Menlo,monospace;width:280px;margin:0 auto;padding:12px;color:#000}
h1{font-size:16px;text-align:center;margin:0 0 4px}p{margin:2px 0;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}td{padding:2px 0}
.total{border-top:1px dashed #000;margin-top:8px;padding-top:6px;font-weight:700;font-size:14px;display:flex;justify-content:space-between}
.center{text-align:center}</style></head><body>
<h1>Lazzat Fast Food</h1>
<p class="center">Chek #${order.order_no}</p>
<p class="center">${formatDateTime(order.created_at)}</p>
<p class="center">${order.address ? `Manzil: ${order.address}` : `Stol: ${order.table_number}`}</p>
<table>${rows}</table>
<div class="total"><span>JAMI</span><span>${formatSum(order.total)}</span></div>
<p class="center" style="margin-top:10px">Rahmat! Yana kutib qolamiz 🧡</p>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}<\/script>
</body></html>`;

  const win = window.open("", "_blank", "width=340,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function ReceiptsPage() {
  const { data, isLoading } = useMyOrders();
  const orders = data ?? [];

  return (
    <PageShell title="Cheklar" subtitle="Bergan buyurtmalaringiz cheklari">
      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl glass p-8 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-bold text-foreground">Chek yo‘q</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Birinchi buyurtmangizni bering — cheki shu yerda paydo bo‘ladi.
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
                <p className="text-sm font-extrabold text-foreground">Chek #{o.order_no}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDateTime(o.created_at)} ·{" "}
                  {o.order_type === "delivery" ? "Yetkazib berish" : `Stol ${o.table_number}`}
                </p>
              </div>
              <button
                onClick={() => printReceipt(o as ReceiptOrder)}
                aria-label="Chekni chop etish"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground press"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>

            <ul className="mt-3 space-y-1 border-t border-dashed border-border pt-3">
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

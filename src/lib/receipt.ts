import type { Order, OrderItem } from "@/lib/menu";
import { formatSum, formatDateTime } from "@/lib/format";

export function printReceipt(
  order: Order & { order_items: OrderItem[] },
  restaurantName = "Lazzat Fast Food",
) {
  const rows = order.order_items
    .map(
      (i) =>
        `<tr><td>${i.product_name} × ${i.quantity}</td><td style="text-align:right">${formatSum(
          Number(i.unit_price) * i.quantity,
        )}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Chek #${order.order_no}</title>
<style>
body{font-family:ui-monospace,Menlo,monospace;width:280px;margin:0 auto;padding:12px;color:#000}
h1{font-size:16px;text-align:center;margin:0 0 4px}
p{margin:2px 0;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
td{padding:2px 0}
.total{border-top:1px dashed #000;margin-top:8px;padding-top:6px;font-weight:700;font-size:14px;display:flex;justify-content:space-between}
.center{text-align:center}
</style></head><body>
<h1>${restaurantName}</h1>
<p class="center">Chek #${order.order_no}</p>
<p class="center">${formatDateTime(order.created_at)}</p>
<p class="center">Stol: ${order.table_number ?? "-"}</p>
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

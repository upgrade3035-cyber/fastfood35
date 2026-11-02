import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  ShoppingBag,
  Wallet,
  PiggyBank,
  BarChart3,
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import { ordersQuery, productsQuery, expensesQuery, settingsQuery } from "@/lib/menu";
import {
  employeesQuery,
  dailySalaryTotal,
  monthlySalaryTotal as monthlyTotal,
} from "@/lib/employees";
import { AiAnalyst } from "@/components/ai-analyst";
import { supabase } from "@/integrations/supabase/client";
import { formatSum, formatShort, STATUS_LABELS } from "@/lib/format";
import { productImage } from "@/lib/food-images";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}


function Dashboard() {
  const orders = useQuery(ordersQuery);
  const products = useQuery(productsQuery);
  const expenses = useQuery(expensesQuery);
  const settings = useQuery(settingsQuery);
  const employees = useQuery(employeesQuery);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    open: boolean;
    name: string;
    amount: string;
    period: "daily" | "monthly";
  }>({ open: false, name: "", amount: "", period: "monthly" });
  const [saving, setSaving] = useState(false);

  const all = (orders.data ?? []).filter((o) => o.status !== "cancelled");
  const today = all.filter((o) => new Date(o.created_at) >= startOfDay());

  const revenue = today.reduce((s, o) => s + Number(o.total), 0);
  const cost = today.reduce(
    (s, o) => s + o.order_items.reduce((c, i) => c + Number(i.unit_cost) * i.quantity, 0),
    0,
  );
  const spent = (expenses.data ?? [])
    .filter((e) => new Date(e.spent_on) >= startOfDay())
    .reduce((s, e) => s + Number(e.amount), 0);

  const deduct = settings.data?.deduct_salaries ?? false;
  const staff = employees.data ?? [];
  const monthlySalaryTotal = monthlyTotal(staff);
  const dailySalary = dailySalaryTotal(staff);

  const grossProfit = revenue - cost;
  const netProfit = grossProfit - spent - (deduct ? dailySalary : 0);

  // Umumiy (barcha vaqt) foyda
  const totalRevenue = all.reduce((s, o) => s + Number(o.total), 0);
  const totalCost = all.reduce(
    (s, o) => s + o.order_items.reduce((c, i) => c + Number(i.unit_cost) * i.quantity, 0),
    0,
  );
  const totalSpent = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const daysWithSales = new Set(
    all.map((o) => startOfDay(new Date(o.created_at)).toISOString()),
  ).size;
  const totalSalary = deduct ? dailySalary * Math.max(1, daysWithSales) : 0;
  const totalProfit = totalRevenue - totalCost - totalSpent - totalSalary;


  // so'nggi 7 kun
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const from = startOfDay(d).getTime();
    const to = from + 86400000;
    const sum = all
      .filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= from && t < to;
      })
      .reduce((s, o) => s + Number(o.total), 0);
    return { label: d.toLocaleDateString("uz-UZ", { weekday: "short" }), sum };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.sum));

  // Bugungi mahsulot statistikasi
  const counter = new Map<
    string,
    { id: string | null; name: string; qty: number; sum: number; profit: number }
  >();
  today.forEach((o) =>
    o.order_items.forEach((i) => {
      const prev = counter.get(i.product_name) ?? {
        id: i.product_id,
        name: i.product_name,
        qty: 0,
        sum: 0,
        profit: 0,
      };
      prev.qty += i.quantity;
      prev.sum += Number(i.unit_price) * i.quantity;
      prev.profit += (Number(i.unit_price) - Number(i.unit_cost)) * i.quantity;
      counter.set(i.product_name, prev);
    }),
  );
  const daily = [...counter.values()].sort((a, b) => b.qty - a.qty);
  const maxQty = Math.max(1, ...daily.map((d) => d.qty));

  const statusCounts = ["pending", "preparing", "ready", "delivered"].map((s) => ({
    status: s,
    count: (orders.data ?? []).filter((o) => o.status === s).length,
  }));

  async function toggleDeduct(next: boolean) {
    const { error } = await supabase.from("settings").update({ deduct_salaries: next }).eq("id", 1);
    if (error) {
      toast.error("Saqlanmadi");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    toast.success(next ? "Maosh ayiriladi" : "Maosh ayirilmaydi");
  }

  async function addEmployee() {
    const name = form.name.trim();
    const amount = Number(form.amount.replace(/\s/g, "")) || 0;
    if (!name) {
      toast.error("Xodim ismini kiriting");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .insert({ name, salary_amount: amount, salary_period: form.period });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ open: false, name: "", amount: "", period: "monthly" });
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Xodim saqlandi — narxlar yangilandi");
  }

  async function updateEmployee(
    id: string,
    patch: { salary_amount?: number; salary_period?: "daily" | "monthly" },
  ) {
    const { error } = await supabase.from("employees").update(patch).eq("id", id);
    if (error) {
      toast.error("Maosh saqlanmadi");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Maosh saqlandi");
  }

  async function removeEmployee(id: string) {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast.error("O‘chirib bo‘lmadi");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Xodim o‘chirildi");
  }


  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Bugungi tushum"
          value={formatSum(revenue)}
          delay={0}
        />
        <Stat
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Buyurtmalar"
          value={String(today.length)}
          delay={0.05}
        />
        <Stat
          icon={<Wallet className="h-4 w-4" />}
          label="Bugungi sof foyda"
          value={formatSum(netProfit)}
          delay={0.1}
        />
        <Stat
          icon={<PiggyBank className="h-4 w-4" />}
          label="Jami foyda"
          value={formatSum(totalProfit)}
          delay={0.15}
        />
      </div>

      <section className="rounded-3xl glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            Xodimlar maoshi
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleDeduct(!deduct)}
              className={`rounded-full px-4 py-2 text-[11px] font-extrabold press ${
                deduct
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {deduct ? "Sof foydadan ayirilmoqda" : "Ayirilmaydi"}
            </button>
            <button
              type="button"
              aria-label="Xodim qo‘shish"
              onClick={() => setForm((f) => ({ ...f, open: !f.open }))}
              className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-primary-foreground press"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {form.open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 grid gap-2 rounded-2xl bg-secondary p-3 sm:grid-cols-[minmax(0,1fr)_140px_auto_auto]"
          >
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Xodim ismi"
              className="rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={form.amount}
              inputMode="numeric"
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Maosh (so‘m)"
              className="rounded-xl bg-background px-3 py-2.5 text-right text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-1 rounded-xl bg-background p-1">
              {(["daily", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, period: p })}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-extrabold press ${
                    form.period === p
                      ? "gradient-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {p === "daily" ? "Kunlik" : "Oylik"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void addEmployee()}
              disabled={saving}
              className="rounded-xl gradient-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground press disabled:opacity-50"
            >
              {saving ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </motion.div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Xodim qo‘shilmagan — + tugmasini bosing.
            </p>
          ) : (
            staff.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-secondary p-3">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {p.name}
                </span>
                <input
                  inputMode="numeric"
                  defaultValue={String(Number(p.salary_amount))}
                  onBlur={(e) =>
                    void updateEmployee(p.id, {
                      salary_amount: Number(e.target.value.replace(/\s/g, "")) || 0,
                    })
                  }
                  className="w-28 rounded-xl bg-background px-3 py-2 text-right text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() =>
                    void updateEmployee(p.id, {
                      salary_period: p.salary_period === "daily" ? "monthly" : "daily",
                    })
                  }
                  className="shrink-0 rounded-xl bg-background px-2.5 py-2 text-[11px] font-bold text-muted-foreground press"
                >
                  {p.salary_period === "daily" ? "so‘m/kun" : "so‘m/oy"}
                </button>
                <button
                  type="button"
                  aria-label="O‘chirish"
                  onClick={() => void removeEmployee(p.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-background text-destructive press"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            Oylik jami: <b className="text-foreground">{formatSum(Math.round(monthlySalaryTotal))}</b>
          </span>
          <span>
            Kunlik ulush: <b className="text-foreground">{formatSum(Math.round(dailySalary))}</b>
          </span>
          <span>
            Yalpi foyda: <b className="text-foreground">{formatSum(grossProfit)}</b>
          </span>
        </div>
      </section>


      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-3xl glass p-5">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            So‘nggi 7 kun tushumi
          </h2>
          <div className="flex h-48 items-end gap-2">
            {days.map((d, i) => (
              <div
                key={`${d.label}-${i}`}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {formatShort(d.sum)}
                </span>
                <motion.div
                  initial={{ height: 6 }}
                  animate={{ height: Math.max(6, Math.round((d.sum / maxDay) * 140)) }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full shrink-0 rounded-t-xl gradient-primary"
                />
                <span className="truncate text-[11px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl glass p-5">
          <h2 className="mb-4 text-sm font-extrabold text-foreground">Holatlar</h2>
          <div className="space-y-2">
            {statusCounts.map((s) => (
              <div
                key={s.status}
                className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{STATUS_LABELS[s.status]}</span>
                <span className="text-sm font-extrabold text-foreground">{s.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl glass p-5">
        <h2 className="mb-4 text-sm font-extrabold text-foreground">
          Bugungi mahsulot statistikasi
        </h2>
        <div className="space-y-2">
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bugun hali sotuv yo‘q.</p>
          ) : (
            daily.map((t, i) => {
              const product = (products.data ?? []).find((p) => p.id === t.id);
              return (
                <div key={t.name} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                  <img
                    src={productImage(product?.image_url ?? null, null, i)}
                    alt={t.name}
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-foreground">{t.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {t.qty} ta
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-background">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(6, (t.qty / maxQty) * 100)}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full gradient-primary"
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground">
                        Tushum: {formatShort(t.sum)} so‘m
                      </span>
                      <span className="font-bold text-primary">
                        Foyda: {formatShort(t.profit)} so‘m
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <AiAnalyst
        snapshot={{
          valyuta: "so'm (UZS)",
          bugun: {
            tushum: revenue,
            tannarx: cost,
            xarajat: spent,
            yalpi_foyda: grossProfit,
            sof_foyda: netProfit,
            buyurtmalar: today.length,
          },
          umumiy: {
            tushum: totalRevenue,
            tannarx: totalCost,
            xarajat: totalSpent,
            maosh: Math.round(totalSalary),
            jami_foyda: totalProfit,
            buyurtmalar: all.length,
          },
          xodimlar: staff.map((e) => ({
            ism: e.name,
            maosh: Number(e.salary_amount),
            davr: e.salary_period,
          })),
          maosh: {
            oylik_jami: Math.round(monthlySalaryTotal),
            kunlik_ulush: Math.round(dailySalary),
            foydadan_ayiriladi: deduct,
          },
          mahsulotlar: (products.data ?? []).map((p) => ({
            nomi: p.name,
            narx: Number(p.price),
            tannarx: Number(p.cost_price),
            foyda: Number(p.price) - Number(p.cost_price),
          })),
          bugungi_sotuvlar: daily.map((d) => ({
            nomi: d.name,
            soni: d.qty,
            tushum: d.sum,
            foyda: d.profit,
          })),
          oxirgi_7_kun: days,
          xarajatlar: (expenses.data ?? [])
            .slice(0, 40)
            .map((e) => ({ nomi: e.title, summa: Number(e.amount), sana: e.spent_on })),
        }}
      />

      <p className="text-xs text-muted-foreground">
        Menyuda {(products.data ?? []).length} ta mahsulot mavjud.
      </p>

    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl glass p-4"
    >
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="truncate text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 truncate text-lg font-extrabold text-foreground sm:text-xl">{value}</p>
    </motion.div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { Sparkles, Loader2, Send } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyzeBusiness, type AiAnalysis } from "@/lib/ai-analysis.functions";
import { formatSum } from "@/lib/format";
import { toast } from "sonner";

const TEMPLATES = [
  "1kg piyoz 10 000 so'm, 1kg go'sht 130 000 so'm, 1l yog' 30 000 so'm va 1 poda o'tin bilan somsa tayyorlab 10 000 so'mdan sotmoqchiman — foydaga qolamanmi?",
  "Menyudagi qaysi mahsulot eng ko'p foyda keltiryapti va qaysi biri zarar?",
  "Bugungi tushum, xarajat va xodim maoshlarini hisobga olib sof foydamni tahlil qil",
  "Narxlarni qanday o'zgartirsam oylik foydam 20% ga oshadi?",
  "Eng ko'p sotilgan 5 mahsulot bo'yicha statistika va diagramma chiqar",
];

const COLORS = ["#6366f1", "#22c55e", "#f97316", "#e11d48", "#0ea5e9", "#a855f7"];

export function AiAnalyst({ snapshot }: { snapshot: unknown }) {
  const [question, setQuestion] = useState("");
  const run = useServerFn(analyzeBusiness);
  const [result, setResult] = useState<AiAnalysis | null>(null);

  const mutation = useMutation({
    mutationFn: (q: string) =>
      run({ data: { question: q, snapshot: JSON.stringify(snapshot).slice(0, 20000) } }),
    onSuccess: (data) => setResult(data),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Tahlil qilib bo‘lmadi"),
  });

  function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setQuestion(text);
    mutation.mutate(text);
  }

  return (
    <section className="rounded-3xl glass p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        AI tahlilchi
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Saytdagi mahsulotlar, narxlar, sotuvlar va xarajatlarga asoslanib statistika bilan javob
        beradi.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => ask(t)}
            disabled={mutation.isPending}
            className="max-w-full rounded-full bg-secondary px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground press disabled:opacity-50"
          >
            {t.length > 64 ? `${t.slice(0, 64)}…` : t}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Savolingizni yozing… masalan: 1ta somsa uchun qancha pul ketadi?"
          className="min-h-[76px] flex-1 rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => ask(question)}
          disabled={mutation.isPending}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground press disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {mutation.isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">AI hisob-kitob qilmoqda…</p>
      ) : null}

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-4"
        >
          {result.verdict ? (
            <p className="rounded-2xl gradient-primary px-4 py-3 text-sm font-extrabold text-primary-foreground">
              {result.verdict}
            </p>
          ) : null}

          <div className="whitespace-pre-wrap rounded-2xl bg-secondary p-4 text-sm leading-relaxed text-foreground">
            {result.answer}
          </div>

          {result.chart.length > 0 ? (
            <div className="rounded-2xl bg-secondary p-4">
              <p className="mb-3 text-xs font-bold text-muted-foreground">{result.chartTitle}</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={50} />
                    <YAxis tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v: number) => formatSum(Number(v))} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {result.chart.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {result.tips.length > 0 ? (
            <ul className="space-y-1.5">
              {result.tips.map((tip) => (
                <li
                  key={tip}
                  className="rounded-2xl bg-secondary px-4 py-2.5 text-xs text-muted-foreground"
                >
                  💡 {tip}
                </li>
              ))}
            </ul>
          ) : null}
        </motion.div>
      ) : null}
    </section>
  );
}

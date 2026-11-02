import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Check, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { feedbackQuery, markFeedbackRead, deleteFeedback } from "@/lib/feedback";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  const list = useQuery(feedbackQuery);
  const queryClient = useQueryClient();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["feedback"] });
  }

  const items = list.data ?? [];
  const unread = items.filter((f) => !f.is_read).length;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl glass p-5">
        <h1 className="text-sm font-extrabold text-foreground">Mijozlar fikrlari</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Jami {items.length} ta fikr · {unread} ta o‘qilmagan
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((f) => (
          <motion.article
            key={f.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl glass p-4 ${f.is_read ? "opacity-70" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-foreground">
                  {f.name?.trim() || "Anonim mijoz"}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatDateTime(f.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${
                      n <= (f.rating ?? 0) ? "fill-primary text-primary" : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{f.message}</p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await markFeedbackRead(f.id, !f.is_read);
                    await refresh();
                  } catch {
                    toast.error("Yangilab bo‘lmadi");
                  }
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-2.5 text-xs font-bold text-foreground press"
              >
                <Check className="h-4 w-4" />
                {f.is_read ? "O‘qilmagan" : "O‘qildi"}
              </button>
              <button
                aria-label="O‘chirish"
                onClick={async () => {
                  try {
                    await deleteFeedback(f.id);
                    await refresh();
                  } catch {
                    toast.error("O‘chirib bo‘lmadi");
                  }
                }}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-destructive press"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.article>
        ))}

        {items.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Hozircha fikrlar yo‘q.
          </p>
        ) : null}
      </div>
    </div>
  );
}
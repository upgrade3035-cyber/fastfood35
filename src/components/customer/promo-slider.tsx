import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Timer } from "lucide-react";
import type { Promotion } from "@/lib/menu";
import { useMediaUrl } from "@/lib/media";

function useCountdown(target?: string | null) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    if (!target) return setLeft(null);
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return setLeft(null);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(
        d > 0
          ? `${d}k ${h}s ${m}d`
          : `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

export function PromoSlider({ promotions }: { promotions: Promotion[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Muddati tugagan aksiyalar avtomatik ko‘rinmaydi
  const live = useMemo(
    () => promotions.filter((p) => !p.ends_at || new Date(p.ends_at).getTime() > now),
    [promotions, now],
  );

  const [i, setI] = useState(0);
  const active = live[i % Math.max(1, live.length)];
  const countdown = useCountdown(active?.ends_at);
  const mediaUrl = useMediaUrl(active?.media_url ?? active?.image_url ?? null);
  const mediaType = active?.media_type ?? "text";

  useEffect(() => {
    if (live.length < 2) return;
    const ms = Math.max(1, active?.display_seconds ?? 5) * 1000;
    const id = setTimeout(() => setI((v) => (v + 1) % live.length), ms);
    return () => clearTimeout(id);
  }, [live.length, active?.id, active?.display_seconds]);

  if (!active) return null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] gradient-primary p-[1px] shadow-glow">
      <div className="relative overflow-hidden rounded-[2rem] bg-background/85">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {mediaType !== "text" && mediaUrl ? (
              <div className="relative">
                {mediaType === "video" ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-80 w-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={active.title}
                    className="max-h-80 w-full object-cover"
                  />
                )}
                {countdown ? (
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full glass-strong px-3 py-1.5 text-xs font-bold text-foreground">
                    <Timer className="h-3.5 w-3.5 text-primary" />
                    {countdown}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="px-6 py-7 sm:px-9 sm:py-10">
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full gradient-primary opacity-30 blur-3xl" />
                <span className="inline-flex items-center rounded-full glass px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {active.discount_percent ? `${active.discount_percent}% chegirma` : "Aksiya"}
                </span>
                <h2 className="mt-3 max-w-lg text-2xl font-extrabold text-foreground sm:text-3xl">
                  {active.title}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">{active.description}</p>
                {countdown ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-bold text-foreground">
                    <Timer className="h-4 w-4 text-primary" />
                    {countdown}
                  </div>
                ) : null}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-1.5 px-6 pb-5 sm:px-9">
          {live.map((p, idx) => (
            <button
              key={p.id}
              aria-label={`Aksiya ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === i % live.length ? "w-8 gradient-primary" : "w-3 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Globe, MapPin, MessageSquareHeart, Moon, Phone, Star, Sun } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/customer/page-shell";
import { Label } from "@/components/ui/label";
import { menuQuery } from "@/lib/menu";
import { LANGUAGES, readLang, saveLang, type LangCode } from "@/lib/prefs";
import { submitFeedback } from "@/lib/feedback";

export const Route = createFileRoute("/sozlamalar")({
  head: () => ({
    meta: [
      { title: "Sozlamalar — Lazzat Fast Food" },
      {
        name: "description",
        content:
          "Ismingiz, telefon raqamingiz va yetkazish manzilingizni saqlang, restoran ma’lumotlarini ko‘ring.",
      },
      { property: "og:title", content: "Sozlamalar — Lazzat" },
      { property: "og:description", content: "Shaxsiy ma’lumotlar va restoran kontaktlari." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: menu } = useQuery(menuQuery);
  const settings = menu?.settings;

  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState<LangCode>("uz");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lazzat_theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    setLang(readLang());
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("lazzat_theme", next ? "dark" : "light");
  }

  function pickLang(code: LangCode) {
    setLang(code);
    saveLang(code);
    toast.success("Til saqlandi");
  }

  async function sendFeedback() {
    if (message.trim().length < 3) {
      toast.error("Fikringizni yozing");
      return;
    }
    setSending(true);
    try {
      await submitFeedback({ rating, message });
      setMessage("");
      toast.success("Fikringiz uchun rahmat!");
    } catch {
      toast.error("Yuborib bo‘lmadi");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell title="Sozlamalar" subtitle="Ilova ko‘rinishi, til va fikringiz">
      <section className="rounded-3xl glass p-4">
        <h2 className="font-display text-base font-extrabold text-foreground">Ko‘rinish</h2>
        <button
          onClick={toggleTheme}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3.5 press"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            {dark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            Tungi rejim
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              dark ? "gradient-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${
                dark ? "left-[1.4rem]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </section>

      <section className="rounded-3xl glass p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          Ilova tili
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => pickLang(l.code)}
              className={`rounded-2xl px-3 py-3 text-xs font-bold press ${
                lang === l.code
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl glass p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-foreground">
          <MessageSquareHeart className="h-4 w-4 text-primary" />
          Fikr bildirish
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Fikringiz anonim yuboriladi — ism kerak emas.
        </p>
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              aria-label={`${n} yulduz`}
              onClick={() => setRating(n)}
              className="press"
            >
              <Star
                className={`h-7 w-7 ${
                  n <= rating ? "fill-primary text-primary" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="f-message">Fikringiz</Label>
            <textarea
              id="f-message"
              value={message}
              maxLength={2000}
              rows={4}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nima yoqdi, nimani yaxshilaymiz?"
              className="mt-1.5 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={sendFeedback}
            disabled={sending}
            className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground press shadow-glow disabled:opacity-50"
          >
            {sending ? "Yuborilmoqda..." : "Fikrni yuborish"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl glass p-4">
        <h2 className="font-display text-base font-extrabold text-foreground">Restoran</h2>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            {settings?.address ?? "Manzil ko‘rsatilmagan"}
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            {settings?.phone ?? "—"}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            {settings?.working_hours ?? "10:00 - 23:00"}
          </li>
        </ul>
      </section>

    </PageShell>
  );
}

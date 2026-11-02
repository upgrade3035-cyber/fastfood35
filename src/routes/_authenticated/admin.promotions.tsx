import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Timer, Trash2, Upload } from "lucide-react";
import { promotionsQuery, type Promotion } from "@/lib/menu";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/promotions")({
  component: PromotionsPage,
});

const TYPES = [
  { value: "banner", label: "Banner" },
  { value: "flash", label: "Flash" },
  { value: "plus_one", label: "1+1" },
  { value: "free_drink", label: "Bepul ichimlik" },
  { value: "limited", label: "Cheklangan" },
] as const;

const MEDIA_TYPES = [
  { value: "text", label: "Yozuvli post" },
  { value: "image", label: "Faqat rasm" },
  { value: "video", label: "Faqat video" },
] as const;

const COUNTDOWNS = [
  { value: "60", label: "1 soat qoldi" },
  { value: "360", label: "6 soat qoldi" },
  { value: "1440", label: "1 kun qoldi" },
  { value: "4320", label: "3 kun qoldi" },
  { value: "10080", label: "1 hafta qoldi" },
] as const;

type MediaType = (typeof MEDIA_TYPES)[number]["value"];

type Draft = {
  id?: string;
  title: string;
  description: string;
  media_type: MediaType;
  media_url: string;
  type: (typeof TYPES)[number]["value"];
  discount_percent: string;
  display_value: string;
  display_unit: "sec" | "min";
  countdown_on: boolean;
  countdown_minutes: string;
  ends_at: string | null;
  is_active: boolean;
};

const EMPTY: Draft = {
  title: "",
  description: "",
  media_type: "text",
  media_url: "",
  type: "banner",
  discount_percent: "",
  display_value: "5",
  display_unit: "sec",
  countdown_on: false,
  countdown_minutes: "1440",
  ends_at: null,
  is_active: true,
};

function formatLeft(ends: string | null) {
  if (!ends) return null;
  const diff = new Date(ends).getTime() - Date.now();
  if (diff <= 0) return "Tugagan";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d} kun ${h} soat qoldi`;
  if (h > 0) return `${h} soat ${m} daqiqa qoldi`;
  return `${m} daqiqa qoldi`;
}

function PromotionsPage() {
  const promotions = useQuery(promotionsQuery);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMediaUrl(draft?.media_url || null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["promotions"] });
    void queryClient.invalidateQueries({ queryKey: ["menu"] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("promotions").update({ is_active: active }).eq("id", id);
    if (error) {
      toast.error("Yangilanmadi");
      return;
    }
    refresh();
  }

  function openEdit(p: Promotion) {
    const seconds = p.display_seconds ?? 5;
    const useMinutes = seconds >= 60 && seconds % 60 === 0;
    setDraft({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      media_type: (p.media_type as MediaType) ?? "text",
      media_url: p.media_url ?? p.image_url ?? "",
      type: p.type as Draft["type"],
      discount_percent: p.discount_percent ? String(p.discount_percent) : "",
      display_value: String(useMinutes ? seconds / 60 : seconds),
      display_unit: useMinutes ? "min" : "sec",
      countdown_on: !!p.ends_at,
      countdown_minutes: "1440",
      ends_at: p.ends_at,
      is_active: p.is_active,
    });
  }

  async function pickFile(file: File) {
    if (!draft) return;
    const isVideo = draft.media_type === "video";
    if (isVideo && !file.type.startsWith("video/")) {
      toast.error("Video fayl tanlang");
      return;
    }
    if (!isVideo && !file.type.startsWith("image/")) {
      toast.error("Rasm tanlang");
      return;
    }
    if (file.size > (isVideo ? 50 : 8) * 1024 * 1024) {
      toast.error(isVideo ? "Video 50 MB dan katta" : "Rasm 8 MB dan katta");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadMedia(file, "promotions");
      setDraft((d) => (d ? { ...d, media_url: path } : d));
      toast.success("Yuklandi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yuklab bo‘lmadi");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!draft) return;
    if (draft.media_type === "text" && !draft.title.trim()) {
      toast.error("Sarlavhani kiriting");
      return;
    }
    if (draft.media_type !== "text" && !draft.media_url) {
      toast.error(draft.media_type === "video" ? "Video yuklang" : "Rasm yuklang");
      return;
    }

    const rawDisplay = Number(draft.display_value);
    const seconds = Math.min(
      600,
      Math.max(1, Math.round((Number.isFinite(rawDisplay) ? rawDisplay : 5) * (draft.display_unit === "min" ? 60 : 1))),
    );

    let endsAt: string | null = null;
    if (draft.countdown_on) {
      endsAt =
        draft.id && draft.ends_at && new Date(draft.ends_at).getTime() > Date.now()
          ? draft.ends_at
          : new Date(Date.now() + Number(draft.countdown_minutes) * 60000).toISOString();
    }

    setSaving(true);
    const payload = {
      title: draft.title.trim() || "Aksiya",
      description: draft.description.trim() || null,
      media_type: draft.media_type,
      media_url: draft.media_url.trim() || null,
      image_url: draft.media_type === "image" ? draft.media_url.trim() || null : null,
      display_seconds: seconds,
      type: draft.type,
      discount_percent: draft.discount_percent ? Number(draft.discount_percent) : null,
      ends_at: endsAt,
      is_active: draft.is_active,
    };
    const { error } = draft.id
      ? await supabase.from("promotions").update(payload).eq("id", draft.id)
      : await supabase.from("promotions").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Saqlanmadi");
      return;
    }
    toast.success(draft.id ? "Aksiya yangilandi" : "Aksiya qo‘shildi");
    setDraft(null);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) {
      toast.error("O‘chirilmadi");
      return;
    }
    toast.success("Aksiya o‘chirildi");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold text-foreground">Aksiyalar</h1>
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-2.5 text-xs font-bold text-primary-foreground press shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Yangi aksiya
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(promotions.data ?? []).map((p) => {
          const left = formatLeft(p.ends_at);
          const expired = left === "Tugagan";
          return (
            <div key={p.id} className="rounded-3xl glass p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-foreground">{p.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-bold">
                      {MEDIA_TYPES.find((m) => m.value === (p.media_type ?? "text"))?.label}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-bold">
                      {p.display_seconds ?? 5} sek ko‘rinadi
                    </span>
                    {left ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                          expired ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                        }`}
                      >
                        <Timer className="h-3 w-3" />
                        {left}
                      </span>
                    ) : null}
                  </p>
                </div>
                {p.discount_percent ? (
                  <span className="shrink-0 rounded-full gradient-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
                    -{p.discount_percent}%
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => toggle(p.id, !p.is_active)}
                  disabled={expired}
                  className={`flex-1 rounded-2xl py-2.5 text-xs font-bold press disabled:opacity-60 ${
                    p.is_active && !expired
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {expired ? "Muddati tugagan" : p.is_active ? "Faol" : "O‘chirilgan"}
                </button>
                <button
                  aria-label="Tahrirlash"
                  onClick={() => openEdit(p)}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-foreground press"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="O‘chirish"
                  onClick={() => remove(p.id)}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-destructive press"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {(promotions.data ?? []).length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Hozircha aksiya yo‘q.
          </p>
        ) : null}
      </div>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {draft?.id ? "Aksiyani tahrirlash" : "Yangi aksiya"}
            </DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <div>
                <Label>Post turi</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {MEDIA_TYPES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setDraft({ ...draft, media_type: m.value, media_url: "" })}
                      className={`rounded-xl px-2 py-2.5 text-xs font-bold press ${
                        draft.media_type === m.value
                          ? "gradient-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {draft.media_type === "text" ? (
                <>
                  <div>
                    <Label htmlFor="promo-title">Sarlavha</Label>
                    <Input
                      id="promo-title"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promo-desc">Matn</Label>
                    <Textarea
                      id="promo-desc"
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label>{draft.media_type === "video" ? "Video" : "Rasm"}</Label>
                  <div className="mt-1.5 space-y-2 rounded-xl bg-secondary p-3">
                    {previewUrl ? (
                      draft.media_type === "video" ? (
                        <video src={previewUrl} controls className="w-full rounded-lg" />
                      ) : (
                        <img src={previewUrl} alt="Ko‘rinish" className="w-full rounded-lg" />
                      )
                    ) : (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        Fayl tanlanmagan
                      </p>
                    )}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground press disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {draft.media_type === "video" ? "Video yuklash" : "Rasm yuklash"}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={draft.media_type === "video" ? "video/*" : "image/*"}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void pickFile(file);
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Ekranda turish vaqti</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    inputMode="numeric"
                    value={draft.display_value}
                    onChange={(e) => setDraft({ ...draft, display_value: e.target.value })}
                    className="rounded-xl"
                  />
                  <select
                    aria-label="Vaqt birligi"
                    value={draft.display_unit}
                    onChange={(e) =>
                      setDraft({ ...draft, display_unit: e.target.value as "sec" | "min" })
                    }
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="sec">sekund</option>
                    <option value="min">daqiqa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 rounded-xl bg-secondary px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="promo-countdown">Vaqt sanog‘i (masalan 1 kun qoldi)</Label>
                  <Switch
                    id="promo-countdown"
                    checked={draft.countdown_on}
                    onCheckedChange={(v) => setDraft({ ...draft, countdown_on: v })}
                  />
                </div>
                {draft.countdown_on ? (
                  <>
                    <select
                      aria-label="Muddat"
                      value={draft.countdown_minutes}
                      onChange={(e) =>
                        setDraft({ ...draft, countdown_minutes: e.target.value, ends_at: null })
                      }
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                    >
                      {COUNTDOWNS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      {draft.ends_at
                        ? `Hozir: ${formatLeft(draft.ends_at)}. Yangi muddat tanlansa qaytadan boshlanadi.`
                        : "Vaqt saqlangandan boshlab kamayib boradi va tugaganda aksiya avtomatik to‘xtaydi."}
                    </p>
                  </>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="promo-type">Turi</Label>
                  <select
                    id="promo-type"
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="promo-discount">Chegirma %</Label>
                  <Input
                    id="promo-discount"
                    inputMode="numeric"
                    value={draft.discount_percent}
                    onChange={(e) => setDraft({ ...draft, discount_percent: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5">
                <Label htmlFor="promo-active">Faol</Label>
                <Switch
                  id="promo-active"
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-2xl gradient-primary py-3 text-sm font-extrabold text-primary-foreground press shadow-glow disabled:opacity-50"
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

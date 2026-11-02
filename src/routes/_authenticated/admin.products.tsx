import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { categoriesQuery, productsQuery, type Product } from "@/lib/menu";
import { supabase } from "@/integrations/supabase/client";
import { formatSum } from "@/lib/format";
import { productImage } from "@/lib/food-images";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

const PROMO_PRESETS = ["+1 Pepsi", "+1 Cola", "+1 Fri", "1+1", "Sovg‘a ichimlik"];

type FormState = {
  id: string | null;
  name: string;
  description: string;
  categoryId: string;
  price: string;
  oldPrice: string;
  costPrice: string;
  badge: string;
  imageUrl: string;
  isNew: boolean;
  isPopular: boolean;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  description: "",
  categoryId: "",
  price: "",
  oldPrice: "",
  costPrice: "",
  badge: "",
  imageUrl: "",
  isNew: false,
  isPopular: false,
};

function toForm(p: Product): FormState {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    categoryId: p.category_id ?? "",
    price: String(Number(p.price)),
    oldPrice: p.old_price ? String(Number(p.old_price)) : "",
    costPrice: String(Number(p.cost_price)),
    badge: p.badge ?? "",
    imageUrl: p.image_url ?? "",
    isNew: p.is_new,
    isPopular: p.is_popular,
  };
}

function ProductsPage() {
  const products = useQuery(productsQuery);
  const categories = useQuery(categoriesQuery);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  }

  async function toggle(id: string, visible: boolean) {
    const { error } = await supabase.from("products").update({ is_visible: visible }).eq("id", id);
    if (error) {
      toast.error("Yangilanmadi");
      return;
    }
    toast.success(visible ? "Ko‘rinadi" : "Yashirildi");
    refresh();
  }

  async function removeProduct(id: string) {
    if (!window.confirm("Mahsulot o‘chirilsinmi?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("O‘chirilmadi");
      return;
    }
    toast.success("O‘chirildi");
    refresh();
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data, error: signError } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signError || !data) throw signError ?? new Error("URL olinmadi");
      setForm((f) => (f ? { ...f, imageUrl: data.signedUrl } : f));
      toast.success("Rasm yuklandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rasm yuklanmadi");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Mahsulot nomini yozing");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Narxni to‘g‘ri kiriting");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.categoryId || null,
      price,
      old_price: form.oldPrice ? Number(form.oldPrice) : null,
      cost_price: form.costPrice ? Number(form.costPrice) : 0,
      badge: form.badge.trim() || null,
      image_url: form.imageUrl.trim() || null,
      is_new: form.isNew,
      is_popular: form.isPopular,
    };

    setSaving(true);
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Saqlandi" : "Yangi mahsulot qo‘shildi");
    setForm(null);
    refresh();
  }

  const preview = form?.imageUrl || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-foreground">Mahsulotlar</h2>
        <button
          onClick={() => setForm(emptyForm)}
          className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground press"
        >
          <Plus className="h-4 w-4" />
          Yangi mahsulot
        </button>
      </div>

      {form ? (
        <section className="rounded-3xl glass p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-extrabold text-foreground">
              {form.id ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
            </p>
            <button
              aria-label="Yopish"
              onClick={() => setForm(null)}
              className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Rasm — tepada */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative block w-full overflow-hidden rounded-3xl bg-secondary"
          >
            {preview ? (
              <img src={preview} alt="Mahsulot rasmi" className="h-52 w-full object-cover" />
            ) : (
              <span className="flex h-52 w-full flex-col items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
                <ImagePlus className="h-7 w-7" />
                {uploading ? "Yuklanmoqda..." : "Rasm yuklash uchun bosing"}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
              e.target.value = "";
            }}
          />

          {/* Aksiya — rasm tagida, tepa qismda */}
          <div className="mt-4">
            <Label>Aksiya (masalan: +1 Pepsi)</Label>
            <input
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              placeholder="Ixtiyoriy"
              className="mt-1.5 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {PROMO_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, badge: form.badge === p ? "" : p })}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold press ${
                    form.badge === p
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Nomi — pastida */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nomi">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Masalan: Klassik Lavash"
                className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Kategoriya">
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Kategoriyasiz</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tavsif">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ixtiyoriy"
                className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Narx (so‘m)">
              <input
                value={form.price}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Chegirmagacha narx (ixtiyoriy)">
              <input
                value={form.oldPrice}
                inputMode="numeric"
                placeholder="Bo‘sh qoldirsangiz chegirma ko‘rinmaydi"
                onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Tannarx (ixtiyoriy)">
              <input
                value={form.costPrice}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Toggle
              active={form.isNew}
              label="Yangi"
              onClick={() => setForm({ ...form, isNew: !form.isNew })}
            />
            <Toggle
              active={form.isPopular}
              label="Ommabop"
              onClick={() => setForm({ ...form, isPopular: !form.isPopular })}
            />
          </div>

          <button
            onClick={save}
            disabled={saving || uploading}
            className="mt-5 w-full rounded-2xl gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground press disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </section>
      ) : null}

      <div className="space-y-2">
        {(products.data ?? []).map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl glass p-3">
            <img
              src={productImage(p.image_url, null, i)}
              alt={p.name}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {p.name}
                {p.badge ? (
                  <span className="ml-2 rounded-full gradient-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {p.badge}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatSum(p.price)}
                {p.old_price ? ` · eski ${formatSum(p.old_price)}` : ""} · tannarx{" "}
                {formatSum(p.cost_price)}
              </p>
            </div>
            <button
              aria-label="Tahrirlash"
              onClick={() => setForm(toForm(p))}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground press"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              aria-label="O‘chirish"
              onClick={() => removeProduct(p.id)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-destructive press"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggle(p.id, !p.is_visible)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold press ${
                p.is_visible
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {p.is_visible ? "Faol" : "Yashirin"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted-foreground">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-bold press ${
        active ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

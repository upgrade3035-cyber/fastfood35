import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { settingsQuery } from "@/lib/menu";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useQuery(settingsQuery);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    restaurant_name: "",
    phone: "",
    address: "",
    working_hours: "",
    logo_url: "",
  });
  const logoPreview = useMediaUrl(form.logo_url || null);

  useEffect(() => {
    if (!settings.data) return;
    setForm({
      restaurant_name: settings.data.restaurant_name ?? "",
      phone: settings.data.phone ?? "",
      address: settings.data.address ?? "",
      working_hours: settings.data.working_hours ?? "",
      logo_url: settings.data.logo_url ?? "",
    });
  }, [settings.data]);

  async function pickLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm yuklang");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm 5 MB dan katta bo‘lmasin");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadMedia(file, "logo");
      setForm((f) => ({ ...f, logo_url: path }));
      toast.success("Logo yuklandi — saqlashni unutmang");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yuklab bo‘lmadi");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .update({
        restaurant_name: form.restaurant_name.trim() || "Lazzat Fast Food",
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        working_hours: form.working_hours.trim() || null,
        logo_url: form.logo_url.trim() || null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saqlandi");
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/`;
  const qrBoxRef = useRef<HTMLDivElement | null>(null);

  async function downloadQrPdf() {
    const canvas = qrBoxRef.current?.querySelector("canvas");
    if (!canvas) {
      toast.error("QR kod topilmadi");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const size = 110;
      const x = (pageWidth - size) / 2;
      const name = form.restaurant_name || "Lazzat Fast Food";

      pdf.setFontSize(22);
      pdf.text(name, pageWidth / 2, 30, { align: "center" });
      pdf.setFontSize(13);
      pdf.text("Menyuni ochish uchun QR kodni skanerlang", pageWidth / 2, 40, {
        align: "center",
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, 55, size, size);
      pdf.setFontSize(11);
      pdf.text(url, pageWidth / 2, 55 + size + 12, { align: "center" });
      if (form.phone) {
        pdf.text(form.phone, pageWidth / 2, 55 + size + 22, { align: "center" });
      }
      pdf.save("qr-kod.pdf");
      toast.success("PDF yuklab olindi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF yaratib bo‘lmadi");
    }
  }



  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl glass p-5">
        <h2 className="text-sm font-extrabold text-foreground">Brend va ma’lumotlar</h2>
        <div className="mt-4 space-y-3">
          <Field
            label="Ilova / brend nomi"
            value={form.restaurant_name}
            onChange={(v) => setForm({ ...form, restaurant_name: v })}
          />

          <div>
            <span className="text-xs font-semibold text-muted-foreground">Asosiy sayt logosi</span>
            <div className="mt-1.5 flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-background">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-1 flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground press disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Logo yuklash
                </button>
                {form.logo_url ? (
                  <button
                    onClick={() => setForm({ ...form, logo_url: "" })}
                    className="inline-flex items-center gap-2 rounded-xl bg-background px-3 py-2 text-xs font-bold text-destructive press"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    O‘chirish
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void pickLogo(file);
                }}
              />
            </div>
          </div>

          <Field
            label="Telefon"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <Field
            label="Manzil"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
          />
          <Field
            label="Ish vaqti"
            value={form.working_hours}
            onChange={(v) => setForm({ ...form, working_hours: v })}
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full rounded-2xl gradient-primary py-3 text-sm font-extrabold text-primary-foreground press disabled:opacity-50"
        >
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </section>


      <section className="rounded-3xl glass p-5">
        <h2 className="text-sm font-extrabold text-foreground">Yagona QR kod</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Barcha stollar uchun bitta o‘zgarmas QR kod — havola hech qachon o‘zgarmaydi. Mijoz
          skanerlaganda menyu darhol ochiladi, stol raqamini buyurtma berayotganda kiritadi.
        </p>
        <div ref={qrBoxRef} className="mt-4 grid place-items-center rounded-3xl bg-white p-5">
          <QRCodeCanvas value={url || "/"} size={220} level="H" />
        </div>
        <p className="mt-3 break-all text-center text-xs text-muted-foreground">{url}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => window.print()}
            className="rounded-2xl bg-secondary py-3 text-sm font-extrabold text-foreground press"
          >
            QR kodni chop etish
          </button>
          <button
            onClick={downloadQrPdf}
            className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-extrabold text-primary-foreground press"
          >
            <Download className="h-4 w-4" />
            PDF yuklab olish
          </button>
        </div>

      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

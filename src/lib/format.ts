export function formatSum(value: number | string | null | undefined) {
  const n = Math.round(Number(value ?? 0));
  // Deterministic grouping (no Intl locale differences between server & client)
  const grouped = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${n < 0 ? "-" : ""}${grouped} so'm`;
}


export function formatShort(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln`;
  if (n >= 1_000) return `${Math.round(n / 1000)} ming`;
  return String(Math.round(n));
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Yangi",
  accepted: "Qabul qilindi",
  preparing: "Tayyorlanmoqda",
  ready: "Tayyor",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

/** Mijozga ko'rinadigan holat: yetkazilgunicha "Yetkazilmoqda" */
export function customerStatusLabel(status: string, orderType?: string | null) {
  if (status === "cancelled") return "Bekor qilindi";
  if (status === "delivered") return "Yetkazildi";
  return orderType === "delivery" ? "Yetkazilmoqda" : "Tayyorlanmoqda";
}

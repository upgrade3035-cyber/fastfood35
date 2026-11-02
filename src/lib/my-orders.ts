export type SavedOrder = {
  id: string;
  orderNo: number;
  createdAt: string;
  orderType: "dine_in" | "delivery";
};

const KEY = "lazzat_my_orders_v1";

export function readMyOrders(): SavedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMyOrder(order: SavedOrder) {
  if (typeof window === "undefined") return;
  try {
    const next = [order, ...readMyOrders().filter((o) => o.id !== order.id)].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("lazzat-orders-changed"));
  } catch {
    /* ignore */
  }
}

export function clearMyOrders() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("lazzat-orders-changed"));
}

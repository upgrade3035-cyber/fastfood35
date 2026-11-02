import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  cost: number;
  image: string;
  badge?: string | null;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  tableNumber: string;
  notes: string;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setTableNumber: (v: string) => void;
  setNotes: (v: string) => void;
  count: number;
  total: number;
};

const CartContext = createContext<CartState | null>(null);
const KEY = "lazzat_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          lines?: CartLine[];
          tableNumber?: string;
          notes?: string;
        };
        setLines(parsed.lines ?? []);
        setTableNumber(parsed.tableNumber ?? "");
        setNotes(parsed.notes ?? "");
      }
      const params = new URLSearchParams(window.location.search);
      const table = params.get("table") ?? params.get("stol");
      if (table) setTableNumber(table);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ lines, tableNumber, notes }));
    } catch {
      /* ignore */
    }
  }, [lines, tableNumber, notes]);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const total = lines.reduce((s, l) => s + l.quantity * l.price, 0);
    return {
      lines,
      tableNumber,
      notes,
      count,
      total,
      add: (line, qty = 1) =>
        setLines((prev) => {
          const found = prev.find((l) => l.productId === line.productId);
          if (found) {
            return prev.map((l) =>
              l.productId === line.productId ? { ...l, quantity: l.quantity + qty } : l,
            );
          }
          return [...prev, { ...line, quantity: qty }];
        }),
      setQty: (productId, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.productId !== productId)
            : prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)),
        ),
      remove: (productId) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => {
        setLines([]);
        setNotes("");
      },
      setTableNumber,
      setNotes,
    };
  }, [lines, tableNumber, notes]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

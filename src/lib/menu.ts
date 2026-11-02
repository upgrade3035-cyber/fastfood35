import { getMenu } from "@/lib/menu.functions";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Category = Tables<"categories">;
export type Product = Tables<"products">;
export type Promotion = Tables<"promotions">;
export type Settings = Tables<"settings">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export const promotionsQuery = queryOptions({
  queryKey: ["promotions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return data as (Order & { order_items: OrderItem[] })[];
  },
});

export const expensesQuery = queryOptions({
  queryKey: ["expenses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("spent_on", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export type NewOrderInput = {
  tableNumber: string;
  notes?: string;
  customerName?: string;
  source: "qr" | "manual";
  lines: { productId: string; name: string; price: number; cost: number; quantity: number }[];
};

export async function placeOrder(input: NewOrderInput) {
  const subtotal = input.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      table_number: input.tableNumber,
      notes: input.notes || null,
      customer_name: input.customerName || null,
      source: input.source,
      subtotal,
      total: subtotal,
    })
    .select("id, order_no")
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.lines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      product_name: l.name,
      quantity: l.quantity,
      unit_price: l.price,
      unit_cost: l.cost,
    })),
  );
  if (itemsError) throw itemsError;
  return order;
}

export const menuQuery = queryOptions({
  queryKey: ["menu"],
  queryFn: () => getMenu(),
  staleTime: 5 * 60 * 1000,
});

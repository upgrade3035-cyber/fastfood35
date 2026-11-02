import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderSchema = z.object({
  orderType: z.enum(["dine_in", "delivery"]).default("dine_in"),
  tableNumber: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  customerName: z.string().trim().max(120).optional().nullable(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
});

const myOrdersSchema = z.object({
  ids: z.array(z.string().uuid()).max(50),
});

/** Public menu payload used by the storefront. Single round trip, SSR friendly. */
export const getMenu = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicSupabase } = await import("./supabase-public.server");
  const supabase = createPublicSupabase();

  const [categories, products, promotions, settings] = await Promise.all([
    supabase.from("categories").select("*").eq("is_visible", true).order("sort_order"),
    supabase.from("products").select("*").eq("is_visible", true).order("sort_order"),
    supabase.from("promotions").select("*").eq("is_active", true).order("created_at"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return {
    categories: categories.data ?? [],
    products: products.data ?? [],
    promotions: promotions.data ?? [],
    settings: settings.data ?? null,
  };
});

/** Guests place orders through here: prices are re-read server side. */
export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [...new Set(data.lines.map((l) => l.productId))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, cost_price, is_visible")
      .in("id", ids);
    if (productsError) throw new Error(productsError.message);

    const rows = data.lines.flatMap((line) => {
      const product = products?.find((p) => p.id === line.productId);
      if (!product || !product.is_visible) return [];
      return [
        {
          product_id: product.id,
          product_name: product.name,
          quantity: line.quantity,
          unit_price: Number(product.price),
          unit_cost: Number(product.cost_price),
        },
      ];
    });
    if (!rows.length) throw new Error("Mahsulotlar topilmadi");

    const subtotal = rows.reduce((sum, r) => sum + r.unit_price * r.quantity, 0);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        table_number:
          data.orderType === "delivery" ? "Yetkazib berish" : (data.tableNumber ?? "").trim(),
        order_type: data.orderType,
        address: data.orderType === "delivery" ? (data.address ?? null) : null,
        latitude: data.orderType === "delivery" ? (data.latitude ?? null) : null,
        longitude: data.orderType === "delivery" ? (data.longitude ?? null) : null,
        customer_phone: data.phone || null,
        notes: data.notes || null,
        customer_name: data.customerName || null,
        source: "qr",
        subtotal,
        total: subtotal,
      })
      .select("id, order_no")
      .single();
    if (error) throw new Error(error.message);

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(rows.map((r) => ({ ...r, order_id: order.id })));
    if (itemsError) throw new Error(itemsError.message);

    return { id: order.id, orderNo: Number(order.order_no) };
  });

/** Guests read back their own orders by the ids stored on their device. */
export const getMyOrders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => myOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.ids.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_no, status, order_type, table_number, address, latitude, longitude, notes, total, created_at, order_items(id, product_name, quantity, unit_price)",
      )
      .in("id", data.ids)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return orders ?? [];
  });

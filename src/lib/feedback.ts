import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Feedback = Tables<"feedback">;

export const feedbackQuery = queryOptions({
  queryKey: ["feedback"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  },
});

export async function submitFeedback(input: {
  name?: string;
  phone?: string;
  rating?: number;
  message: string;
}) {
  const { error } = await supabase.from("feedback").insert({
    name: input.name?.trim() || null,
    phone: input.phone?.trim() || null,
    rating: input.rating ?? null,
    message: input.message.trim(),
  });
  if (error) throw error;
}

export async function markFeedbackRead(id: string, isRead: boolean) {
  const { error } = await supabase.from("feedback").update({ is_read: isRead }).eq("id", id);
  if (error) throw error;
}

export async function deleteFeedback(id: string) {
  const { error } = await supabase.from("feedback").delete().eq("id", id);
  if (error) throw error;
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "super_admin" | "manager" | "cashier" | "kitchen" | "waiter";

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super admin",
  manager: "Menejer",
  cashier: "Kassir",
  kitchen: "Oshxona",
  waiter: "Ofitsiant",
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("username, full_name").eq("id", user.id).maybeSingle(),
      ]);
      return {
        userId: user.id,
        username: profile?.username ?? user.email?.split("@")[0] ?? "xodim",
        fullName: profile?.full_name ?? null,
        roles: (roles ?? []).map((r) => r.role as StaffRole),
      };
    },
  });
}

export function hasAny(roles: StaffRole[] | undefined, allowed: StaffRole[]) {
  return (roles ?? []).some((r) => allowed.includes(r));
}

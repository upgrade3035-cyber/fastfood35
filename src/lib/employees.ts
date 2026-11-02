import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Employee = Tables<"employees">;

export const employeesQuery = queryOptions({
  queryKey: ["employees"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
});

/** Xodimlarning kunlik maosh ulushi (oylik / 30) */
export function dailySalaryTotal(employees: Employee[]) {
  return employees
    .filter((e) => e.is_active)
    .reduce(
      (sum, e) =>
        sum +
        (e.salary_period === "daily" ? Number(e.salary_amount) : Number(e.salary_amount) / 30),
      0,
    );
}

/** Xodimlarning oylik maosh jamisi (kunlik * 30) */
export function monthlySalaryTotal(employees: Employee[]) {
  return employees
    .filter((e) => e.is_active)
    .reduce(
      (sum, e) =>
        sum +
        (e.salary_period === "monthly" ? Number(e.salary_amount) : Number(e.salary_amount) * 30),
      0,
    );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];
export type Update<T extends keyof Tables> = Tables[T]["Update"];

export type Site = Row<"sites">;
export type Programme = Row<"programmes">;
export type PricingPlan = Row<"pricing_plans">;
export type ScheduleBlock = Row<"recurring_schedule_blocks">;
export type ClassRow = Row<"classes">;
export type TutorRow = Row<"tutors">;
export type ParentRow = Row<"parents">;
export type StudentRow = Row<"students">;
export type EnrolmentRow = Row<"class_enrolments">;
export type SessionRow = Row<"sessions">;
export type AttendanceRow = Row<"student_attendance">;
export type SignInRow = Row<"tutor_signins">;
export type ReviewRow = Row<"lesson_reviews">;
export type EarningRow = Row<"tutor_earnings">;
export type PaymentRequestRow = Row<"payment_requests">;
export type SubscriptionRow = Row<"client_subscriptions">;
export type ClientPaymentRow = Row<"client_payments">;
export type HomeworkRow = Row<"homework_items">;
export type ProgressRow = Row<"progress_records">;

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Loosely typed handle: table names are generic here, results are cast back to generated row types. */
const sb = supabase as any;

async function selectAll<T extends keyof Tables>(table: T, order?: string): Promise<Row<T>[]> {
  const query = sb.from(table as string).select("*");
  const { data, error } = await (order ? query.order(order) : query);
  if (error) throw error;
  return (data ?? []) as Row<T>[];
}

/** Generic list hook for any operational table. */
export function useTable<T extends keyof Tables>(table: T, order?: string) {
  return useQuery({
    queryKey: [table, order ?? "default"],
    queryFn: () => selectAll(table, order),
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return async (...tables: (keyof Tables)[]) => {
    if (tables.length === 0) {
      await qc.invalidateQueries();
      return;
    }
    await Promise.all(tables.map((t) => qc.invalidateQueries({ queryKey: [t] })));
  };
}

/** Insert / update / delete helpers wrapped as mutations. */
export function useUpsert<T extends keyof Tables>(table: T, invalidates: (keyof Tables)[] = []) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: Insert<T> | Insert<T>[]) => {
      const { data, error } = await sb
        .from(table as string)
        .insert(values as never)
        .select();
      if (error) throw error;
      return data as Row<T>[];
    },
    onSuccess: async () => invalidate(table, ...invalidates),
  });
}

export function useUpdateRow<T extends keyof Tables>(table: T, invalidates: (keyof Tables)[] = []) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Update<T> }) => {
      const { data, error } = await sb
        .from(table as string)
        .update(values as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Row<T>;
    },
    onSuccess: async () => invalidate(table, ...invalidates),
  });
}

export function useDeleteRow<T extends keyof Tables>(table: T, invalidates: (keyof Tables)[] = []) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await sb
        .from(table as string)
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Nothing was deleted. Check your access and try again.");
    },
    onSuccess: async () => invalidate(table, ...invalidates),
  });
}

// ---------- shared helpers ----------

export const fullName = (
  r: { first_name: string; last_name?: string | null } | null | undefined,
) => (r ? [r.first_name, r.last_name].filter(Boolean).join(" ") : "—");

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));

export const num = (v: unknown) => Number(v ?? 0);

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "—");

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const weekdayOf = (isoDate: string) =>
  WEEKDAYS[(new Date(`${isoDate}T00:00:00`).getDay() + 6) % 7] as string;

export const DEMO_DATE = "2026-09-12"; // Saturday 12 September 2026

export const prettyDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function capacityTone(enrolled: number, capacity: number) {
  if (capacity <= 0) return "blue" as const;
  if (enrolled > capacity) return "pink" as const;
  if (enrolled === capacity) return "amber" as const;
  if (enrolled / capacity >= 0.8) return "amber" as const;
  return "green" as const;
}

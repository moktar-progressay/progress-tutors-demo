import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CatalogueName = "teaching_levels" | "teaching_subjects" | "site_rooms";
export type CatalogueItem = { id: string; name: string; active: boolean; site_id?: string; floor?: string | null; capacity?: number | null };

// The catalogue tables are introduced in a new migration; generated Supabase types will be
// refreshed separately. Keep the runtime queries isolated here in the meantime.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => Promise<{ data: CatalogueItem[] | null; error: Error | null }>;
    insert: (values: Record<string, unknown>) => Promise<{ error: Error | null }>;
    update: (values: Record<string, unknown>) => { eq: (field: string, value: string) => Promise<{ error: Error | null }> };
    delete: () => { eq: (field: string, value: string) => Promise<{ error: Error | null }> };
  };
};

export function useCatalogue(table: CatalogueName) {
  return useQuery({
    queryKey: ["teaching-configuration", table],
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*");
      if (error) throw error;
      return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
    },
  });
}

export function useCatalogueMutation(table: CatalogueName) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (action:
      | { type: "create"; values: Record<string, unknown> }
      | { type: "update"; id: string; values: Record<string, unknown> }
      | { type: "delete"; id: string }
    ) => {
      const result = action.type === "create"
        ? await db.from(table).insert(action.values)
        : action.type === "update"
          ? await db.from(table).update(action.values).eq("id", action.id)
          : await db.from(table).delete().eq("id", action.id);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["teaching-configuration", table] });
    },
  });
}

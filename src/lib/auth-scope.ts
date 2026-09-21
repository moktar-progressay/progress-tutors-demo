import { useQuery } from "@tanstack/react-query";
import { useActingId } from "@/lib/acting";
import { useTable } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

type DatabaseRole = "admin" | "tutor" | null;

export function useCurrentAccess() {
  return useQuery({
    queryKey: ["current-access"],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return { userId: null, email: null, role: null as DatabaseRole };

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;

      return {
        userId: user.id,
        email: user.email ?? null,
        role: (data?.role === "admin" || data?.role === "tutor" ? data.role : null) as DatabaseRole,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Resolves the signed-in tutor. Administrators may retain a browser-only tutor
 * choice for previewing the tutor experience; real tutor accounts never see
 * or control that selector.
 */
export function useTutorScope() {
  const access = useCurrentAccess();
  const tutors = useTable("tutors", "first_name");
  const [previewTutorId, setPreviewTutorId] = useActingId("tutor");
  const rows = tutors.data ?? [];
  const signedInTutor = rows.find(
    (tutor) =>
      tutor.user_id === access.data?.userId ||
      (access.data?.email && tutor.email?.toLowerCase() === access.data.email.toLowerCase()),
  );
  const isAdminPreview = access.data?.role === "admin";
  const tutorId = isAdminPreview
    ? previewTutorId || signedInTutor?.id || rows[0]?.id || ""
    : signedInTutor?.id || "";

  return {
    tutorId,
    tutor: rows.find((tutor) => tutor.id === tutorId),
    tutors: rows,
    isAdminPreview,
    setPreviewTutorId,
    isLoading: access.isLoading || tutors.isLoading,
  };
}

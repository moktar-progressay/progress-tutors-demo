import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Cloud, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type SyncRun = {
  status: "running" | "succeeded" | "failed" | "partial";
  started_at: string;
  completed_at: string | null;
  counts: Record<string, number> | null;
  error_message: string | null;
};

type SyncStatus = {
  configured: boolean;
  latest: SyncRun | null;
  unmatched: number;
};

async function invokeZoho(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("zoho-sync", { body });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data;
}

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) return "Not synchronised yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export function ZohoSyncPanel() {
  const queryClient = useQueryClient();
  const status = useQuery<SyncStatus>({
    queryKey: ["zoho-sync-status"],
    queryFn: () => invokeZoho({ action: "status" }),
    retry: false,
    staleTime: 60_000,
  });
  const sync = useMutation({
    mutationFn: () => invokeZoho({ action: "sync" }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["zoho-sync-status"] }),
        queryClient.invalidateQueries({ queryKey: ["billing_invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["billing_plans"] }),
        queryClient.invalidateQueries({ queryKey: ["client_subscriptions"] }),
      ]);
      const count = Number(result?.counts?.invoices ?? 0);
      toast.success(`Zoho synchronised. ${count} invoices checked.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Zoho sync failed"),
  });

  const data = status.data;
  const latest = data?.latest;
  const connected = Boolean(data?.configured);
  const healthy = latest?.status === "succeeded";
  const unavailable = status.isError;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Cloud className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-extrabold">Zoho Billing</h2>
            {unavailable || latest?.status === "failed" ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Needs attention
              </span>
            ) : healthy ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Synced
              </span>
            ) : (
              <span className="text-xs font-bold text-muted-foreground">
                {connected ? "Ready" : "Setup required"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {unavailable
              ? "The secure Zoho service has not been deployed yet."
              : connected
                ? `Last sync: ${formatTimestamp(latest?.completed_at ?? latest?.started_at)}`
                : "Add the Zoho connection details to start read-only synchronisation."}
            {data?.unmatched ? ` · ${data.unmatched} records need matching` : ""}
          </p>
          {latest?.error_message ? (
            <p className="mt-1 truncate text-xs text-destructive" title={latest.error_message}>
              {latest.error_message}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        disabled={!connected || unavailable || sync.isPending || latest?.status === "running"}
        onClick={() => sync.mutate()}
      >
        <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
        {sync.isPending ? "Synchronising…" : "Sync now"}
      </Button>
    </section>
  );
}

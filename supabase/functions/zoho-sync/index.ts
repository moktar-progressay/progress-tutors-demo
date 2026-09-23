import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

type JsonRecord = Record<string, unknown>;
type EntityType = "customer" | "plan" | "subscription" | "invoice" | "payment";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const env = (name: string) => Deno.env.get(name)?.trim() ?? "";

function value(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const candidate = record[key];
    if (candidate !== undefined && candidate !== null && candidate !== "") return candidate;
  }
  return null;
}
function textValue(record: JsonRecord, ...keys: string[]) {
  const candidate = value(record, ...keys);
  return candidate === null ? null : String(candidate);
}
function numberValue(record: JsonRecord, ...keys: string[]) {
  const candidate = Number(value(record, ...keys) ?? 0);
  return Number.isFinite(candidate) ? candidate : 0;
}
function invoiceStatus(status: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "draft":
      return "draft";
    case "paid":
    case "closed":
      return "paid";
    case "overdue":
      return "overdue";
    case "partially_paid":
    case "part_paid":
      return "part_paid";
    case "void":
    case "cancelled":
      return "cancelled";
    default:
      return "issued";
  }
}
function billingFrequency(interval: string | null) {
  switch ((interval ?? "").toLowerCase()) {
    case "week":
    case "weeks":
    case "weekly":
      return "weekly";
    case "month":
    case "months":
    case "monthly":
      return "monthly";
    case "one_off":
      return "one_off";
    default:
      return "manual";
  }
}

async function authenticate(req: Request, admin: ReturnType<typeof createClient>) {
  const scheduledSecret = env("ZOHO_SYNC_SECRET");
  if (scheduledSecret && req.headers.get("x-sync-secret") === scheduledSecret) {
    return { userId: null, trigger: "scheduled" as const };
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid session");
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Administrator access required");
  return { userId: data.user.id, trigger: "manual" as const };
}

async function accessToken() {
  const required = [
    "ZOHO_CLIENT_ID",
    "ZOHO_CLIENT_SECRET",
    "ZOHO_REFRESH_TOKEN",
    "ZOHO_ORGANIZATION_ID",
    "ZOHO_API_DOMAIN",
  ];
  const missing = required.filter((name) => !env(name));
  if (missing.length) throw new Error(`Zoho connection not configured: ${missing.join(", ")}`);
  const accountsUrl = env("ZOHO_ACCOUNTS_URL") || "https://accounts.zoho.eu";
  const body = new URLSearchParams({
    refresh_token: env("ZOHO_REFRESH_TOKEN"),
    client_id: env("ZOHO_CLIENT_ID"),
    client_secret: env("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const response = await fetch(`${accountsUrl}/oauth/v2/token`, { method: "POST", body });
  const payload = (await response.json()) as JsonRecord;
  if (!response.ok || !payload.access_token) {
    throw new Error(`Zoho authentication failed: ${String(payload.error ?? response.status)}`);
  }
  return String(payload.access_token);
}

async function fetchAll(token: string, path: string, collection: string) {
  const rows: JsonRecord[] = [];
  const base = env("ZOHO_API_DOMAIN").replace(/\/$/, "");
  for (let page = 1; page <= 100; page += 1) {
    const url = new URL(`${base}/billing/v1/${path}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "200");
    const response = await fetch(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "X-com-zoho-subscriptions-organizationid": env("ZOHO_ORGANIZATION_ID"),
      },
    });
    const payload = (await response.json()) as JsonRecord;
    if (!response.ok || Number(payload.code ?? 0) !== 0) {
      throw new Error(
        `Zoho ${collection} request failed: ${String(payload.message ?? response.status)}`,
      );
    }
    const batch = Array.isArray(payload[collection]) ? (payload[collection] as JsonRecord[]) : [];
    rows.push(...batch);
    const context = payload.page_context as JsonRecord | undefined;
    if (!context?.has_more_page || batch.length === 0) break;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const supabaseUrl = env("SUPABASE_URL");
  const secretKey = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) return json({ error: "Server configuration is incomplete" }, 500);
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

  let actor: Awaited<ReturnType<typeof authenticate>>;
  try {
    actor = await authenticate(req, admin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unauthorised" }, 401);
  }

  const requestBody = (await req.json().catch(() => ({}))) as JsonRecord;
  if (requestBody.action === "status") {
    const [{ data: latest }, { count: unmatched }] = await Promise.all([
      admin
        .from("zoho_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("zoho_external_records")
        .select("id", { count: "exact", head: true })
        .eq("sync_status", "unmatched"),
    ]);
    return json({
      configured: Boolean(env("ZOHO_REFRESH_TOKEN")),
      latest,
      unmatched: unmatched ?? 0,
    });
  }

  const { data: run, error: runError } = await admin
    .from("zoho_sync_runs")
    .insert({ trigger_source: actor.trigger, requested_by: actor.userId, status: "running" })
    .select("id")
    .single();
  if (runError || !run) return json({ error: "Could not create the sync audit record" }, 500);

  try {
    const token = await accessToken();
    const [customers, plans, subscriptions, invoices, payments] = await Promise.all([
      fetchAll(token, "customers", "customers"),
      fetchAll(token, "plans", "plans"),
      fetchAll(token, "subscriptions", "subscriptions"),
      fetchAll(token, "invoices", "invoices"),
      fetchAll(token, "payments", "payments"),
    ]);
    const now = new Date().toISOString();
    const { data: parents } = await admin
      .from("parents")
      .select("id, external_customer_id")
      .not("external_customer_id", "is", null);
    const parentByCustomer = new Map(
      (parents ?? []).map((parent) => [String(parent.external_customer_id), String(parent.id)]),
    );

    const sources: Array<{ type: EntityType; rows: JsonRecord[]; idKeys: string[] }> = [
      { type: "customer", rows: customers, idKeys: ["customer_id"] },
      { type: "plan", rows: plans, idKeys: ["plan_code", "plan_id"] },
      { type: "subscription", rows: subscriptions, idKeys: ["subscription_id"] },
      { type: "invoice", rows: invoices, idKeys: ["invoice_id"] },
      { type: "payment", rows: payments, idKeys: ["payment_id"] },
    ];
    const snapshots = sources.flatMap(({ type, rows, idKeys }) =>
      rows
        .map((record) => {
          const externalId = textValue(record, ...idKeys);
          const customerId = type === "customer" ? externalId : textValue(record, "customer_id");
          const parentId = customerId ? (parentByCustomer.get(customerId) ?? null) : null;
          return {
            entity_type: type,
            external_id: externalId,
            external_customer_id: customerId,
            parent_id: parentId,
            sync_status: parentId || type === "plan" ? "matched" : "unmatched",
            payload: record,
            source_updated_at: textValue(record, "updated_time", "last_modified_time"),
            last_seen_at: now,
            last_error: null,
          };
        })
        .filter((row) => row.external_id),
    );
    for (let index = 0; index < snapshots.length; index += 250) {
      const { error } = await admin
        .from("zoho_external_records")
        .upsert(snapshots.slice(index, index + 250), { onConflict: "entity_type,external_id" });
      if (error) throw error;
    }

    if (plans.length) {
      const rows = plans
        .map((plan) => ({
          zoho_plan_code: textValue(plan, "plan_code", "plan_id"),
          name: textValue(plan, "name") ?? "Zoho plan",
          description: textValue(plan, "description"),
          unit_amount: numberValue(plan, "recurring_price", "price"),
          currency: textValue(plan, "currency_code") ?? "GBP",
          billing_frequency: billingFrequency(textValue(plan, "interval_unit", "interval")),
          active: (textValue(plan, "status") ?? "active").toLowerCase() === "active",
          source: "Zoho Billing live sync",
          updated_at: now,
        }))
        .filter((plan) => plan.zoho_plan_code);
      const { error } = await admin
        .from("billing_plans")
        .upsert(rows, { onConflict: "zoho_plan_code" });
      if (error) throw error;
    }

    const matchedInvoices = invoices
      .flatMap((invoice) => {
        const customerId = textValue(invoice, "customer_id");
        const parentId = customerId ? parentByCustomer.get(customerId) : null;
        if (!parentId) return [];
        const total = numberValue(invoice, "total");
        const balance = numberValue(invoice, "balance");
        return [
          {
            parent_id: parentId,
            invoice_number:
              textValue(invoice, "number", "invoice_number") ??
              `ZOHO-${textValue(invoice, "invoice_id")}`,
            issue_date: textValue(invoice, "invoice_date", "date"),
            due_date: textValue(invoice, "due_date"),
            currency: textValue(invoice, "currency_code") ?? "GBP",
            status: invoiceStatus(textValue(invoice, "status")),
            subtotal: numberValue(invoice, "sub_total", "subtotal") || total,
            discount_total: numberValue(invoice, "discount_total"),
            tax_total: numberValue(invoice, "tax_total"),
            total,
            amount_paid: Math.max(total - balance, 0),
            balance_due: balance,
            source: "Zoho Billing live sync",
            external_provider: "zoho",
            external_customer_id: customerId,
            external_invoice_id: textValue(invoice, "invoice_id"),
            issued_at: textValue(invoice, "created_time"),
            billing_last_synced_at: now,
            updated_at: now,
          },
        ];
      })
      .filter((invoice) => invoice.external_invoice_id);
    if (matchedInvoices.length) {
      const { error } = await admin
        .from("billing_invoices")
        .upsert(matchedInvoices, { onConflict: "external_invoice_id" });
      if (error) throw error;
    }

    const matchedSubscriptions = subscriptions
      .flatMap((subscription) => {
        const customerId = textValue(subscription, "customer_id");
        const parentId = customerId ? parentByCustomer.get(customerId) : null;
        if (!parentId) return [];
        return [
          {
            parent_id: parentId,
            plan_name: textValue(subscription, "plan_name", "name") ?? "Zoho subscription",
            amount: numberValue(subscription, "amount", "recurring_price"),
            cadence: billingFrequency(textValue(subscription, "interval_unit", "interval")),
            next_due_date: textValue(subscription, "next_billing_at", "next_billing_date"),
            status: (textValue(subscription, "status") ?? "active").toLowerCase(),
            notes: "Synchronised from Zoho Billing",
            external_provider: "zoho",
            external_customer_id: customerId,
            external_subscription_id: textValue(subscription, "subscription_id"),
            billing_last_synced_at: now,
            updated_at: now,
          },
        ];
      })
      .filter((subscription) => subscription.external_subscription_id);
    if (matchedSubscriptions.length) {
      const { error } = await admin
        .from("client_subscriptions")
        .upsert(matchedSubscriptions, { onConflict: "external_subscription_id" });
      if (error) throw error;
    }

    const counts = {
      customers: customers.length,
      plans: plans.length,
      subscriptions: subscriptions.length,
      invoices: invoices.length,
      payments: payments.length,
      matched_invoices: matchedInvoices.length,
      matched_subscriptions: matchedSubscriptions.length,
      unmatched: snapshots.filter((row) => row.sync_status === "unmatched").length,
    };
    await admin
      .from("zoho_sync_runs")
      .update({ status: "succeeded", completed_at: now, counts })
      .eq("id", run.id);
    return json({ ok: true, run_id: run.id, counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Zoho sync error";
    await admin
      .from("zoho_sync_runs")
      .update({ status: "failed", completed_at: new Date().toISOString(), error_message: message })
      .eq("id", run.id);
    return json({ error: message, run_id: run.id }, 500);
  }
});

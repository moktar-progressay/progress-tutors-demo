create index if not exists zoho_sync_runs_requested_by_idx
  on public.zoho_sync_runs(requested_by);

create index if not exists zoho_external_records_parent_id_idx
  on public.zoho_external_records(parent_id);

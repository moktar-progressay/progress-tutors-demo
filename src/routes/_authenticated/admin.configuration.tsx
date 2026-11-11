import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Archive, RotateCcw } from "lucide-react";
import { Page } from "@/components/AppShell";
import { PageHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/form-kit";
import { useTable, useUpsert, useUpdateRow, useDeleteRow } from "@/lib/db";
import { useCatalogue, useCatalogueMutation, type CatalogueItem, type CatalogueName } from "@/lib/teaching-catalogue";

export const Route = createFileRoute("/_authenticated/admin/configuration")({
  component: TeachingConfiguration,
});

const categories: { table: CatalogueName; label: string }[] = [
  { table: "teaching_subjects", label: "Subjects" },
  { table: "teaching_levels", label: "Levels" },
  { table: "site_rooms", label: "Rooms" },
];

function TeachingConfiguration() {
  const [category, setCategory] = useState<CatalogueName>("site_rooms");
  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [floor, setFloor] = useState("");
  const [capacity, setCapacity] = useState("");
  const [remove, setRemove] = useState<CatalogueItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const sites = useTable("sites", "name");
  const levels = useCatalogue("teaching_levels");
  const subjects = useCatalogue("teaching_subjects");
  const rooms = useCatalogue("site_rooms");
  const mutation = useCatalogueMutation(category);
  const rows = (category === "site_rooms" ? rooms.data : category === "teaching_levels" ? levels.data : subjects.data) ?? [];
  const [siteFilter, setSiteFilter] = useState("all");
  const visible = rows.filter((row) => (showArchived || row.active) && (category !== "site_rooms" || siteFilter === "all" || row.site_id === siteFilter));
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteEditingId, setSiteEditingId] = useState<string | null>(null);
  const [siteRemoveId, setSiteRemoveId] = useState<string | null>(null);
  const createSite = useUpsert("sites");
  const updateSite = useUpdateRow("sites");
  const deleteSite = useDeleteRow("sites");

  function beginEdit(row?: CatalogueItem) {
    setEditing(row ?? null);
    setName(row?.name ?? "");
    setSiteId(row?.site_id ?? (siteFilter === "all" ? "" : siteFilter));
    setFloor(row?.floor ?? "");
    setCapacity(row?.capacity ? String(row.capacity) : "");
  }
  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Enter a name");
    if (category === "site_rooms" && !siteId) return toast.error("Choose a site");
    if (capacity && (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)) return toast.error("Capacity must be a positive whole number");
    try {
      const values: Record<string, unknown> = { name: trimmed };
      if (category === "site_rooms") {
        values.site_id = siteId;
        values.floor = floor.trim() || null;
        values.capacity = capacity ? Number(capacity) : null;
      }
      await mutation.mutateAsync(editing ? { type: "update", id: editing.id, values } : { type: "create", values });
      toast.success(editing ? "Updated" : "Added");
      setName("");
      setEditing(null);
      setFloor("");
      setCapacity("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }
  async function toggle(row: CatalogueItem) {
    try {
      await mutation.mutateAsync({ type: "update", id: row.id, values: { active: !row.active } });
      toast.success(row.active ? "Archived" : "Restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  }
  async function deleteItem() {
    if (!remove) return;
    try {
      await mutation.mutateAsync({ type: "delete", id: remove.id });
      setRemove(null);
      toast.success("Deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message + ". Archive this item if it is used by lessons." : "Could not delete");
    }
  }

  return (
    <Page className="space-y-5">
      <PageHeader title="Teaching configuration" description="Manage subjects, levels, rooms and sites. Archived options remain in existing lessons." />
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <Button key={item.table} variant={category === item.table ? "default" : "outline"} onClick={() => { setCategory(item.table); setEditing(null); setName(""); }}>
            {item.label}
          </Button>
        ))}
        <Button variant="outline" onClick={() => { document.getElementById("sites-configuration")?.scrollIntoView({ behavior: "smooth" }); }}>Sites</Button>
      </div>
      <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-bold">{categories.find((item) => item.table === category)?.label}</h2>
        {category === "site_rooms" && (
          <label className="block text-sm font-medium">Filter by site
            <select className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3" value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
              <option value="all">All sites</option>
              {(sites.data ?? []).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </label>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm font-medium">Name
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter name" className="mt-1" />
          </label>
          {category === "site_rooms" && <>
            <label className="text-sm font-medium">Site
              <select className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3" value={siteId} onChange={(event) => setSiteId(event.target.value)}>
                <option value="">Choose site</option>
                {(sites.data ?? []).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Floor (optional)
              <Input className="mt-1" value={floor} onChange={(event) => setFloor(event.target.value)} />
            </label>
            <label className="text-sm font-medium">Capacity (optional)
              <Input className="mt-1" type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
            </label>
          </>}
        </div>
        <div className="flex gap-2">
          <Button disabled={mutation.isPending} onClick={save}><Plus className="h-4 w-4" /> {editing ? "Save changes" : "Add new"}</Button>
          {editing && <Button variant="outline" onClick={() => beginEdit()}>Cancel</Button>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label>
        <div className="divide-y divide-border rounded-xl border border-border">
          {visible.map((row) => (
            <div key={row.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.name} {!row.active && <span className="text-xs text-muted-foreground">(Archived)</span>}</p>
                {category === "site_rooms" && <p className="text-xs text-muted-foreground">{(sites.data ?? []).find((site) => site.id === row.site_id)?.name ?? "Site unavailable"}{row.floor ? ` · ${row.floor}` : ""}{row.capacity ? ` · ${row.capacity} seats` : ""}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label={`Edit ${row.name}`} onClick={() => beginEdit(row)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={row.active ? `Archive ${row.name}` : `Restore ${row.name}`} onClick={() => toggle(row)}>{row.active ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${row.name}`} onClick={() => setRemove(row)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {!visible.length && <p className="p-4 text-sm text-muted-foreground">No options found.</p>}
        </div>
      </section>
      <section id="sites-configuration" className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-bold">Sites</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Site name" value={siteName} onChange={(event) => setSiteName(event.target.value)} />
          <Input placeholder="Address (optional)" value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button disabled={!siteName.trim() || createSite.isPending || updateSite.isPending} onClick={async () => {
            try {
              if (siteEditingId) await updateSite.mutateAsync({ id: siteEditingId, values: { name: siteName.trim(), address: siteAddress.trim() || null } });
              else await createSite.mutateAsync({ name: siteName.trim(), address: siteAddress.trim() || null, active: true });
              setSiteEditingId(null); setSiteName(""); setSiteAddress(""); toast.success("Site saved");
            } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save site"); }
          }}>{siteEditingId ? "Save site" : "Add site"}</Button>
          {siteEditingId && <Button variant="outline" onClick={() => { setSiteEditingId(null); setSiteName(""); setSiteAddress(""); }}>Cancel</Button>}
        </div>
        {(sites.data ?? []).map((site) => (
          <div key={site.id} className="flex items-center gap-2 border-t border-border py-2">
            <div className="min-w-0 flex-1"><p className="font-semibold">{site.name}</p><p className="text-xs text-muted-foreground">{site.address ?? ""}{!site.active ? " · Archived" : ""}</p></div>
            <Button variant="ghost" size="icon" aria-label={`Edit ${site.name}`} onClick={() => { setSiteEditingId(site.id); setSiteName(site.name); setSiteAddress(site.address ?? ""); }}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={site.active ? "Archive site" : "Restore site"} onClick={async () => { try { await updateSite.mutateAsync({ id: site.id, values: { active: !site.active } }); } catch (error) { toast.error(String(error)); } }}>{site.active ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</Button>
            <Button variant="ghost" size="icon" aria-label="Delete site" onClick={() => setSiteRemoveId(site.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </section>
      <ConfirmDeleteDialog open={!!remove} onOpenChange={(open) => { if (!open) setRemove(null); }} title="Delete this option?" description="This cannot be undone. If lessons depend on it, archive instead." confirmLabel="Delete" busy={mutation.isPending} onConfirm={deleteItem} />
      <ConfirmDeleteDialog open={!!siteRemoveId} onOpenChange={(open) => { if (!open) setSiteRemoveId(null); }} title="Delete this site?" description="Sites used by lessons or rooms cannot be deleted. Archive instead." confirmLabel="Delete site" busy={deleteSite.isPending} onConfirm={async () => { if (!siteRemoveId) return; try { await deleteSite.mutateAsync(siteRemoveId); setSiteRemoveId(null); toast.success("Site deleted"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete site"); } }} />
    </Page>
  );
}


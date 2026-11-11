import { Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { SelectField } from "@/components/form-kit";
import { useCatalogue } from "@/lib/teaching-catalogue";

/** Rooms are site-scoped and managed in Settings, not hard-coded in the UI. */
export function SiteRoomField({
  siteId,
  siteName,
  value,
  onChange,
}: {
  siteId?: string | null;
  siteName: string | null | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const rooms = useCatalogue("site_rooms");
  const options = (rooms.data ?? []).filter((room) => room.site_id === siteId && (room.active || room.name === value));
  const selectOptions = [
    { value: "", label: siteId ? "Select room" : "Select a site first" },
    ...options.map((room) => ({ value: room.name, label: room.floor && !room.name.toLowerCase().includes(room.floor.toLowerCase()) ? `${room.name} (${room.floor})` : room.name })),
  ];
  if (value && !selectOptions.some((option) => option.value === value)) {
    selectOptions.push({ value, label: `${value} (existing)` });
  }
  return (
    <div className="min-w-0 space-y-1">
      <SelectField label="Room" value={value} onChange={onChange} options={selectOptions} />
      <Link to="/admin/configuration" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        <Settings2 className="h-3 w-3" /> Manage rooms{siteName ? ` for ${siteName}` : ""}
      </Link>
    </div>
  );
}

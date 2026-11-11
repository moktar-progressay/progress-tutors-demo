import { SelectField, TextField } from "@/components/form-kit";
import { FRESTON_ROOMS, isFrestonSite } from "@/lib/lesson-options";

/** Room is stored in the existing classes.room field and scoped to the selected site. */
export function SiteRoomField({
  siteName,
  value,
  onChange,
}: {
  siteName: string | null | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!siteName) {
    return (
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground">
        Room
        <select
          aria-label="Select a site before choosing a room"
          disabled
          className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm"
          value=""
          onChange={() => undefined}
        >
          <option value="">Select a site first</option>
        </select>
      </label>
    );
  }

  if (isFrestonSite(siteName)) {
    const options: { value: string; label: string }[] = [
      { value: "", label: "Select room" },
      ...FRESTON_ROOMS.map((room) => ({ value: room, label: room })),
    ];
    if (value && !options.some((option) => option.value === value)) {
      options.push({ value, label: `${value} (existing room)` });
    }
    return <SelectField label="Room" value={value} onChange={onChange} options={options} />;
  }

  return <TextField label="Room" value={value} onChange={onChange} placeholder="Enter room name (optional)" />;
}

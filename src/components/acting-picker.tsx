import { SelectField } from "@/components/form-kit";

export function ActingPicker({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="surface flex flex-wrap items-end gap-3 p-4">
      <SelectField
        label={label}
        value={value}
        onChange={onChange}
        options={[{ value: "", label: "Choose…" }, ...options]}
      />
      <p className="text-xs text-muted-foreground">
        {hint ?? "Only affects what this browser shows. All records are shared."}
      </p>
    </div>
  );
}

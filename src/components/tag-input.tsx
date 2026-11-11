import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
};

export function TagInput({ label, value, onChange, suggestions = [], placeholder = "Type and press Enter", className }: Props) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const clean = (text: string) => text.trim().replace(/\s+/g, " ");
  const add = (raw: string) => {
    const name = clean(raw);
    if (!name) return;
    if (!value.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) onChange([...value, name]);
    setDraft("");
  };
  const matches = suggestions.filter((name) =>
    !value.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()) &&
    (!draft.trim() || name.toLocaleLowerCase().includes(draft.trim().toLocaleLowerCase()))
  );
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background p-1.5 focus-within:ring-2 focus-within:ring-primary/30">
        {value.map((tag) => (
          <span key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            <span className="truncate">{tag}</span>
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((item) => item !== tag))} className="rounded-full hover:bg-primary/15"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          aria-label={label}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
          value={draft}
          placeholder={value.length ? "Add another…" : placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(draft); }
            if (event.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
        />
        {draft.trim() && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(draft)} className="rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Add</button>}
      </div>
      {focused && matches.length > 0 && (
        <div className="flex max-h-28 flex-wrap gap-1 overflow-auto" aria-label={`Suggested ${label.toLowerCase()}`}>
          {matches.map((name) => <button key={name} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(name)} className="rounded-full border border-border px-2 py-1 text-xs hover:bg-muted">+ {name}</button>)}
        </div>
      )}
    </div>
  );
}

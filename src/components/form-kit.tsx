import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel = "Save",
  busy,
  children,
  wide,
  fullScreen,
  dangerLabel,
  onDanger,
  dangerBusy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
  children: ReactNode;
  wide?: boolean;
  fullScreen?: boolean;
  dangerLabel?: string | undefined;
  onDanger?: (() => void) | undefined;
  dangerBusy?: boolean | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          fullScreen
            ? "flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[calc(100dvh-1rem)] sm:w-[calc(100vw-1rem)] sm:max-w-none sm:rounded-2xl sm:border"
            : wide
              ? "flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden p-0 sm:max-h-[90vh] sm:max-w-3xl"
              : "flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden p-0 sm:max-h-[90vh]"
        }
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pt-6 pb-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className={`grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto overscroll-contain px-6 pt-4 ${fullScreen ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <div className="sticky bottom-0 z-20 -mx-6 mt-1 grid grid-cols-2 gap-2 border-t border-border bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] sm:col-span-full sm:flex sm:flex-row">
            {dangerLabel && onDanger ? (
              <Button
                type="button"
                variant="destructive"
                className="min-w-0 w-full sm:mr-auto sm:w-auto"
                disabled={dangerBusy}
                onClick={onDanger}
              >
                {dangerBusy ? "Deleting…" : dangerLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="min-w-0 w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`${dangerLabel && onDanger ? "col-span-2" : ""} min-w-0 w-full sm:w-auto`}
              disabled={busy}
            >
              {busy ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel className="mt-0 min-w-0 flex-1">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="min-w-0 flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            {busy ? "Deleting…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <label
      className={`flex min-w-0 max-w-full flex-col gap-1 text-xs font-semibold text-muted-foreground ${full ? "sm:col-span-2" : ""}`}
    >
      {label}
      <Input
        type={type}
        value={value}
        required={required ?? false}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-0 max-w-full rounded-xl"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs font-semibold text-muted-foreground sm:col-span-2">
      {label}
      <Textarea
        value={value}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 min-w-0 max-w-full rounded-xl"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  full?: boolean;
}) {
  return (
    <label
      className={`flex min-w-0 max-w-full flex-col gap-1 text-xs font-semibold text-muted-foreground ${full ? "sm:col-span-2" : ""}`}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full min-w-0 max-w-full truncate rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-[var(--color-primary)]"
      />
      {label}
    </label>
  );
}

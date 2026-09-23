import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FilterDialog({
  open,
  onOpenChange,
  title = "Filters",
  description = "Narrow the records shown on this screen.",
  onClear,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 flex max-h-[85dvh] translate-y-0 flex-col gap-0 rounded-b-none p-0 sm:top-1/2 sm:bottom-auto sm:max-h-[80dvh] sm:-translate-y-1/2 sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-5 pt-5 pb-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          {children}
        </div>
        <DialogFooter className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-background px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex">
          <Button type="button" variant="secondary" onClick={onClear}>
            Clear
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Apply filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

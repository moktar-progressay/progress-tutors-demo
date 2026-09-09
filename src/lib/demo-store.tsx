import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./demo-data";

/**
 * UI-only state: which role view is showing and which dashboard sections are collapsed.
 * Every operational record is read from and written to the shared database.
 */
interface DemoState {
  role: Role;
  setRole: (r: Role) => void;
  collapsed: Record<string, boolean>;
  toggleSection: (id: string) => void;
}

const DemoContext = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const value = useMemo<DemoState>(
    () => ({
      role,
      setRole,
      collapsed,
      toggleSection: (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] })),
    }),
    [role, collapsed],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}

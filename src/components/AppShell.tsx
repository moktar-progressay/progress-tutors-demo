import { Link, useNavigate, useRouterState, type LinkProps } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Flame,
  GraduationCap,
  Home,
  Receipt,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/lib/demo-store";
import { ORG, type Role } from "@/lib/demo-data";

type ToPath = NonNullable<LinkProps["to"]>;

interface NavItem {
  to: ToPath;
  label: string;
  icon: ReactNode;
}

const iconCls = "h-4.5 w-4.5";

export const NAV: Record<Role, NavItem[]> = {
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: <Home className={iconCls} /> },
    { to: "/admin/classes", label: "Schedule", icon: <CalendarDays className={iconCls} /> },
    { to: "/admin/students", label: "Students", icon: <GraduationCap className={iconCls} /> },
    { to: "/admin/tutors", label: "Tutors", icon: <Users className={iconCls} /> },
    { to: "/admin/parents", label: "Parents", icon: <Users className={iconCls} /> },
    { to: "/admin/payments", label: "Payments", icon: <CreditCard className={iconCls} /> },
    {
      to: "/admin/payment-requests",
      label: "Payment Requests",
      icon: <Receipt className={iconCls} />,
    },
    { to: "/admin/reports", label: "Reports", icon: <BarChart3 className={iconCls} /> },
  ],
  tutor: [
    { to: "/tutor/dashboard", label: "Dashboard", icon: <Home className={iconCls} /> },
    { to: "/tutor/lessons", label: "My Lessons", icon: <CalendarDays className={iconCls} /> },
    { to: "/tutor/earnings", label: "Earnings", icon: <Wallet className={iconCls} /> },
    {
      to: "/tutor/payment-requests",
      label: "Payment Requests",
      icon: <Receipt className={iconCls} />,
    },
  ],
  parent: [
    { to: "/parent/dashboard", label: "Dashboard", icon: <Home className={iconCls} /> },
    { to: "/parent/classes", label: "Find Classes", icon: <BookOpen className={iconCls} /> },
    { to: "/parent/payments", label: "Payments", icon: <CreditCard className={iconCls} /> },
  ],
  student: [
    { to: "/student/dashboard", label: "Dashboard", icon: <Home className={iconCls} /> },
    { to: "/student/lessons", label: "Lessons", icon: <CalendarDays className={iconCls} /> },
    { to: "/student/homework", label: "Homework", icon: <ClipboardCheck className={iconCls} /> },
    { to: "/student/progress", label: "Progress", icon: <Flame className={iconCls} /> },
    { to: "/student/rewards", label: "Rewards", icon: <Trophy className={iconCls} /> },
  ],
};

const ROLE_HOME: Record<Role, ToPath> = {
  admin: "/admin/dashboard",
  tutor: "/tutor/dashboard",
  parent: "/parent/dashboard",
  student: "/student/dashboard",
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin view",
  tutor: "Tutor view",
  parent: "Parent view",
  student: "Student view",
};

function useSignedInUser() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setEmail(data.session?.user.email ?? "");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? "");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return email;
}

const ROLES: Role[] = ["admin", "tutor", "parent", "student"];

function RoleSwitcher() {
  const { role, setRole } = useDemo();
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/15 p-1">
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => {
            setRole(r);
            navigate({ to: ROLE_HOME[r] });
          }}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-colors sm:text-sm",
            role === r ? "bg-white text-primary shadow-sm" : "text-white/85 hover:text-white",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useDemo();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV[role];
  const email = useSignedInUser();
  const initials = (email.slice(0, 2) || "PT").toUpperCase();
  const isPublic = pathname === "/" || pathname === "/auth";

  if (isPublic) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      {/* Live-data banner + role switcher */}
      <div className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 py-2">
          <p className="flex items-center gap-2 text-[11px] font-semibold sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Private workspace. Your schedule is visible only to your signed-in account.
          </p>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] font-semibold opacity-80 sm:inline">View as</span>
            <RoleSwitcher />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1500px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-[46px] hidden h-[calc(100vh-46px)] w-64 shrink-0 flex-col border-r border-border px-4 py-6 lg:flex">
          <Link to="/" className="flex items-center gap-2 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
              PT
            </span>
            <span>
              <span className="block text-sm font-extrabold">ProgressTutors</span>
              <span className="block text-[11px] text-muted-foreground">{ORG}</span>
            </span>
          </Link>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}
                activeOptions={{ exact: false }}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl bg-secondary px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{email || "Signed in"}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {ROLE_LABEL[role]}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="mt-3 w-full rounded-xl bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-background"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground">
                PT
              </span>
              <span className="text-sm font-extrabold">ProgressTutors</span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] font-bold text-primary"
            >
              {initials} · Sign out
            </button>
          </div>

          {children}

          <footer className="footer-curve mt-12 px-6 py-8 sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-extrabold">ProgressTutors</p>
                <p className="text-xs opacity-85">
                  Tuition management for schools, tutors, parents and students.
                </p>
              </div>
              <p className="text-xs opacity-85">
                Private workspace · Sign-in required · Real records, no card payments
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {items.slice(0, 5).map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            {item.icon}
            <span className="max-w-full truncate px-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-6 px-4 py-6 sm:px-6 lg:px-8", className)}>{children}</div>;
}

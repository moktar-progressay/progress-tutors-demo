import { Link, useNavigate, useRouterState, type LinkProps } from "@tanstack/react-router";
import {
  CalendarDays,
  BookOpenCheck,
  ClipboardCheck,
  CreditCard,
  ChevronDown,
  Flame,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/lib/demo-store";
import { useCurrentAccess } from "@/lib/auth-scope";
import type { Role } from "@/lib/demo-data";

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
    { to: "/admin/contacts", label: "Contacts", icon: <Users className={iconCls} /> },
    { to: "/admin/payments", label: "Payments", icon: <CreditCard className={iconCls} /> },
  ],
  tutor: [
    { to: "/tutor/dashboard", label: "Dashboard", icon: <Home className={iconCls} /> },
    { to: "/tutor/lessons", label: "My schedule", icon: <CalendarDays className={iconCls} /> },
    { to: "/tutor/students", label: "Students", icon: <GraduationCap className={iconCls} /> },
    { to: "/tutor/homework", label: "Homework", icon: <BookOpenCheck className={iconCls} /> },
    {
      to: "/tutor/payment-requests",
      label: "Payment requests",
      icon: <Wallet className={iconCls} />,
    },
  ],
  parent: [
    { to: "/parent/dashboard", label: "Dashboard", icon: <Home className={iconCls} /> },
    { to: "/parent/classes", label: "Schedule", icon: <CalendarDays className={iconCls} /> },
    { to: "/parent/dashboard", label: "Children", icon: <GraduationCap className={iconCls} /> },
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

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole } = useDemo();
  const access = useCurrentAccess();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV[role];
  const email = useSignedInUser();
  const initials = (email.slice(0, 2) || "PT").toUpperCase();
  const isPublic = pathname === "/" || pathname === "/auth";
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("progress-tutors-sidebar") !== "collapsed";
  });

  useEffect(() => {
    if (access.data?.role === "tutor" && role !== "tutor") setRole("tutor");
  }, [access.data?.role, role, setRole]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "progress-tutors-sidebar",
      sidebarExpanded ? "expanded" : "collapsed",
    );
  }, [sidebarExpanded]);

  if (isPublic) return <>{children}</>;

  return (
    <div
      className="min-h-screen max-w-full bg-background"
      style={{ "--app-header-height": `${headerHeight}px` } as CSSProperties}
    >
      {/* Sticky application header */}
      <header ref={headerRef} className="sticky top-0 z-40">
        <div className="relative bg-primary text-primary-foreground shadow-sm">
          <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              to={ROLE_HOME[role]}
              className="flex min-w-0 items-center gap-2"
              aria-label="Go to dashboard"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-primary">
                PT
              </span>
              <span className="truncate text-sm font-extrabold sm:text-base">ProgressTutors</span>
            </Link>
            <p className="hidden text-xs font-semibold text-white/80 md:block">
              Private workspace · signed-in records only
            </p>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex h-9 items-center gap-1 rounded-full bg-white/15 px-2.5 text-xs font-bold hover:bg-white/25"
              aria-expanded={accountMenuOpen}
              aria-label="Open account settings"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] text-primary">
                {initials}
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          {accountMenuOpen ? (
            <div className="absolute top-[calc(100%+0.5rem)] right-3 z-50 w-64 rounded-2xl border border-border bg-card p-3 text-foreground shadow-xl">
              <div className="flex items-center gap-2 border-b border-border px-1 pb-3">
                <Settings className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{email || "Signed in"}</p>
                  <p className="text-[11px] text-muted-foreground">Account settings</p>
                </div>
              </div>
              {access.data?.role === "admin" ? (
                <div className="py-3">
                  <p className="px-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                    Switch view
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {ROLES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setRole(item);
                          setAccountMenuOpen(false);
                          navigate({ to: ROLE_HOME[item] });
                        }}
                        className={cn(
                          "rounded-lg px-2 py-2 text-xs font-bold capitalize",
                          role === item
                            ? "bg-secondary text-primary"
                            : "hover:bg-muted text-muted-foreground",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto flex w-full min-w-0 max-w-[1500px]">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "sticky top-[var(--app-header-height)] hidden h-[calc(100vh-var(--app-header-height))] shrink-0 flex-col border-r border-border py-4 transition-[width,padding] duration-200 lg:flex",
            sidebarExpanded ? "w-64 px-4" : "w-16 px-2",
          )}
        >
          <div
            className={cn(
              "mb-3 flex h-10 shrink-0 items-center",
              sidebarExpanded ? "justify-between px-2" : "justify-center",
            )}
          >
            {sidebarExpanded ? (
              <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Menu
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setSidebarExpanded((expanded) => !expanded)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary"
              aria-label={sidebarExpanded ? "Collapse side menu" : "Open side menu"}
              aria-expanded={sidebarExpanded}
              title={sidebarExpanded ? "Collapse menu" : "Open menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "flex h-11 items-center rounded-xl text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground",
                  sidebarExpanded ? "gap-3 px-3" : "justify-center px-0",
                )}
                activeProps={{ className: "bg-secondary text-primary" }}
                activeOptions={{ exact: false }}
                aria-label={item.label}
                title={!sidebarExpanded ? item.label : undefined}
              >
                {item.icon}
                <span className={sidebarExpanded ? "" : "sr-only"}>{item.label}</span>
              </Link>
            ))}
          </nav>

          {sidebarExpanded ? (
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
          ) : (
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="mx-auto mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-primary"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </aside>

        {/* Content */}
        <main className="w-full min-w-0 max-w-full flex-1 pb-28 lg:pb-0">
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
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
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
  return (
    <div className={cn("w-full min-w-0 max-w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

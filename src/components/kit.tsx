import { ChevronDown, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDemo } from "@/lib/demo-store";
import { CAPACITY_LABEL, capacityStatus } from "@/lib/demo-data";

export type Tone = "pink" | "blue" | "green" | "amber" | "purple" | "neutral";

const toneTile: Record<Tone, string> = {
  pink: "bg-tile-pink text-tile-pink-ink",
  blue: "bg-tile-blue text-tile-blue-ink",
  green: "bg-tile-green text-tile-green-ink",
  amber: "bg-tile-amber text-tile-amber-ink",
  purple: "bg-tile-purple text-tile-purple-ink",
  neutral: "bg-muted text-muted-foreground",
};

const profileTones: Tone[] = ["pink", "blue", "green", "amber", "purple"];

export function avatarTone(value: string): Tone {
  const score = Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
  return profileTones[score % profileTones.length] ?? "pink";
}

export function StatCard({
  label,
  value,
  hint,
  tone = "pink",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl px-4 py-4 sm:px-5", toneTile[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-2xl font-extrabold sm:text-3xl">{value}</p>
        {icon ? <span className="opacity-70">{icon}</span> : null}
      </div>
      <p className="mt-1 text-xs font-semibold tracking-wide uppercase opacity-80">{label}</p>
      {hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneTile[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CapacityPill({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const status = capacityStatus(enrolled, capacity);
  const tone: Tone =
    status === "available"
      ? "green"
      : status === "nearly"
        ? "amber"
        : status === "full"
          ? "pink"
          : "purple";
  return <Pill tone={tone}>{CAPACITY_LABEL[status]}</Pill>;
}

export function Avatar({
  initials,
  size = "md",
  tone = "pink",
  src,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  tone?: Tone;
  src?: string | null;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-card",
        toneTile[tone],
        size === "sm" && "h-7 w-7 text-[11px]",
        size === "md" && "h-9 w-9 text-xs",
        size === "lg" && "h-12 w-12 text-sm",
      )}
      title={initials}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <UserRound
            className={cn(size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5")}
          />
          <span className="absolute right-0 bottom-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-card px-0.5 text-[7px] leading-none text-foreground shadow-sm">
            {initials}
          </span>
        </>
      )}
    </span>
  );
}

export function Section({
  id,
  title,
  subtitle,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { collapsed, toggleSection } = useDemo();
  const isOpen = !collapsed[id];
  return (
    <section className={cn("surface p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={isOpen}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              !isOpen && "-rotate-90",
            )}
          />
          <span>
            <span className="block text-base font-bold">{title}</span>
            {subtitle ? (
              <span className="block text-xs text-muted-foreground">{subtitle}</span>
            ) : null}
          </span>
        </button>
        {action}
      </div>
      {isOpen ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function Hero({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="hero-curve px-5 pt-8 pb-12 sm:px-8 sm:pt-10 sm:pb-14">
      <div className="relative z-10">
        <h1 className="text-2xl font-extrabold sm:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm opacity-90 sm:text-base">{subtitle}</p>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {breadcrumb ? <div className="mb-1 text-xs text-muted-foreground">{breadcrumb}</div> : null}
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-36 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function GoProgressLink({ label = "GoProgress" }: { label?: string }) {
  return (
    <a
      href="https://goprogress.example.com"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-tile-blue px-2.5 py-1 text-xs font-semibold text-tile-blue-ink hover:opacity-85"
    >
      ↗ {label}
    </a>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, GoProgressLink, Hero, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CHILDREN, money } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/parent/dashboard")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — ProgressTutors" },
      {
        name: "description",
        content: "All your children's lessons, homework and payments in one place.",
      },
      { property: "og:title", content: "Parent Dashboard — ProgressTutors" },
      { property: "og:description", content: "Switch between children, see lessons, homework and payments." },
    ],
  }),
  component: ParentDashboard,
});

export function ChildSwitcher() {
  const { selectedChild, setSelectedChild } = useDemo();
  const options = [{ id: "all", short: "All Children" }, ...CHILDREN.map((c) => ({ id: c.id, short: c.short }))];
  return (
    <>
      <div className="hidden flex-wrap gap-2 sm:flex">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelectedChild(o.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              selectedChild === o.id ? "bg-white text-primary" : "bg-white/20 text-white"
            }`}
          >
            {o.short}
          </button>
        ))}
        <button
          type="button"
          onClick={() => toast.success("Demo: Add Child form would open")}
          className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold text-white"
        >
          + Add Child
        </button>
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold sm:hidden">
        Viewing
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="h-10 rounded-xl bg-white px-3 text-sm font-bold text-primary"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.short}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function ParentDashboard() {
  const { selectedChild } = useDemo();
  const shown = selectedChild === "all" ? CHILDREN : CHILDREN.filter((c) => c.id === selectedChild);
  const due = shown.reduce((a, c) => a + c.monthly, 0);

  return (
    <>
      <Hero title="Welcome back, Sarah 👋" subtitle="Everything happening across your children's tuition.">
        <ChildSwitcher />
      </Hero>

      <Page className="-mt-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Children" value={String(shown.length)} tone="pink" />
          <StatCard label="Lessons this week" value={String(shown.reduce((a, c) => a + c.lessons.length, 0))} tone="blue" />
          <StatCard
            label="Homework due"
            value={String(shown.reduce((a, c) => a + c.homework.filter((h) => h.status === "Due").length, 0))}
            tone="amber"
          />
          <StatCard label="Due this month" value={money(due)} tone="green" />
        </div>

        <Section id="p-lessons" title="Lessons" subtitle="Upcoming across your children">
          <ul className="space-y-2">
            {shown.flatMap((c) =>
              c.lessons.map((l) => (
                <li
                  key={`${c.id}-${l.subject}-${l.when}`}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3"
                >
                  <Avatar initials={c.initials} tone="purple" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {c.short} — {l.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.when} · {l.where} · {l.tutor}
                    </p>
                  </div>
                  <GoProgressLink />
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/parent/children/$id" params={{ id: c.id }}>
                      View child
                    </Link>
                  </Button>
                </li>
              )),
            )}
          </ul>
        </Section>

        <Section id="p-homework" title="Homework" subtitle="From GoProgress">
          <ul className="space-y-2">
            {shown.flatMap((c) =>
              c.homework.map((h) => (
                <li
                  key={`${c.id}-${h.title}`}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3"
                >
                  <Avatar initials={c.initials} size="sm" tone="blue" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {c.short} — {h.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.subject}</p>
                  </div>
                  <Pill tone={h.status === "Due" ? "amber" : "green"}>{h.due}</Pill>
                </li>
              )),
            )}
          </ul>
        </Section>

        <Section id="p-payments" title="Payments" subtitle={`${money(due)} due this month`}>
          <ul className="space-y-2">
            {shown.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span className="text-sm font-bold">{c.short}</span>
                <span className="text-sm font-bold">{money(c.monthly)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/parent/payments">Manage Payments</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/parent/classes">Find Classes</Link>
            </Button>
            <Button variant="secondary" onClick={() => toast.success("Demo: tutor search would open")}>
              Find Tutor
            </Button>
            <Button variant="outline" asChild>
              <a href="https://goprogress.example.com" target="_blank" rel="noreferrer">
                Open GoProgress
              </a>
            </Button>
          </div>
        </Section>
      </Page>
    </>
  );
}

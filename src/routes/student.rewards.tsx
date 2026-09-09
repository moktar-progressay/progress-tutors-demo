import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { PageHeader, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { BADGES, CHILDREN } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/student/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — ProgressTutors" },
      { name: "description", content: "Badges, streaks and rewards you can unlock with XP." },
      { property: "og:title", content: "Rewards — ProgressTutors" },
      { property: "og:description", content: "Earn badges and unlock rewards." },
    ],
  }),
  component: StudentRewards,
});

const REWARDS = [
  { name: "Homework pass", cost: 500 },
  { name: "Certificate of effort", cost: 1000 },
  { name: "Prize draw entry", cost: 1500 },
];

function StudentRewards() {
  const me = CHILDREN[0]!;
  const { xp, level } = useDemo();

  return (
    <Page>
      <PageHeader title="Rewards" subtitle="Turn XP into rewards" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="XP available" value={xp.toLocaleString()} tone="purple" />
        <StatCard label="Level" value={String(level)} tone="pink" />
        <StatCard label="Streak" value={`${me.streak} days`} tone="amber" />
      </div>

      <Section id="sr-badges" title="Badges">
        <div className="flex flex-wrap gap-3">
          {BADGES.map((b) => (
            <div
              key={b.name}
              className={`flex w-32 flex-col items-center gap-1 rounded-2xl border border-border p-3 text-center ${
                b.earned ? "" : "opacity-40"
              }`}
            >
              <span className="text-2xl">{b.icon}</span>
              <span className="text-xs font-bold">{b.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="sr-shop" title="Reward shop">
        <ul className="space-y-2">
          {REWARDS.map((r) => (
            <li key={r.name} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <span className="min-w-0 flex-1 text-sm font-bold">{r.name}</span>
              <span className="text-sm text-muted-foreground">{r.cost} XP</span>
              <Button
                size="sm"
                disabled={xp < r.cost}
                onClick={() => toast.success(`Demo: ${r.name} redeemed`)}
              >
                Redeem
              </Button>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}

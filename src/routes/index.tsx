import { createFileRoute, useNavigate, type LinkProps } from "@tanstack/react-router";
import { GraduationCap, Home, Users, Wallet } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import type { Role } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProgressTutors — Interactive Tuition Management Demo" },
      {
        name: "description",
        content:
          "Clickable ProgressTutors prototype: pick a role — admin, tutor, parent or student — and explore tuition operations, payments and progress.",
      },
      { property: "og:title", content: "ProgressTutors — Interactive Tuition Management Demo" },
      {
        property: "og:description",
        content: "Explore tuition operations, tutor payment requests, parent billing and student progress.",
      },
    ],
  }),
  component: Landing,
});

const CARDS: {
  role: Role;
  to: NonNullable<LinkProps["to"]>;
  title: string;
  body: string;
  icon: typeof Home;
  tone: string;
}[] = [
  {
    role: "admin",
    to: "/admin/dashboard",
    title: "School / Tuition Admin",
    body: "Run sites, classes, tutors, capacity, client billing and tutor Payment Requests.",
    icon: Home,
    tone: "bg-tile-pink text-tile-pink-ink",
  },
  {
    role: "tutor",
    to: "/tutor/dashboard",
    title: "Tutor",
    body: "See where and who you teach, sign in to lessons, submit reviews and get paid.",
    icon: Users,
    tone: "bg-tile-blue text-tile-blue-ink",
  },
  {
    role: "parent",
    to: "/parent/dashboard",
    title: "Parent",
    body: "Track every child's lessons, homework and payments, and join new classes.",
    icon: Wallet,
    tone: "bg-tile-green text-tile-green-ink",
  },
  {
    role: "student",
    to: "/student/dashboard",
    title: "Student",
    body: "Next lessons, homework, XP, streaks, badges and rewards.",
    icon: GraduationCap,
    tone: "bg-tile-purple text-tile-purple-ink",
  },
];

function Landing() {
  const { setRole } = useDemo();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-curve px-6 py-16 sm:px-10 sm:py-24">
        <div className="relative z-10 mx-auto max-w-5xl">
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            Shared operational demo · Live data · Sign-in required
          </span>
          <h1 className="mt-5 text-4xl font-extrabold sm:text-6xl">ProgressTutors</h1>
          <p className="mt-4 max-w-2xl text-base opacity-90 sm:text-lg">
            Tuition and football management across sites: schedules, registers, tutor pay, family billing and
            student progress — with GoProgress connected for learning and attendance.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary"
          >
            Sign in to the demo
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-xl font-extrabold">Choose a view</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone signed in shares the same records. You can switch view at any time from the bar at the top.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {CARDS.map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => {
                setRole(c.role);
                navigate({ to: c.to });
              }}
              className="surface p-6 text-left transition-shadow hover:shadow-md"
            >
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
              <span className="mt-4 inline-block text-sm font-bold text-primary">Enter demo →</span>
            </button>
          ))}
        </div>
      </main>

      <footer className="footer-curve mx-auto mt-8 max-w-6xl px-8 py-10">
        <p className="text-lg font-extrabold">ProgressTutors</p>
        <p className="text-xs opacity-85">
          Prototype for stakeholder and development review · No authentication, payments or live data.
        </p>
      </footer>
    </div>
  );
}

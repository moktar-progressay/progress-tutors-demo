import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GraduationCap, Search, UserRound, Users } from "lucide-react";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fullName, initialsOf, useTable } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts | ProgressTutors" },
      {
        name: "description",
        content: "Search and manage students, parents, guardians and tutors in one place.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactsPage,
});

type ContactTab = "students" | "parents" | "tutors";

const TABS: { id: ContactTab; label: string }[] = [
  { id: "students", label: "Students" },
  { id: "parents", label: "Parents" },
  { id: "tutors", label: "Tutors" },
];

function ContactsPage() {
  const students = useTable("students", "first_name");
  const parents = useTable("parents", "first_name");
  const tutors = useTable("tutors", "first_name");
  const links = useTable("parent_students");
  const enrolments = useTable("class_enrolments");
  const classes = useTable("classes", "name");
  const [tab, setTab] = useState<ContactTab>("students");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const source =
      tab === "students"
        ? (students.data ?? [])
        : tab === "parents"
          ? (parents.data ?? [])
          : (tutors.data ?? []);
    return source.filter((record) =>
      [fullName(record), record.email, record.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [parents.data, query, students.data, tab, tutors.data]);

  const destination =
    tab === "students" ? "/admin/students" : tab === "parents" ? "/admin/parents" : "/admin/tutors";

  return (
    <Page className="space-y-5">
      <PageHeader
        title="Contacts"
        subtitle="Students, parents and tutors, connected in one searchable workspace."
        actions={
          <Button asChild>
            <Link to={destination}>Manage {tab}</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Students" value={String((students.data ?? []).length)} tone="pink" />
        <StatCard label="Parents" value={String((parents.data ?? []).length)} tone="blue" />
        <StatCard label="Tutors" value={String((tutors.data ?? []).length)} tone="green" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-3 sm:p-4">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "min-w-24 flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors",
                  tab === item.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${tab}`}
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <Empty>No {tab} match your search.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((record) => {
              const name = fullName(record);
              const isStudent = tab === "students";
              const isParent = tab === "parents";
              const childCount = isParent
                ? (links.data ?? []).filter((item) => item.parent_id === record.id).length
                : 0;
              const lessonCount = isStudent
                ? (enrolments.data ?? []).filter(
                    (item) => item.student_id === record.id && item.status === "active",
                  ).length
                : tab === "tutors"
                  ? (classes.data ?? []).filter(
                      (item) => item.tutor_id === record.id && item.active,
                    ).length
                  : 0;
              const Icon = isStudent ? GraduationCap : isParent ? UserRound : Users;
              return (
                <li key={record.id}>
                  <Link
                    to={destination}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60"
                  >
                    <Avatar
                      initials={initialsOf(name)}
                      tone={isStudent ? "pink" : isParent ? "blue" : "green"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {record.email ?? record.phone ?? "No contact details"}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Pill tone="neutral">
                        {isParent
                          ? `${childCount} ${childCount === 1 ? "child" : "children"}`
                          : `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`}
                      </Pill>
                      <Pill tone={record.status === "active" ? "green" : "neutral"}>
                        {record.status}
                      </Pill>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Page>
  );
}

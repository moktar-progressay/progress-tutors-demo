import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { useTutorScope } from "@/lib/auth-scope";
import { fullName, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/homework")({
  head: () => ({
    meta: [{ title: "Homework - ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorHomework,
});

function TutorHomework() {
  const scope = useTutorScope();
  const classes = useTable("classes");
  const homework = useTable("homework_items", "due_date");
  const students = useTable("students");
  const [search, setSearch] = useState("");
  const myClasses = (classes.data ?? []).filter((item) => item.tutor_id === scope.tutorId);
  const classIds = new Set(myClasses.map((item) => item.id));
  const tasks = (homework.data ?? []).filter((task) => {
    if (!task.class_id || !classIds.has(task.class_id)) return false;
    const student = (students.data ?? []).find((item) => item.id === task.student_id);
    const query = search.trim().toLowerCase();
    return !query || `${task.title} ${fullName(student)}`.toLowerCase().includes(query);
  });
  const due = tasks.filter((task) => task.status !== "complete");
  const complete = tasks.filter((task) => task.status === "complete");

  return (
    <Page className="space-y-5">
      <PageHeader title="Homework" subtitle="Homework set for students in your classes" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Outstanding" value={String(due.length)} tone="amber" />
        <StatCard label="Completed" value={String(complete.length)} tone="green" />
        <StatCard label="Total" value={String(tasks.length)} tone="blue" />
      </div>
      <Section id="tutor-homework-list" title="Tasks">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search homework or student"
          className="mb-4 h-11 rounded-xl"
        />
        {tasks.length === 0 ? (
          <Empty>No homework matches your search. Add homework from a class or student page.</Empty>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const student = (students.data ?? []).find((item) => item.id === task.student_id);
              const lesson = myClasses.find((item) => item.id === task.class_id);
              return (
                <li key={task.id} className="rounded-xl border border-border px-4 py-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{task.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {fullName(student)} · {lesson?.name ?? "Class"}
                      </span>
                      {task.due_date ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Due {prettyDate(task.due_date)}
                        </span>
                      ) : null}
                    </span>
                    <Pill tone={task.status === "complete" ? "green" : "amber"}>{task.status}</Pill>
                    {student ? (
                      <Link
                        to="/tutor/students/$id"
                        params={{ id: student.id }}
                        className="text-xs font-bold text-primary"
                      >
                        Open student
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}

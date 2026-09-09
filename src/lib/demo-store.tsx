import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DELIVERED_LESSONS,
  PAYMENT_REQUESTS,
  type DeliveredLesson,
  type PRStatus,
  type Role,
} from "./demo-data";

export interface TutorRequest {
  id: string;
  lessonIds: string[];
  amount: number;
  hours: number;
  status: "Draft" | "Submitted";
}

export interface Enrolment {
  child: string;
  classId: string;
  className: string;
}

interface DemoState {
  role: Role;
  setRole: (r: Role) => void;

  collapsed: Record<string, boolean>;
  toggleSection: (id: string) => void;

  signedIn: Record<string, string>;
  signIn: (lessonId: string) => void;
  endLesson: (lessonId: string) => void;

  reviewed: Record<string, boolean>;
  submitReview: (lessonId: string) => void;

  deliveredReviewed: Record<string, boolean>;
  reviewDelivered: (id: string) => void;
  eligibleLessons: DeliveredLesson[];
  awaitingReview: DeliveredLesson[];

  tutorRequests: TutorRequest[];
  submitTutorRequest: () => void;

  prStatus: Record<string, PRStatus>;
  setPrStatus: (id: string, s: PRStatus) => void;

  selectedChild: string;
  setSelectedChild: (id: string) => void;

  enrolments: Enrolment[];
  addEnrolment: (e: Enrolment) => void;

  xp: number;
  tasksCompleted: number;
  addXp: (n: number) => void;
  level: number;
}

const DemoContext = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [signedInState, setSignedIn] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [deliveredReviewed, setDeliveredReviewed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DELIVERED_LESSONS.map((l) => [l.id, l.reviewed])),
  );
  const [tutorRequests, setTutorRequests] = useState<TutorRequest[]>([]);
  const [prStatus, setPrStatusState] = useState<Record<string, PRStatus>>(() =>
    Object.fromEntries(PAYMENT_REQUESTS.map((p) => [p.id, p.status])),
  );
  const [selectedChild, setSelectedChild] = useState("all");
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [xp, setXp] = useState(1250);
  const [tasksCompleted, setTasks] = useState(24);

  const value = useMemo<DemoState>(() => {
    const claimed = new Set(tutorRequests.flatMap((r) => r.lessonIds));
    const eligibleLessons = DELIVERED_LESSONS.filter(
      (l) => deliveredReviewed[l.id] && !claimed.has(l.id),
    );
    const awaitingReview = DELIVERED_LESSONS.filter((l) => !deliveredReviewed[l.id]);

    return {
      role,
      setRole,
      collapsed,
      toggleSection: (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] })),
      signedIn: signedInState,
      signIn: (lessonId) =>
        setSignedIn((s) => ({
          ...s,
          [lessonId]: new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      endLesson: (lessonId) =>
        setSignedIn((s) => {
          const next = { ...s };
          delete next[lessonId];
          return next;
        }),
      reviewed,
      submitReview: (lessonId) => setReviewed((r) => ({ ...r, [lessonId]: true })),
      deliveredReviewed,
      reviewDelivered: (id) => setDeliveredReviewed((d) => ({ ...d, [id]: true })),
      eligibleLessons,
      awaitingReview,
      tutorRequests,
      submitTutorRequest: () =>
        setTutorRequests((rs) => [
          {
            id: `PR-${1043 + rs.length}`,
            lessonIds: eligibleLessons.map((l) => l.id),
            amount: eligibleLessons.reduce((a, l) => a + l.rate * l.hours, 0),
            hours: eligibleLessons.reduce((a, l) => a + l.hours, 0),
            status: "Submitted",
          },
          ...rs,
        ]),
      prStatus,
      setPrStatus: (id, s) => setPrStatusState((p) => ({ ...p, [id]: s })),
      selectedChild,
      setSelectedChild,
      enrolments,
      addEnrolment: (e) => setEnrolments((list) => [...list, e]),
      xp,
      tasksCompleted,
      addXp: (n) => {
        setXp((x) => x + n);
        setTasks((t) => t + 1);
      },
      level: 7 + Math.floor(Math.max(0, xp - 1250) / 200),
    };
  }, [
    role,
    collapsed,
    signedInState,
    reviewed,
    deliveredReviewed,
    tutorRequests,
    prStatus,
    selectedChild,
    enrolments,
    xp,
    tasksCompleted,
  ]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}

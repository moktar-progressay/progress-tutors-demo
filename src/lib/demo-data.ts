// Seeded, illustrative demo data for the ProgressTutors interactive prototype.
// Nothing here is real: no backend, no auth, no payments.

export type Role = "admin" | "tutor" | "parent" | "student";

export type CapacityStatus = "available" | "nearly" | "full" | "over";

export interface Site {
  id: string;
  name: string;
  hours: string;
  classes: number;
  students: number;
  capacity: number;
  rooms: string[];
}

export interface Tutor {
  id: string;
  name: string;
  initials: string;
  subjects: string[];
  attendance: number;
  reviews: number;
  lessons: number;
  rate: number;
}

export interface Student {
  id: string;
  name: string;
  initials: string;
  year: string;
  parentId: string;
  parentName: string;
  attendance: number;
  status: "Active" | "Trial" | "Paused";
  classIds: string[];
}

export interface ClassSession {
  id: string;
  code: string;
  subject: string;
  level: string;
  type: "Group Class" | "1-to-1";
  siteId: string;
  room: string;
  day: string;
  start: string;
  end: string;
  tutorId: string;
  enrolled: number;
  capacity: number;
  status: "Active" | "Draft" | "Needs tutor";
  goprogress: boolean;
  attendance: number;
  price: number;
  recurrence: string;
}

export interface Lesson {
  id: string;
  classId: string;
  title: string;
  level: string;
  mode: "Online" | "In Person";
  location: string;
  tutorId: string;
  studentId?: string;
  groupCount?: number;
  dayLabel: string;
  start: string;
  end: string;
  rate: number;
}

export interface PaymentRequestLine {
  lessonId: string;
  date: string;
  who: string;
  scheduled: string;
  signIn: string;
  review: "Complete" | "Missing";
  goprogress: "Synced" | "Pending";
  rate: number;
  amount: number;
}

export type PRStatus = "Pending Review" | "Approved" | "Paid" | "Rejected" | "On Hold";

export interface PaymentRequest {
  id: string;
  tutorId: string;
  lessons: number;
  hours: number;
  amount: number;
  status: PRStatus;
  submitted: string;
  lines: PaymentRequestLine[];
}

export interface ClientAccount {
  id: string;
  parent: string;
  initials: string;
  email: string;
  children: string[];
  plan: string;
  nextPayment: string;
  amount: number;
  status: "Active" | "Failed" | "Paused" | "Overdue";
  credits: number;
  subscriptions: { child: string; plan: string; amount: number; status: string }[];
  invoices: { id: string; date: string; amount: number; status: string }[];
  payments: { id: string; date: string; amount: number; method: string; status: string }[];
}

export const ORG = "Progressay Tutors";

export const SITES: Site[] = [
  {
    id: "lancaster",
    name: "Lancaster Youth Hub",
    hours: "Sat–Sun 09:00–20:00",
    classes: 5,
    students: 32,
    capacity: 86,
    rooms: ["Room 1", "Room 2", "Room 3"],
  },
  {
    id: "freston",
    name: "Freston Road",
    hours: "Mon–Thu 16:00–20:00",
    classes: 5,
    students: 28,
    capacity: 72,
    rooms: ["Studio A", "Studio B"],
  },
  {
    id: "chelsea",
    name: "Chelsea Youth Hub",
    hours: "Sat–Sun 10:00–18:00",
    classes: 2,
    students: 14,
    capacity: 78,
    rooms: ["Room 1", "Room 2"],
  },
];

export const TUTORS: Tutor[] = [
  {
    id: "sarah-ahmed",
    name: "Sarah Ahmed",
    initials: "SA",
    subjects: ["Maths", "English"],
    attendance: 98,
    reviews: 42,
    lessons: 44,
    rate: 25,
  },
  {
    id: "james-wilson",
    name: "James Wilson",
    initials: "JW",
    subjects: ["Science", "Maths"],
    attendance: 94,
    reviews: 31,
    lessons: 36,
    rate: 24,
  },
  {
    id: "nadia-osei",
    name: "Nadia Osei",
    initials: "NO",
    subjects: ["English", "Humanities"],
    attendance: 91,
    reviews: 27,
    lessons: 30,
    rate: 22,
  },
  {
    id: "tom-baker",
    name: "Tom Baker",
    initials: "TB",
    subjects: ["Maths"],
    attendance: 88,
    reviews: 19,
    lessons: 24,
    rate: 22,
  },
];

export const CLASSES: ClassSession[] = [
  {
    id: "sune4",
    code: "SUNE4",
    subject: "GCSE English",
    level: "GCSE",
    type: "Group Class",
    siteId: "lancaster",
    room: "Room 2",
    day: "Sunday",
    start: "12:00",
    end: "13:00",
    tutorId: "sarah-ahmed",
    enrolled: 9,
    capacity: 10,
    status: "Active",
    goprogress: true,
    attendance: 92,
    price: 20,
    recurrence: "Weekly",
  },
  {
    id: "frm2",
    code: "FRM2",
    subject: "GCSE Maths",
    level: "GCSE",
    type: "Group Class",
    siteId: "freston",
    room: "Studio A",
    day: "Tuesday",
    start: "17:00",
    end: "18:00",
    tutorId: "james-wilson",
    enrolled: 7,
    capacity: 12,
    status: "Active",
    goprogress: true,
    attendance: 89,
    price: 20,
    recurrence: "Weekly",
  },
  {
    id: "chks2",
    code: "CHKS2",
    subject: "KS2 Maths",
    level: "KS2",
    type: "Group Class",
    siteId: "chelsea",
    room: "Room 1",
    day: "Sunday",
    start: "10:00",
    end: "11:00",
    tutorId: "",
    enrolled: 6,
    capacity: 10,
    status: "Needs tutor",
    goprogress: true,
    attendance: 87,
    price: 18,
    recurrence: "Weekly",
  },
  {
    id: "lanks3e",
    code: "LKS3E",
    subject: "KS3 English",
    level: "KS3",
    type: "Group Class",
    siteId: "lancaster",
    room: "Room 1",
    day: "Saturday",
    start: "11:00",
    end: "12:00",
    tutorId: "nadia-osei",
    enrolled: 10,
    capacity: 10,
    status: "Active",
    goprogress: true,
    attendance: 95,
    price: 20,
    recurrence: "Weekly",
  },
  {
    id: "m121",
    code: "M121",
    subject: "GCSE Maths",
    level: "GCSE",
    type: "1-to-1",
    siteId: "lancaster",
    room: "Online",
    day: "Wednesday",
    start: "17:00",
    end: "18:00",
    tutorId: "sarah-ahmed",
    enrolled: 1,
    capacity: 1,
    status: "Active",
    goprogress: true,
    attendance: 100,
    price: 32,
    recurrence: "Weekly",
  },
  {
    id: "frsci",
    code: "FRS1",
    subject: "GCSE Science",
    level: "GCSE",
    type: "Group Class",
    siteId: "freston",
    room: "Studio B",
    day: "Thursday",
    start: "18:00",
    end: "19:00",
    tutorId: "james-wilson",
    enrolled: 11,
    capacity: 12,
    status: "Active",
    goprogress: true,
    attendance: 90,
    price: 20,
    recurrence: "Weekly",
  },
  {
    id: "lanmb",
    code: "LMB1",
    subject: "GCSE Maths Booster",
    level: "GCSE",
    type: "Group Class",
    siteId: "lancaster",
    room: "Room 3",
    day: "Sunday",
    start: "11:00",
    end: "12:00",
    tutorId: "tom-baker",
    enrolled: 8,
    capacity: 10,
    status: "Active",
    goprogress: true,
    attendance: 84,
    price: 20,
    recurrence: "Weekly",
  },
  {
    id: "chks2e",
    code: "CKE1",
    subject: "KS2 English",
    level: "KS2",
    type: "Group Class",
    siteId: "chelsea",
    room: "Room 2",
    day: "Saturday",
    start: "13:00",
    end: "14:00",
    tutorId: "nadia-osei",
    enrolled: 8,
    capacity: 10,
    status: "Active",
    goprogress: false,
    attendance: 81,
    price: 18,
    recurrence: "Weekly",
  },
  {
    id: "fr11p",
    code: "F11P",
    subject: "11+ Reasoning",
    level: "11+",
    type: "Group Class",
    siteId: "freston",
    room: "Studio A",
    day: "Monday",
    start: "16:30",
    end: "17:30",
    tutorId: "tom-baker",
    enrolled: 13,
    capacity: 12,
    status: "Active",
    goprogress: true,
    attendance: 88,
    price: 22,
    recurrence: "Weekly",
  },
];

export const STUDENTS: Student[] = [
  {
    id: "aisha-khan",
    name: "Aisha Khan",
    initials: "AK",
    year: "Year 10",
    parentId: "sarah-khan",
    parentName: "Sarah Khan",
    attendance: 96,
    status: "Active",
    classIds: ["m121", "sune4"],
  },
  {
    id: "adam-khan",
    name: "Adam Khan",
    initials: "AD",
    year: "Year 8",
    parentId: "sarah-khan",
    parentName: "Sarah Khan",
    attendance: 91,
    status: "Active",
    classIds: ["lanks3e"],
  },
  {
    id: "yasmin-khan",
    name: "Yasmin Khan",
    initials: "YK",
    year: "Year 5",
    parentId: "sarah-khan",
    parentName: "Sarah Khan",
    attendance: 88,
    status: "Active",
    classIds: ["chks2"],
  },
  {
    id: "leo-martin",
    name: "Leo Martin",
    initials: "LM",
    year: "Year 10",
    parentId: "claire-martin",
    parentName: "Claire Martin",
    attendance: 93,
    status: "Active",
    classIds: ["sune4", "frm2"],
  },
  {
    id: "amina-bello",
    name: "Amina Bello",
    initials: "AB",
    year: "Year 11",
    parentId: "kemi-bello",
    parentName: "Kemi Bello",
    attendance: 97,
    status: "Active",
    classIds: ["sune4"],
  },
  {
    id: "harry-oconnor",
    name: "Harry O'Connor",
    initials: "HO",
    year: "Year 9",
    parentId: "dan-oconnor",
    parentName: "Dan O'Connor",
    attendance: 79,
    status: "Trial",
    classIds: ["sune4"],
  },
  {
    id: "mia-patel",
    name: "Mia Patel",
    initials: "MP",
    year: "Year 10",
    parentId: "raj-patel",
    parentName: "Raj Patel",
    attendance: 90,
    status: "Active",
    classIds: ["sune4", "lanmb"],
  },
  {
    id: "jamal-idris",
    name: "Jamal Idris",
    initials: "JI",
    year: "Year 10",
    parentId: "hana-idris",
    parentName: "Hana Idris",
    attendance: 85,
    status: "Active",
    classIds: ["sune4"],
  },
  {
    id: "elise-dubois",
    name: "Elise Dubois",
    initials: "ED",
    year: "Year 11",
    parentId: "marie-dubois",
    parentName: "Marie Dubois",
    attendance: 94,
    status: "Active",
    classIds: ["sune4", "frsci"],
  },
  {
    id: "noah-green",
    name: "Noah Green",
    initials: "NG",
    year: "Year 9",
    parentId: "beth-green",
    parentName: "Beth Green",
    attendance: 82,
    status: "Paused",
    classIds: ["sune4"],
  },
];

export const TUTOR_LESSONS: Lesson[] = [
  {
    id: "L-2201",
    classId: "m121",
    title: "GCSE Maths",
    level: "GCSE",
    mode: "Online",
    location: "Online",
    tutorId: "sarah-ahmed",
    studentId: "aisha-khan",
    dayLabel: "Today",
    start: "17:00",
    end: "18:00",
    rate: 25,
  },
  {
    id: "L-2202",
    classId: "sune4",
    title: "GCSE English",
    level: "GCSE",
    mode: "In Person",
    location: "Lancaster Youth Hub",
    tutorId: "sarah-ahmed",
    groupCount: 9,
    dayLabel: "Today",
    start: "18:30",
    end: "19:30",
    rate: 25,
  },
  {
    id: "L-2203",
    classId: "lanmb",
    title: "GCSE Maths Booster",
    level: "GCSE",
    mode: "In Person",
    location: "Lancaster Youth Hub",
    tutorId: "sarah-ahmed",
    groupCount: 8,
    dayLabel: "Today",
    start: "20:00",
    end: "21:00",
    rate: 25,
  },
  {
    id: "L-2204",
    classId: "m121",
    title: "GCSE Maths",
    level: "GCSE",
    mode: "Online",
    location: "Online",
    tutorId: "sarah-ahmed",
    studentId: "aisha-khan",
    dayLabel: "Tomorrow",
    start: "17:00",
    end: "18:00",
    rate: 25,
  },
  {
    id: "L-2205",
    classId: "sune4",
    title: "GCSE English",
    level: "GCSE",
    mode: "In Person",
    location: "Lancaster Youth Hub",
    tutorId: "sarah-ahmed",
    groupCount: 9,
    dayLabel: "Sunday",
    start: "12:00",
    end: "13:00",
    rate: 25,
  },
];

// Lessons already delivered, awaiting review or ready to request payment.
export interface DeliveredLesson {
  id: string;
  date: string;
  who: string;
  classLabel: string;
  scheduled: string;
  signIn: string;
  reviewed: boolean;
  goprogress: "Synced" | "Pending";
  hours: number;
  rate: number;
}

export const DELIVERED_LESSONS: DeliveredLesson[] = [
  {
    id: "D-101",
    date: "2 Sep",
    who: "Aisha Khan",
    classLabel: "GCSE Maths · 1-to-1",
    scheduled: "17:00–18:00",
    signIn: "16:57",
    reviewed: true,
    goprogress: "Synced",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-102",
    date: "2 Sep",
    who: "GCSE English",
    classLabel: "Group · Lancaster Youth Hub",
    scheduled: "18:30–19:30",
    signIn: "18:28",
    reviewed: true,
    goprogress: "Synced",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-103",
    date: "3 Sep",
    who: "GCSE Maths Booster",
    classLabel: "Group · Lancaster Youth Hub",
    scheduled: "20:00–21:00",
    signIn: "19:55",
    reviewed: true,
    goprogress: "Synced",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-104",
    date: "4 Sep",
    who: "Aisha Khan",
    classLabel: "GCSE Maths · 1-to-1",
    scheduled: "17:00–18:00",
    signIn: "17:01",
    reviewed: true,
    goprogress: "Synced",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-105",
    date: "5 Sep",
    who: "GCSE English",
    classLabel: "Group · Lancaster Youth Hub",
    scheduled: "18:30–19:30",
    signIn: "18:30",
    reviewed: true,
    goprogress: "Synced",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-106",
    date: "6 Sep",
    who: "Mia Patel",
    classLabel: "GCSE Maths · 1-to-1",
    scheduled: "16:00–17:00",
    signIn: "15:58",
    reviewed: true,
    goprogress: "Synced",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-107",
    date: "7 Sep",
    who: "GCSE English",
    classLabel: "Group · Lancaster Youth Hub",
    scheduled: "12:00–13:00",
    signIn: "11:56",
    reviewed: true,
    goprogress: "Synced",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-108",
    date: "7 Sep",
    who: "Leo Martin",
    classLabel: "GCSE Maths · 1-to-1",
    scheduled: "14:00–15:00",
    signIn: "13:59",
    reviewed: false,
    goprogress: "Pending",
    hours: 1,
    rate: 25,
  },
  {
    id: "D-109",
    date: "8 Sep",
    who: "GCSE Maths Booster",
    classLabel: "Group · Lancaster Youth Hub",
    scheduled: "20:00–21:00",
    signIn: "19:58",
    reviewed: false,
    goprogress: "Pending",
    hours: 1,
    rate: 25,
  },
];

const prLines = (ids: string[]): PaymentRequestLine[] =>
  ids.map((id) => {
    const l = (DELIVERED_LESSONS.find((d) => d.id === id) ?? DELIVERED_LESSONS[0]) as DeliveredLesson;
    return {
      lessonId: l.id,
      date: l.date,
      who: l.who,
      scheduled: l.scheduled,
      signIn: l.signIn,
      review: l.reviewed ? "Complete" : "Missing",
      goprogress: l.goprogress,
      rate: l.rate,
      amount: l.rate * l.hours,
    };
  });

export const PAYMENT_REQUESTS: PaymentRequest[] = [
  {
    id: "PR-1042",
    tutorId: "sarah-ahmed",
    lessons: 12,
    hours: 12,
    amount: 300,
    status: "Pending Review",
    submitted: "8 Sep",
    lines: prLines([
      "D-101",
      "D-102",
      "D-103",
      "D-104",
      "D-105",
      "D-106",
      "D-107",
      "D-101",
      "D-102",
      "D-103",
      "D-104",
      "D-105",
    ]),
  },
  {
    id: "PR-1041",
    tutorId: "james-wilson",
    lessons: 9,
    hours: 9,
    amount: 216,
    status: "Pending Review",
    submitted: "8 Sep",
    lines: prLines(["D-102", "D-103", "D-105", "D-106", "D-107"]),
  },
  {
    id: "PR-1040",
    tutorId: "nadia-osei",
    lessons: 8,
    hours: 8,
    amount: 176,
    status: "Approved",
    submitted: "5 Sep",
    lines: prLines(["D-101", "D-104", "D-106"]),
  },
  {
    id: "PR-1039",
    tutorId: "tom-baker",
    lessons: 6,
    hours: 6,
    amount: 132,
    status: "Approved",
    submitted: "4 Sep",
    lines: prLines(["D-103", "D-105"]),
  },
  {
    id: "PR-1038",
    tutorId: "sarah-ahmed",
    lessons: 10,
    hours: 10,
    amount: 250,
    status: "Paid",
    submitted: "29 Aug",
    lines: prLines(["D-101", "D-102", "D-103"]),
  },
  {
    id: "PR-1037",
    tutorId: "tom-baker",
    lessons: 4,
    hours: 4,
    amount: 88,
    status: "On Hold",
    submitted: "28 Aug",
    lines: prLines(["D-108", "D-109"]),
  },
  {
    id: "PR-1036",
    tutorId: "james-wilson",
    lessons: 3,
    hours: 3,
    amount: 72,
    status: "Rejected",
    submitted: "22 Aug",
    lines: prLines(["D-109"]),
  },
];

export const CLIENTS: ClientAccount[] = [
  {
    id: "sarah-khan",
    parent: "Sarah Khan",
    initials: "SK",
    email: "sarah.khan@example.com",
    children: ["Aisha Khan", "Adam Khan", "Yasmin Khan"],
    plan: "Household Monthly",
    nextPayment: "1 Oct",
    amount: 140,
    status: "Active",
    credits: 20,
    subscriptions: [
      { child: "Aisha Khan", plan: "GCSE Maths 1-to-1 · Weekly", amount: 80, status: "Active" },
      { child: "Adam Khan", plan: "KS3 English Group · Weekly", amount: 60, status: "Active" },
      { child: "Yasmin Khan", plan: "KS2 Maths Group · Weekly", amount: 0, status: "Trial" },
    ],
    invoices: [
      { id: "INV-8841", date: "1 Sep", amount: 140, status: "Paid" },
      { id: "INV-8712", date: "1 Aug", amount: 140, status: "Paid" },
    ],
    payments: [
      { id: "PY-5521", date: "1 Sep", amount: 140, method: "Card ••42", status: "Succeeded" },
      { id: "PY-5390", date: "1 Aug", amount: 140, method: "Card ••42", status: "Succeeded" },
    ],
  },
  {
    id: "claire-martin",
    parent: "Claire Martin",
    initials: "CM",
    email: "claire.martin@example.com",
    children: ["Leo Martin"],
    plan: "Single Child Monthly",
    nextPayment: "3 Oct",
    amount: 80,
    status: "Failed",
    credits: 0,
    subscriptions: [
      { child: "Leo Martin", plan: "GCSE English Group · Weekly", amount: 80, status: "Payment failed" },
    ],
    invoices: [{ id: "INV-8842", date: "3 Sep", amount: 80, status: "Overdue" }],
    payments: [{ id: "PY-5522", date: "3 Sep", amount: 80, method: "Card ••09", status: "Failed" }],
  },
  {
    id: "kemi-bello",
    parent: "Kemi Bello",
    initials: "KB",
    email: "kemi.bello@example.com",
    children: ["Amina Bello"],
    plan: "Termly Upfront",
    nextPayment: "5 Jan",
    amount: 240,
    status: "Active",
    credits: 0,
    subscriptions: [{ child: "Amina Bello", plan: "GCSE English Group · Termly", amount: 240, status: "Active" }],
    invoices: [{ id: "INV-8790", date: "5 Sep", amount: 240, status: "Paid" }],
    payments: [{ id: "PY-5470", date: "5 Sep", amount: 240, method: "Bank transfer", status: "Succeeded" }],
  },
  {
    id: "raj-patel",
    parent: "Raj Patel",
    initials: "RP",
    email: "raj.patel@example.com",
    children: ["Mia Patel"],
    plan: "Household Monthly",
    nextPayment: "12 Sep",
    amount: 120,
    status: "Overdue",
    credits: 10,
    subscriptions: [{ child: "Mia Patel", plan: "Maths Booster · Weekly", amount: 120, status: "Active" }],
    invoices: [{ id: "INV-8801", date: "12 Aug", amount: 120, status: "Outstanding" }],
    payments: [],
  },
  {
    id: "hana-idris",
    parent: "Hana Idris",
    initials: "HI",
    email: "hana.idris@example.com",
    children: ["Jamal Idris"],
    plan: "Single Child Monthly",
    nextPayment: "1 Oct",
    amount: 80,
    status: "Active",
    credits: 0,
    subscriptions: [{ child: "Jamal Idris", plan: "GCSE English Group · Weekly", amount: 80, status: "Active" }],
    invoices: [{ id: "INV-8843", date: "1 Sep", amount: 80, status: "Paid" }],
    payments: [{ id: "PY-5523", date: "1 Sep", amount: 80, method: "Card ••77", status: "Succeeded" }],
  },
  {
    id: "beth-green",
    parent: "Beth Green",
    initials: "BG",
    email: "beth.green@example.com",
    children: ["Noah Green"],
    plan: "Paused",
    nextPayment: "—",
    amount: 0,
    status: "Paused",
    credits: 40,
    subscriptions: [{ child: "Noah Green", plan: "GCSE English Group · Weekly", amount: 80, status: "Paused" }],
    invoices: [],
    payments: [],
  },
];

export interface ChildProfile {
  id: string;
  name: string;
  short: string;
  initials: string;
  year: string;
  xp: number;
  level: number;
  streak: number;
  progress: number;
  monthly: number;
  lessons: { subject: string; when: string; where: string; tutor: string }[];
  homework: { title: string; subject: string; due: string; status: "Due" | "Submitted" }[];
}

export const CHILDREN: ChildProfile[] = [
  {
    id: "aisha-khan",
    name: "Aisha Khan",
    short: "Aisha",
    initials: "AK",
    year: "Year 10",
    xp: 1250,
    level: 7,
    streak: 12,
    progress: 72,
    monthly: 80,
    lessons: [
      { subject: "GCSE Maths", when: "Today 17:00", where: "Online", tutor: "Sarah Ahmed" },
      { subject: "GCSE English", when: "Sunday 12:00", where: "Lancaster Youth Hub", tutor: "Sarah Ahmed" },
    ],
    homework: [
      { title: "Quadratic equations", subject: "GCSE Maths", due: "Due tomorrow", status: "Due" },
      { title: "Poetry comparison notes", subject: "GCSE English", due: "Due Friday", status: "Due" },
      { title: "Trigonometry recap", subject: "GCSE Maths", due: "Submitted", status: "Submitted" },
    ],
  },
  {
    id: "adam-khan",
    name: "Adam Khan",
    short: "Adam",
    initials: "AD",
    year: "Year 8",
    xp: 780,
    level: 5,
    streak: 6,
    progress: 58,
    monthly: 60,
    lessons: [
      { subject: "KS3 English", when: "Saturday 11:00", where: "Lancaster Youth Hub", tutor: "Nadia Osei" },
    ],
    homework: [{ title: "English essay plan", subject: "KS3 English", due: "Due Friday", status: "Due" }],
  },
  {
    id: "yasmin-khan",
    name: "Yasmin Khan",
    short: "Yasmin",
    initials: "YK",
    year: "Year 5",
    xp: 430,
    level: 3,
    streak: 4,
    progress: 41,
    monthly: 0,
    lessons: [{ subject: "KS2 Maths", when: "Sunday 10:00", where: "Chelsea Youth Hub", tutor: "Tutor needed" }],
    homework: [{ title: "Times tables practice", subject: "KS2 Maths", due: "Due Sunday", status: "Due" }],
  },
];

export const BADGES = [
  { name: "Perfect Attendance", icon: "🎯", earned: true },
  { name: "Homework Hero", icon: "📚", earned: true },
  { name: "Grade Up", icon: "📈", earned: true },
  { name: "10 Week Streak", icon: "🔥", earned: true },
  { name: "Course Complete", icon: "🏆", earned: false },
  { name: "Early Bird", icon: "🌅", earned: false },
];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const site = (id: string) => SITES.find((s) => s.id === id);
export const tutor = (id: string) => TUTORS.find((t) => t.id === id);
export const klass = (id: string) => CLASSES.find((c) => c.id === id);
export const clientById = (id: string) => CLIENTS.find((c) => c.id === id);
export const childById = (id: string) => CHILDREN.find((c) => c.id === id);

export function capacityStatus(enrolled: number, capacity: number): CapacityStatus {
  if (enrolled > capacity) return "over";
  if (enrolled === capacity) return "full";
  if (enrolled / capacity >= 0.8) return "nearly";
  return "available";
}

export const CAPACITY_LABEL: Record<CapacityStatus, string> = {
  available: "Available",
  nearly: "Nearly Full",
  full: "Full",
  over: "Over Capacity",
};

export const GOPROGRESS_URL = "https://goprogress.example.com";

export const money = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

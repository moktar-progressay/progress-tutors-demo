/** Minimal RFC4180-ish CSV parser that runs entirely in the browser. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c !== "")) rows.push(row);
    row = [];
  };

  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) pushRow();

  const headers = rows.shift() ?? [];
  return { headers, rows };
}

/** Suggests a target field for a CSV column header. */
export function guessField(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z]/g, "");
  const map: Record<string, string> = {
    fullname: "full_name",
    name: "full_name",
    studentname: "full_name",
    firstname: "first_name",
    lastname: "last_name",
    surname: "last_name",
    email: "email",
    emailaddress: "email",
    age: "age",
    dob: "date_of_birth",
    dateofbirth: "date_of_birth",
    birthday: "date_of_birth",
    yeargroup: "year_group",
    year: "year_group",
    school: "school",
    schoolcollege: "school",
    college: "school",
    emergencycontactname: "emergency_contact_name",
    emergencycontact: "emergency_contact_name",
    emergencycontactnumber: "emergency_contact_phone",
    emergencycontactphone: "emergency_contact_phone",
    allergies: "allergy_notes",
    allergy: "allergy_notes",
    medicalconditions: "medical_notes",
    medical: "medical_notes",
    send: "send_flag",
    ehcp: "ehcp_flag",
    courses: "courses_note",
    course: "courses_note",
    phone: "phone",
    mobile: "phone",
    telephone: "phone",
    notes: "notes",
  };
  return map[h] ?? "ignore";
}

export const IMPORT_FIELDS: { value: string; label: string }[] = [
  { value: "ignore", label: "Do not import" },
  { value: "full_name", label: "Full name" },
  { value: "first_name", label: "First name" },
  { value: "last_name", label: "Last name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "age", label: "Age" },
  { value: "date_of_birth", label: "Date of birth" },
  { value: "year_group", label: "Year group" },
  { value: "school", label: "School / college" },
  { value: "emergency_contact_name", label: "Emergency contact name" },
  { value: "emergency_contact_phone", label: "Emergency contact number" },
  { value: "allergy_notes", label: "Allergies" },
  { value: "medical_notes", label: "Medical conditions" },
  { value: "send_flag", label: "SEND" },
  { value: "ehcp_flag", label: "EHCP" },
  { value: "courses_note", label: "Courses" },
  { value: "notes", label: "Notes" },
];

export const truthy = (v: string) => ["yes", "y", "true", "1", "send", "ehcp"].includes(v.trim().toLowerCase());

/** Accepts dd/mm/yyyy, yyyy-mm-dd and similar; returns ISO or null. */
export function toIsoDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y!.length === 2 ? `20${y}` : y!;
    return `${year}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export function splitName(full: string): { first: string; last: string | null } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: null };
  if (parts.length === 1) return { first: parts[0]!, last: null };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

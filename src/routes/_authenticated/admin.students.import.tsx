import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { SelectField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { IMPORT_FIELDS, guessField, parseCsv, splitName, toIsoDate, truthy } from "@/lib/csv";
import { fullName, useTable, useUpsert, type Insert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/students/import")({
  head: () => ({
    meta: [
      { title: "Import Students — ProgressTutors" },
      { name: "description", content: "Upload an existing student CSV, map the columns and load records into the shared database." },
      { property: "og:title", content: "Import Students — ProgressTutors" },
      { property: "og:description", content: "Bulk import students from a CSV file." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImportStudents,
});

interface Prepared {
  index: number;
  payload: Insert<"students">;
  duplicate: boolean;
  reason: string;
  include: boolean;
}

function ImportStudents() {
  const navigate = useNavigate();
  const students = useTable("students");
  const classes = useTable("classes", "name");
  const createStudents = useUpsert("students");
  const createEnrolments = useUpsert("class_enrolments", ["students"]);

  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<string[]>([]);
  const [targetClass, setTargetClass] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);

  const existing = students.data ?? [];

  const prepared = useMemo<Prepared[]>(() => {
    if (rows.length === 0) return [];
    return rows.map((cells, index) => {
      const values: Record<string, string> = {};
      mapping.forEach((field, i) => {
        if (field !== "ignore" && cells[i]) values[field] = cells[i]!.trim();
      });

      let first = values["first_name"] ?? "";
      let last: string | null = values["last_name"] ?? null;
      if (!first && values["full_name"]) {
        const split = splitName(values["full_name"]);
        first = split.first;
        last = last ?? split.last;
      }

      let dob = values["date_of_birth"] ? toIsoDate(values["date_of_birth"]) : null;
      if (!dob && values["age"]) {
        dob = null; // age alone cannot become a reliable date of birth
      }

      const notesParts = [values["notes"], values["age"] ? `Age given as ${values["age"]}` : ""].filter(Boolean);

      const payload: Insert<"students"> = {
        first_name: first,
        last_name: last,
        email: values["email"] ?? null,
        phone: values["phone"] ?? null,
        date_of_birth: dob,
        year_group: values["year_group"] ?? null,
        school: values["school"] ?? null,
        emergency_contact_name: values["emergency_contact_name"] ?? null,
        emergency_contact_phone: values["emergency_contact_phone"] ?? null,
        allergy_notes: values["allergy_notes"] ?? null,
        medical_notes: values["medical_notes"] ?? null,
        send_flag: values["send_flag"] ? truthy(values["send_flag"]) : false,
        ehcp_flag: values["ehcp_flag"] ? truthy(values["ehcp_flag"]) : false,
        courses_note: values["courses_note"] ?? null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
        status: "active",
      };

      const email = (payload.email ?? "").toLowerCase();
      let duplicate = false;
      let reason = "";
      if (email) {
        duplicate = existing.some((s) => (s.email ?? "").toLowerCase() === email);
        if (duplicate) reason = "Same email already in the database";
      }
      if (!duplicate && payload.date_of_birth) {
        duplicate = existing.some(
          (s) =>
            fullName(s).toLowerCase() === fullName(payload as never).toLowerCase() &&
            s.date_of_birth === payload.date_of_birth,
        );
        if (duplicate) reason = "Same name and date of birth already exists";
      }

      return { index, payload, duplicate, reason, include: !(duplicate && skipDuplicates) && first !== "" };
    });
  }, [rows, mapping, existing, skipDuplicates]);

  const duplicates = prepared.filter((p) => p.duplicate).length;
  const invalid = prepared.filter((p) => p.payload.first_name === "").length;
  const toImport = prepared.filter((p) => p.include);

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers: h, rows: r } = parseCsv(text);
    setFileName(file.name);
    setHeaders(h);
    setRows(r);
    setMapping(h.map(guessField));
    setDone(0);
  }

  async function runImport() {
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      const inserted = await createStudents.mutateAsync(toImport.map((p) => p.payload));
      if (targetClass) {
        await createEnrolments.mutateAsync(
          inserted.map((s) => ({ class_id: targetClass, student_id: s.id })),
        );
      }
      setDone(inserted.length);
      toast.success(`${inserted.length} students imported into the shared database`);
      setRows([]);
      setHeaders([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/admin/students" className="hover:text-primary">
            Students
          </Link>
        }
        title="Import students from CSV"
        subtitle="The file is read in your browser; only the mapped rows are saved."
      />

      <Section id="import-upload" title="1. Choose your file">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="block w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
        />
        {fileName ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {fileName} · {rows.length} rows found
          </p>
        ) : null}
        {done > 0 ? (
          <div className="mt-3 rounded-xl bg-tile-green px-4 py-3 text-sm font-semibold text-tile-green-ink">
            {done} students imported.{" "}
            <button type="button" className="underline" onClick={() => navigate({ to: "/admin/students" })}>
              View the roster
            </button>
          </div>
        ) : null}
      </Section>

      {headers.length > 0 ? (
        <>
          <Section id="import-map" title="2. Match your columns">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h, i) => (
                <SelectField
                  key={`${h}-${i}`}
                  label={h || `Column ${i + 1}`}
                  value={mapping[i] ?? "ignore"}
                  onChange={(v) => setMapping((m) => m.map((x, idx) => (idx === i ? v : x)))}
                  options={IMPORT_FIELDS}
                />
              ))}
            </div>
          </Section>

          <Section id="import-options" title="3. Where should they go?">
            <div className="flex flex-wrap items-end gap-3">
              <SelectField
                label="Add everyone to"
                value={targetClass}
                onChange={setTargetClass}
                options={[
                  { value: "", label: "Unassigned pool (no class)" },
                  ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="h-4 w-4"
                />
                Skip likely duplicates
              </label>
            </div>
          </Section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Rows in file" value={String(rows.length)} tone="blue" />
            <StatCard label="Possible duplicates" value={String(duplicates)} tone="amber" />
            <StatCard label="Missing a name" value={String(invalid)} tone="pink" />
            <StatCard label="Will be imported" value={String(toImport.length)} tone="green" />
          </div>

          <Section id="import-preview" title="4. Preview" subtitle="First 25 rows">
            {prepared.length === 0 ? (
              <Empty>Nothing to preview yet.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      {["Import", "Name", "Email", "Year", "DOB", "Flags", "Status"].map((h) => (
                        <th key={h} className="pb-2 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prepared.slice(0, 25).map((p) => (
                      <tr key={p.index} className="border-t border-border">
                        <td className="py-2">
                          <input type="checkbox" checked={p.include} readOnly className="h-4 w-4" />
                        </td>
                        <td className="py-2 font-semibold">
                          {[p.payload.first_name, p.payload.last_name].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="py-2">{p.payload.email ?? "—"}</td>
                        <td className="py-2">{p.payload.year_group ?? "—"}</td>
                        <td className="py-2">{p.payload.date_of_birth ?? "—"}</td>
                        <td className="py-2">
                          {p.payload.send_flag ? <Pill tone="amber">SEND</Pill> : null}{" "}
                          {p.payload.ehcp_flag ? <Pill tone="amber">EHCP</Pill> : null}
                        </td>
                        <td className="py-2">
                          {p.payload.first_name === "" ? (
                            <Pill tone="pink">No name</Pill>
                          ) : p.duplicate ? (
                            <Pill tone="amber">{p.reason}</Pill>
                          ) : (
                            <Pill tone="green">New</Pill>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button className="mt-4" disabled={importing || toImport.length === 0} onClick={runImport}>
              {importing ? "Importing…" : `Import ${toImport.length} students`}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Parent records are not created automatically — link guardians afterwards from each student record.
            </p>
          </Section>
        </>
      ) : null}
    </Page>
  );
}

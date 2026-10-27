import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { getBackend } from "@/lib/server/backend";
import { requireAdmin } from "@/lib/server/session";
import { AccessDenied, AdminShell } from "../admin-shell";
import { FacultyForm } from "../catalog-forms";
import { DeleteCatalogItem } from "../delete-button";

export const metadata: Metadata = { title: "Admin · Instructors" };

type Props = { searchParams: Promise<{ edit?: string; q?: string }> };

export default async function AdminFacultyPage({ searchParams }: Props) {
  if (!(await requireAdmin("/admin/faculty"))) return <AccessDenied />;
  const { edit, q = "" } = await searchParams;
  const backend = await getBackend();
  const [faculty, departments] = await Promise.all([backend.listFaculty(), backend.listDepartments()]);
  const editing = faculty.find((f) => f.id === edit) ?? null;
  const term = q.trim().toLowerCase();
  const shown = term
    ? faculty.filter((f) => f.name.toLowerCase().includes(term) || (f.shortForm ?? "").toLowerCase().includes(term))
    : faculty;

  return (
    <AdminShell title="Instructors" description="Instructors can be linked to courses and to uploaded materials.">
      <FacultyForm member={editing} departments={departments} />
      <div className="mb-4 max-w-md">
        <SearchBox action="/admin/faculty" defaultValue={q} placeholder="Filter instructors" label="Filter instructors" />
      </div>
      <p className="mb-2 text-sm text-ink-muted">{shown.length} of {faculty.length} instructors</p>
      <ul className="card divide-y divide-border">
        {shown.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{f.name}</p>
              <p className="text-sm text-ink-subtle">{[f.shortForm, f.departmentCode, f.email].filter(Boolean).join(" · ") || "—"}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href={`/admin/faculty?edit=${f.id}`} scroll={false} className="rounded-md px-3 py-1.5 text-sm font-medium text-brand hover:bg-surface-muted">Edit</Link>
              <DeleteCatalogItem id={f.id} kind="faculty" name={f.name} body="They will be removed from their courses. Materials linked to them stay published, without an instructor." />
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="px-4 py-6 text-sm text-ink-muted">No instructors found.</li>}
      </ul>
    </AdminShell>
  );
}

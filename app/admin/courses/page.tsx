import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { Pagination, pageIndex } from "@/components/ui/pagination";
import { plural } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { requireAdmin } from "@/lib/server/session";
import { firstParam, withParams } from "@/lib/url";
import { courseSlug, normalizeCourseCode } from "@/lib/validation";
import { AccessDenied, AdminShell } from "../admin-shell";
import { CourseForm } from "../catalog-forms";
import { DeleteCatalogItem } from "../delete-button";

export const metadata: Metadata = { title: "Admin · Courses" };

const PAGE_SIZE = 25;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCoursesPage({ searchParams }: Props) {
  if (!(await requireAdmin("/admin/courses"))) return <AccessDenied />;
  const sp = await searchParams;
  const q = firstParam(sp.q).trim().slice(0, 100);
  const page = pageIndex(sp.page);
  const edit = firstParam(sp.edit);

  const backend = await getBackend();
  const [result, departments, faculty, editing] = await Promise.all([
    backend.searchCourses({ query: q, page, pageSize: PAGE_SIZE }),
    backend.listDepartments(),
    backend.listFaculty(),
    edit ? backend.getCourseByCode(normalizeCourseCode(edit)) : Promise.resolve(null),
  ]);

  return (
    <AdminShell title="Courses" description="Course codes must be unique. A course with materials can't be deleted until they're removed.">
      <CourseForm
        departments={departments}
        faculty={faculty}
        course={
          editing && {
            id: editing.id,
            code: editing.code,
            title: editing.title,
            departmentId: editing.department.id,
            creditHours: editing.creditHours,
            facultyIds: editing.faculty.map((f) => f.id),
          }
        }
      />
      <div className="mb-4 max-w-md">
        <SearchBox action="/admin/courses" defaultValue={q} placeholder="Filter by code or title" label="Filter courses" />
      </div>
      <p className="mb-2 text-sm text-ink-muted">{plural(result.total, "course")}</p>
      <ul className="card divide-y divide-border">
        {result.items.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium"><span className="text-brand">{c.code}</span> · {c.title}</p>
              <p className="text-sm text-ink-subtle">
                {c.department.code} · {c.creditHours ?? "—"} cr · {plural(c.facultyCount, "instructor")} · {plural(c.materialCount, "material")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link href={withParams("/admin/courses", { q, page: page > 0 ? page + 1 : null, edit: courseSlug(c.code) })} scroll={false} className="rounded-md px-3 py-1.5 text-sm font-medium text-brand hover:bg-surface-muted">Edit</Link>
              <DeleteCatalogItem id={c.id} kind="course" name={c.code} body="Students' saved-course entries for it are removed too. Courses that still have materials can't be deleted." />
            </div>
          </li>
        ))}
        {result.items.length === 0 && <li className="px-4 py-6 text-sm text-ink-muted">No courses found.</li>}
      </ul>
      <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} href={(p) => withParams("/admin/courses", { q, page: p > 1 ? p : null })} />
    </AdminShell>
  );
}

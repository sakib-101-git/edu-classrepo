import type { Metadata } from "next";
import Link from "next/link";
import { plural } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { requireAdmin } from "@/lib/server/session";
import { AccessDenied, AdminShell } from "../admin-shell";
import { DepartmentForm } from "../catalog-forms";
import { DeleteCatalogItem } from "../delete-button";

export const metadata: Metadata = { title: "Admin · Departments" };

type Props = { searchParams: Promise<{ edit?: string }> };

export default async function AdminDepartmentsPage({ searchParams }: Props) {
  if (!(await requireAdmin("/admin/departments"))) return <AccessDenied />;
  const { edit } = await searchParams;
  const departments = await (await getBackend()).listDepartments();
  const editing = departments.find((d) => d.id === edit) ?? null;

  return (
    <AdminShell title="Departments" description="Departments group courses and instructors.">
      <DepartmentForm department={editing} />
      <ul className="card divide-y divide-border">
        {departments.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium"><span className="text-brand">{d.code}</span> · {d.name}</p>
              <p className="text-sm text-ink-subtle">{plural(d.courseCount, "course")} · {plural(d.materialCount, "material")}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href={`/admin/departments?edit=${d.id}`} scroll={false} className="rounded-md px-3 py-1.5 text-sm font-medium text-brand hover:bg-surface-muted">Edit</Link>
              <DeleteCatalogItem id={d.id} kind="department" name={d.code} body="Only departments without courses can be deleted. Instructors in it will be kept without a department." />
            </div>
          </li>
        ))}
        {departments.length === 0 && <li className="px-4 py-6 text-sm text-ink-muted">No departments yet. Add the first one above.</li>}
      </ul>
    </AdminShell>
  );
}

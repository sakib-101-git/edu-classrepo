import type { Metadata } from "next";
import Link from "next/link";
import { Library } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { plural } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const departments = await (await getBackend()).listDepartments();
  return (
    <div className="container-page py-10">
      <PageHeader title="Departments" description="Start from your department to see its courses and instructors." />
      {departments.length === 0 ? (
        <EmptyState icon={Library} title="No departments yet">The catalog hasn&apos;t been set up yet.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {departments.map((d) => (
            <li key={d.id}>
              <Link
                href={`/departments/${d.code.toLowerCase()}`}
                className="card flex items-center gap-4 p-5 transition-colors hover:border-border-strong hover:bg-[#fffdfa]"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-soft font-semibold tracking-wide text-brand">
                  {d.code}
                </span>
                <span>
                  <span className="block text-lg font-medium">{d.name}</span>
                  <span className="block text-sm text-ink-subtle">
                    {plural(d.courseCount, "course")} · {plural(d.materialCount, "published material")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { CourseGrid } from "@/components/course-card";
import { KindIcon } from "@/components/material-list";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBytes, kindLabel } from "@/lib/files";
import { formatDate, plural } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { courseSlug } from "@/lib/validation";

export const metadata: Metadata = { title: "Search" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const backend = await getBackend();
  const [courses, faculty, materials] = q
    ? await Promise.all([
        backend.searchCourses({ query: q, page: 0, pageSize: 9 }),
        backend.searchFaculty(q),
        backend.searchMaterials(q),
      ])
    : [null, [], []];
  const nothing = q && courses?.total === 0 && faculty.length === 0 && materials.length === 0;

  return (
    <div className="container-page py-10">
      <PageHeader title={q ? `Results for “${q}”` : "Search"} />
      <div className="mb-10 max-w-2xl">
        <SearchBox defaultValue={q} />
      </div>

      {!q && <p className="text-ink-muted">Search by course code (CSE 211), course title, department, instructor or material title.</p>}

      {nothing && (
        <EmptyState icon={SearchX} title="No matches">
          Try a course code like <q>CSE 111</q>, a shorter word, or{" "}
          <Link href="/courses" className="font-medium text-brand hover:underline">browse all courses</Link>.
        </EmptyState>
      )}

      {courses && courses.total > 0 && (
        <section aria-labelledby="r-courses" className="mb-12">
          <SectionHeading
            id="r-courses"
            title={`Courses (${courses.total})`}
            action={
              courses.total > courses.items.length && (
                <Link href={`/courses?q=${encodeURIComponent(q)}`} className="text-sm font-medium text-brand hover:underline">
                  See all {courses.total}
                </Link>
              )
            }
          />
          <CourseGrid courses={courses.items} />
        </section>
      )}

      {materials.length > 0 && (
        <section aria-labelledby="r-materials" className="mb-12">
          <SectionHeading id="r-materials" title={`Materials (${materials.length}${materials.length === 12 ? "+" : ""})`} />
          <ul className="card divide-y divide-border">
            {materials.map((m) => (
              <li key={m.id} className="flex gap-3 px-4 py-3.5">
                <KindIcon kind={m.kind} />
                <div className="min-w-0">
                  <Link href={`/materials/${m.id}`} className="font-medium hover:text-brand hover:underline">{m.title}</Link>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-subtle">
                    <Link href={`/courses/${courseSlug(m.courseCode)}`} className="font-medium text-ink-muted hover:underline">
                      {m.courseCode}
                    </Link>{" "}
                    · {m.facultyName ? `${m.facultyName} · ` : ""}{kindLabel(m.kind)} · {formatBytes(m.sizeBytes)} · {formatDate(m.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faculty.length > 0 && (
        <section aria-labelledby="r-faculty">
          <SectionHeading id="r-faculty" title={`Instructors (${faculty.length})`} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {faculty.map((f) => (
              <li key={f.id} className="card p-4">
                <p className="font-medium">{f.name}</p>
                <p className="mt-0.5 text-sm text-ink-subtle">
                  {[f.shortForm, f.departmentCode, plural(f.courseCount, "course")].filter(Boolean).join(" · ")}
                </p>
                <Link
                  href={`/courses?q=${encodeURIComponent(f.shortForm ?? f.name)}`}
                  className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
                >
                  Courses taught
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

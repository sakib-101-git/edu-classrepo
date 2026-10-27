import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { CourseGrid } from "@/components/course-card";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getBackend } from "@/lib/server/backend";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dept = await (await getBackend()).getDepartment((await params).code);
  return { title: dept ? dept.name : "Department" };
}

export default async function DepartmentPage({ params }: Props) {
  const backend = await getBackend();
  const dept = await backend.getDepartment((await params).code);
  if (!dept) notFound();

  const [courses, faculty, mine] = await Promise.all([
    backend.searchCourses({ department: dept.code, page: 0, pageSize: 100 }),
    backend.listFaculty(),
    backend.myCourseIds(),
  ]);
  const instructors = faculty.filter((f) => f.departmentId === dept.id);

  return (
    <div className="container-page py-10">
      <PageHeader
        crumbs={[{ href: "/departments", label: "Departments" }]}
        eyebrow={<span className="text-sm font-semibold tracking-wide text-brand">{dept.code}</span>}
        title={dept.name}
        description={`${courses.total} course${courses.total === 1 ? "" : "s"} in this department.`}
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="dept-courses">
          <SectionHeading id="dept-courses" title="Courses" />
          {courses.items.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses yet">Courses added by an admin will appear here.</EmptyState>
          ) : (
            <CourseGrid courses={courses.items} enrolledIds={mine} />
          )}
          {courses.total > courses.items.length && (
            <p className="mt-4 text-sm text-ink-muted">Showing the first {courses.items.length}. Use search to narrow down.</p>
          )}
        </section>
        <aside aria-labelledby="dept-faculty">
          <SectionHeading id="dept-faculty" title="Instructors" />
          {instructors.length === 0 ? (
            <p className="text-sm text-ink-muted">No instructors listed for this department.</p>
          ) : (
            <ul className="card divide-y divide-border">
              {instructors.map((f) => (
                <li key={f.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{f.name}</p>
                  {f.shortForm && <p className="text-xs text-ink-subtle">{f.shortForm}</p>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

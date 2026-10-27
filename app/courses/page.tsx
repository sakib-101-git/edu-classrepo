import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { CourseGrid } from "@/components/course-card";
import { FilterChips } from "@/components/filter-chips";
import { PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Pagination, pageIndex } from "@/components/ui/pagination";
import { getBackend } from "@/lib/server/backend";
import { firstParam, withParams } from "@/lib/url";

export const metadata: Metadata = { title: "Courses" };

const PAGE_SIZE = 24;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = firstParam(params.q).trim().slice(0, 100);
  const dept = firstParam(params.dept).toUpperCase().slice(0, 12);
  const page = pageIndex(params.page);

  const backend = await getBackend();
  const [departments, result, mine] = await Promise.all([
    backend.listDepartments(),
    backend.searchCourses({ query: q, department: dept, page, pageSize: PAGE_SIZE }),
    backend.myCourseIds(),
  ]);

  return (
    <div className="container-page py-10">
      <PageHeader
        title="Courses"
        description="Every course in the catalog. Filter by department or search by code, title or instructor."
      />
      <div className="mb-5 max-w-2xl">
        <SearchBox action="/courses" defaultValue={q} placeholder="Course code, title or instructor" hidden={dept ? { dept } : undefined} label="Search courses" />
      </div>
      {departments.length > 0 && (
        <div className="mb-8">
          <FilterChips
            label="Filter by department"
            options={[
              { label: "All", href: withParams("/courses", { q }), active: !dept },
              ...departments.map((d) => ({
                label: d.code,
                href: withParams("/courses", { q, dept: d.code }),
                active: dept === d.code,
                count: d.courseCount,
              })),
            ]}
          />
        </div>
      )}

      <p className="mb-4 text-sm text-ink-muted" aria-live="polite">
        {result.total === 0 ? "No courses found" : `${result.total} course${result.total === 1 ? "" : "s"}`}
        {q && <> matching “{q}”</>}
        {dept && <> in {dept}</>}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={result.total > 0 ? "No more results" : "No courses match"}
          action={(q || dept || page > 0) && <LinkButton href="/courses" variant="secondary">Clear filters</LinkButton>}
        >
          {departments.length === 0 ? "The catalog hasn't been set up yet." : "Try a different spelling, or search by course code (e.g. CSE 111)."}
        </EmptyState>
      ) : (
        <CourseGrid courses={result.items} enrolledIds={mine} />
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.total}
        href={(p) => withParams("/courses", { q, dept, page: p > 1 ? p : null })}
      />
    </div>
  );
}

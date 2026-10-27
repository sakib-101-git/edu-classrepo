import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Bookmark, BookmarkCheck, FileText, Upload } from "lucide-react";
import { setEnrollmentAction } from "@/app/actions/courses";
import { FilterChips } from "@/components/filter-chips";
import { MaterialList } from "@/components/material-list";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, pageIndex } from "@/components/ui/pagination";
import { kindLabel } from "@/lib/files";
import { getBackend } from "@/lib/server/backend";
import { getViewer } from "@/lib/server/session";
import type { MaterialKind } from "@/lib/types";
import { firstParam, withParams } from "@/lib/url";
import { courseSlug, normalizeCourseCode } from "@/lib/validation";

const PAGE_SIZE = 20;
const KINDS: MaterialKind[] = ["pdf", "document", "presentation", "image"];

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function codeFromSlug(slug: string): string {
  return normalizeCourseCode(decodeURIComponent(slug));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await (await getBackend()).getCourseByCode(codeFromSlug((await params).code));
  return course ? { title: `${course.code} ${course.title}`, description: `Materials for ${course.code} ${course.title}.` } : {};
}

export default async function CoursePage({ params, searchParams }: Props) {
  const slug = (await params).code;
  const code = codeFromSlug(slug);
  if (slug !== courseSlug(code)) redirect(`/courses/${courseSlug(code)}`);

  const backend = await getBackend();
  const course = await backend.getCourseByCode(code);
  if (!course) notFound();

  const sp = await searchParams;
  const facultyParam = firstParam(sp.faculty);
  const facultyId = course.faculty.some((f) => f.id === facultyParam) ? facultyParam : "";
  const typeParam = firstParam(sp.type) as MaterialKind;
  const kind = KINDS.includes(typeParam) ? typeParam : undefined;
  const page = pageIndex(sp.page);

  const viewer = await getViewer();
  const [materials, mine] = await Promise.all([
    backend.listCourseMaterials(course.id, { facultyId: facultyId || undefined, kind, page, pageSize: PAGE_SIZE }),
    backend.myCourseIds(),
  ]);
  const enrolled = mine.has(course.id);
  const base = `/courses/${slug}`;
  const filtered = Boolean(facultyId || kind);

  return (
    <div className="container-page py-10">
      <PageHeader
        crumbs={[
          { href: "/courses", label: "Courses" },
          { href: `/departments/${course.department.code.toLowerCase()}`, label: course.department.code },
        ]}
        eyebrow={<span className="text-sm font-semibold tracking-wide text-brand">{course.code}</span>}
        title={course.title}
        description={
          <span>
            {course.department.name}
            {course.creditHours !== null && <> · {course.creditHours} credit hours</>}
          </span>
        }
        actions={
          viewer?.onboarded ? (
            <>
              <ActionButton
                action={setEnrollmentAction}
                fields={{ courseId: course.id, enroll: enrolled ? "0" : "1" }}
                variant="secondary"
                size="md"
                pendingLabel={enrolled ? "Removing…" : "Saving…"}
              >
                {enrolled ? <BookmarkCheck className="size-4 text-success" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
                {enrolled ? "In My courses" : "Add to My courses"}
              </ActionButton>
              <LinkButton href={`/upload?course=${course.id}`}>
                <Upload className="size-4" aria-hidden /> Upload
              </LinkButton>
            </>
          ) : (
            <LinkButton href={`/login?next=${encodeURIComponent(base)}`} variant="secondary">
              Sign in to save or upload
            </LinkButton>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-6" aria-label="Filters">
          <div>
            <h2 className="mb-2 font-sans text-sm font-semibold text-ink">Instructor</h2>
            {course.faculty.length === 0 ? (
              <p className="text-sm text-ink-subtle">No instructors listed yet.</p>
            ) : (
              <ul className="space-y-1">
                {[{ id: "", name: "All instructors", shortForm: null }, ...course.faculty].map((f) => {
                  const active = facultyId === f.id;
                  return (
                    <li key={f.id || "all"}>
                      <Link
                        href={withParams(base, { faculty: f.id, type: kind })}
                        aria-current={active ? "true" : undefined}
                        scroll={false}
                        className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-brand-soft font-medium text-brand-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}
                      >
                        {f.name}
                        {f.shortForm && <span className="ml-1.5 text-xs text-ink-subtle">{f.shortForm}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h2 className="mb-2 font-sans text-sm font-semibold text-ink">Type</h2>
            <FilterChips
              label="Filter by type"
              options={[
                { label: "All", href: withParams(base, { faculty: facultyId }), active: !kind },
                ...KINDS.map((k) => ({ label: kindLabel(k), href: withParams(base, { faculty: facultyId, type: k }), active: kind === k })),
              ]}
            />
          </div>
        </aside>

        <section aria-labelledby="materials-heading">
          <h2 id="materials-heading" className="sr-only">Materials</h2>
          <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
            {materials.total} material{materials.total === 1 ? "" : "s"}
            {filtered && " matching these filters"}
          </p>
          {materials.items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={filtered ? "Nothing matches these filters" : "No materials yet"}
              action={
                filtered ? (
                  <LinkButton href={base} variant="secondary">Clear filters</LinkButton>
                ) : viewer?.onboarded ? (
                  <LinkButton href={`/upload?course=${course.id}`}><Upload className="size-4" aria-hidden /> Share the first one</LinkButton>
                ) : (
                  <LinkButton href={`/login?next=${encodeURIComponent(base)}`}>Sign in to contribute</LinkButton>
                )
              }
            >
              {filtered
                ? "Try another instructor or type."
                : "Had good notes, slides or past questions for this course? Share them — an admin reviews every upload."}
            </EmptyState>
          ) : (
            <MaterialList materials={materials.items} />
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={materials.total}
            href={(p) => withParams(base, { faculty: facultyId, type: kind, page: p > 1 ? p : null })}
          />
        </section>
      </div>
    </div>
  );
}

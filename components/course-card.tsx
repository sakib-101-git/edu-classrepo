import Link from "next/link";
import { BookmarkCheck, FileText, Users } from "lucide-react";
import { plural } from "@/lib/format";
import type { CourseSummary } from "@/lib/types";
import { courseSlug } from "@/lib/validation";

export function CourseCard({ course, enrolled }: { course: CourseSummary; enrolled?: boolean }) {
  return (
    <Link
      href={`/courses/${courseSlug(course.code)}`}
      className="card group flex h-full flex-col p-4 transition-colors hover:border-border-strong hover:bg-[#fffdfa]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-semibold tracking-wide text-brand">{course.code}</span>
        {enrolled && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <BookmarkCheck className="size-3.5" aria-hidden /> Saved
          </span>
        )}
      </div>
      <h3 className="mt-1 font-sans text-[0.9375rem] font-semibold leading-snug text-ink group-hover:underline">
        {course.title}
      </h3>
      <p className="mt-1 text-sm text-ink-subtle">{course.department.name}</p>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-[0.8125rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="size-3.5" aria-hidden /> {plural(course.materialCount, "material")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden /> {plural(course.facultyCount, "instructor")}
        </span>
        {course.creditHours !== null && <span>{course.creditHours} cr</span>}
      </div>
    </Link>
  );
}

export function CourseGrid({ courses, enrolledIds }: { courses: CourseSummary[]; enrolledIds?: Set<string> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <li key={c.id}>
          <CourseCard course={c} enrolled={enrolledIds?.has(c.id)} />
        </li>
      ))}
    </ul>
  );
}

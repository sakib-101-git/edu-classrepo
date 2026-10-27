import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { setEnrollmentAction } from "@/app/actions/courses";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { plural } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { requireViewer } from "@/lib/server/session";
import { courseSlug } from "@/lib/validation";

export const metadata: Metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  await requireViewer("/my-courses");
  const courses = await (await getBackend()).listMyCourses();

  return (
    <div className="container-page py-10">
      <PageHeader
        title="My courses"
        description="Courses you've saved for quick access."
        actions={<LinkButton href="/courses" variant="secondary">Find more courses</LinkButton>}
      />
      {courses.length === 0 ? (
        <EmptyState icon={Bookmark} title="No saved courses yet" action={<LinkButton href="/courses">Browse courses</LinkButton>}>
          Open any course and choose <strong>Add to My courses</strong>. They&apos;ll show up here and on your home page.
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-border">
          {courses.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/courses/${courseSlug(c.code)}`} className="group min-w-0">
                <span className="text-sm font-semibold tracking-wide text-brand">{c.code}</span>
                <span className="block font-medium group-hover:underline">{c.title}</span>
                <span className="block text-sm text-ink-subtle">
                  {c.department.name} · {plural(c.materialCount, "material")}
                </span>
              </Link>
              <ActionButton
                action={setEnrollmentAction}
                fields={{ courseId: c.id, enroll: "0" }}
                variant="ghost"
                pendingLabel="Removing…"
              >
                Remove
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

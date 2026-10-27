import type { Metadata } from "next";
import { Library } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getBackend } from "@/lib/server/backend";
import { requireViewer } from "@/lib/server/session";
import { firstParam } from "@/lib/url";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Upload a material" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UploadPage({ searchParams }: Props) {
  const viewer = await requireViewer("/upload");
  const backend = await getBackend();
  const [courses, faculty] = await Promise.all([backend.listCourseOptions(), backend.listFaculty()]);
  const requested = firstParam((await searchParams).course);
  const initialCourseId = courses.some((c) => c.id === requested) ? requested : "";

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader
        title="Upload a material"
        description={
          viewer.role === "admin"
            ? "As an admin, your uploads are published immediately."
            : "Share notes, slides, past questions or lab sheets. An admin reviews each upload before it's published."
        }
      />
      {courses.length === 0 ? (
        <EmptyState icon={Library} title="No courses to upload to yet">
          The catalog is empty. An admin needs to add courses first.
        </EmptyState>
      ) : (
        <UploadForm courses={courses} faculty={faculty} initialCourseId={initialCourseId} isAdmin={viewer.role === "admin"} />
      )}
    </div>
  );
}

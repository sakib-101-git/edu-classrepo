import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getBackend } from "@/lib/server/backend";
import { getViewer } from "@/lib/server/session";
import { CoverPageEditor } from "./editor";

export const metadata: Metadata = {
  title: "Cover page generator",
  description: "Make an EDU lab report or assignment cover page and download it as a PDF.",
};

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

export default async function CoverPage() {
  const backend = await getBackend();
  const viewer = await getViewer();
  const [courses, faculty, departments] = await Promise.all([
    backend.listCourseOptions(),
    backend.listFaculty(),
    backend.listDepartments(),
  ]);

  return (
    <div className="container-page py-10">
      <PageHeader
        title="Cover page generator"
        description="Fill in the details and download an A4 PDF. Nothing you type here is stored."
      />
      <CoverPageEditor
        courses={courses.map((c) => ({
          code: c.code,
          title: c.title,
          department: departments.find((d) => d.code === c.departmentCode)?.name ?? "",
        }))}
        facultyNames={faculty.map((f) => f.name)}
        defaults={{
          studentName: viewer?.fullName ?? "",
          studentId: viewer?.studentId ?? "",
          department: viewer?.departmentName ?? "",
          semester: viewer?.semester ? ordinal(viewer.semester) : "",
        }}
      />
    </div>
  );
}

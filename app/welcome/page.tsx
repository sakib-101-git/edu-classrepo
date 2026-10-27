import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getBackend } from "@/lib/server/backend";
import { getViewer, safeNext } from "@/lib/server/session";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Finish creating your account" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function WelcomePage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next, "/");
  const viewer = await getViewer();
  if (!viewer) redirect("/register");
  if (viewer.onboarded) redirect(next);
  const departments = await (await getBackend()).listDepartments();

  return (
    <AuthCard title="Finish your account" description={<>Email verified: <strong className="text-ink">{viewer.email}</strong></>}>
      <WelcomeForm
        next={next}
        departments={departments}
        defaults={{ fullName: viewer.fullName, studentId: viewer.studentId, departmentId: viewer.departmentId, semester: viewer.semester }}
      />
    </AuthCard>
  );
}

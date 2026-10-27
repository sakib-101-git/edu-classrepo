import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getBackend } from "@/lib/server/backend";
import { requireViewer } from "@/lib/server/session";
import { AvatarForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const viewer = await requireViewer("/account");
  const departments = await (await getBackend()).listDepartments();

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Account" description="These details pre-fill your cover pages. Only your name and picture are shown to others." />
      <div className="space-y-6">
        <section aria-labelledby="pic" className="card p-5 sm:p-6">
          <h2 id="pic" className="mb-4 text-lg font-semibold">Profile picture</h2>
          <AvatarForm name={viewer.fullName || viewer.email} src={viewer.avatarUrl} />
        </section>
        <section aria-labelledby="details" className="card p-5 sm:p-6">
          <h2 id="details" className="mb-1 text-lg font-semibold">Your details</h2>
          <p className="mb-5 text-sm text-ink-subtle">Signed in as {viewer.email}{viewer.role !== "student" && ` · ${viewer.role}`}</p>
          <ProfileForm
            departments={departments}
            defaults={{ fullName: viewer.fullName, studentId: viewer.studentId, departmentId: viewer.departmentId, semester: viewer.semester }}
          />
        </section>
        <section aria-labelledby="security" className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 id="security" className="text-lg font-semibold">Password</h2>
            <p className="text-sm text-ink-muted">Change the password you use to sign in.</p>
          </div>
          <Link href="/account/password" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
            <KeyRound className="size-4" aria-hidden /> Change password
          </Link>
        </section>
      </div>
    </div>
  );
}

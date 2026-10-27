import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RequestCodeForm } from "@/components/auth-forms";
import { getViewer, safeNext } from "@/lib/server/session";

export const metadata: Metadata = { title: "Create account" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next, "/");
  if (await getViewer()) redirect(next);
  return (
    <AuthCard
      title="Create your account"
      description="For East Delta University students and staff."
      footer={<>Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link></>}
    >
      <ol className="mb-6 space-y-2 text-sm text-ink-muted">
        {["Enter your university email", "Type the 6-digit code we send you", "Add your name and choose a password"].map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <RequestCodeForm intent="register" next={next} submitLabel="Send verification code" />
    </AuthCard>
  );
}

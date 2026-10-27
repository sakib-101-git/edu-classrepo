import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RequestCodeForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sign in with a code" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function CodeLoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next, "/");
  return (
    <AuthCard
      title="Sign in with a code"
      description="We'll email you a 6-digit code. No password needed."
      footer={<Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-brand hover:underline">Use your password instead</Link>}
    >
      <RequestCodeForm intent="signin" next={next} submitLabel="Email me a code" />
    </AuthCard>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { VerifyCodeForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui/alert";
import { demoMode } from "@/lib/env";
import { safeNext } from "@/lib/server/session";

export const metadata: Metadata = { title: "Enter your code" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function VerifyPage({ searchParams }: Props) {
  const sp = await searchParams;
  const email = (sp.email ?? "").trim().toLowerCase();
  const intent = ["register", "signin", "reset"].includes(sp.intent ?? "") ? sp.intent! : "signin";
  if (!email || email.length > 150) redirect("/register");
  const next = safeNext(sp.next, "/");

  // Demo mode has no email server, so it shows the code on screen. This branch
  // cannot run in a production build (demoMode is false there).
  let demoCode: string | null = null;
  if (demoMode) {
    const { peekDemoCode } = await import("@/lib/server/demo/store");
    demoCode = peekDemoCode(email);
  }

  return (
    <AuthCard
      title="Check your email"
      description={<>If <strong className="text-ink">{email}</strong> {intent === "register" ? "can register" : "has an account"}, we sent it a 6-digit code. It expires in 10 minutes.</>}
      footer={<Link href={intent === "register" ? "/register" : "/login"} className="font-medium text-brand hover:underline">Use a different email</Link>}
    >
      {sp.resent === "1" && <Alert tone="success" className="mb-5">A new code is on its way.</Alert>}
      {demoCode && (
        <Alert tone="warning" className="mb-5">
          Demo mode — no email is sent. Your code is <strong className="font-mono text-base">{demoCode}</strong>
        </Alert>
      )}
      <VerifyCodeForm email={email} intent={intent} next={next} />
    </AuthCard>
  );
}

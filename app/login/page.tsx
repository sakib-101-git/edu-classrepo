import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { demoSignInAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { demoMode } from "@/lib/env";
import { getViewer, safeNext } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next, "/");
  if (await getViewer()) redirect(next);

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to EDU ClassRepo."
      footer={
        <>
          New here? <Link href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand hover:underline">Create an account</Link>
        </>
      }
    >
      <LoginForm next={next} />
      <div className="mt-5 border-t border-border pt-5 text-center text-sm">
        <Link href={`/login/code?next=${encodeURIComponent(next)}`} className="font-medium text-brand hover:underline">
          Email me a sign-in code instead
        </Link>
      </div>
      {demoMode && (
        <div className="mt-5 rounded-lg border border-[#eadbb8] bg-gold-soft p-4">
          <p className="text-sm font-medium text-[#6e5016]">Demo mode: try it without an account</p>
          <div className="mt-3 flex gap-2">
            {(["student", "admin"] as const).map((role) => (
              <form key={role} action={demoSignInAction} className="flex-1">
                <input type="hidden" name="role" value={role} />
                <input type="hidden" name="next" value={next} />
                <SubmitButton variant="secondary" size="sm" className="w-full">
                  Demo {role}
                </SubmitButton>
              </form>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  );
}

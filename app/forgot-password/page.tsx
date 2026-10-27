import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RequestCodeForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your account email. We'll send a code so you can choose a new password."
      footer={<Link href="/login" className="font-medium text-brand hover:underline">Back to sign in</Link>}
    >
      <RequestCodeForm intent="reset" submitLabel="Send reset code" />
    </AuthCard>
  );
}

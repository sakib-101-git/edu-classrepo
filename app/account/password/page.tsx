import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getViewer } from "@/lib/server/session";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Change password" };

type Props = { searchParams: Promise<{ reset?: string }> };

export default async function PasswordPage({ searchParams }: Props) {
  if (!(await getViewer())) redirect("/login?next=/account/password");
  const reset = (await searchParams).reset === "1";
  return (
    <div className="container-page max-w-lg py-10">
      <PageHeader
        crumbs={[{ href: "/account", label: "Account" }]}
        title={reset ? "Choose a new password" : "Change password"}
        description={reset ? "Your email is verified. Set a new password to finish." : undefined}
      />
      <PasswordForm />
    </div>
  );
}

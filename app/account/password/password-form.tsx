"use client";

import { changePasswordAction } from "@/app/actions/auth";
import { PasswordFields } from "@/components/password-fields";
import { useFormAction } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export function PasswordForm() {
  const { state, onSubmit, pending } = useFormAction(changePasswordAction);
  if (state.ok) {
    return (
      <div className="card space-y-4 p-6">
        <FormMessage state={state} />
        <LinkButton href="/">Continue</LinkButton>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <FormMessage state={state} />
      <PasswordFields errors={state.fieldErrors} />
      <SubmitButton pending={pending} pendingLabel="Saving…">Save password</SubmitButton>
    </form>
  );
}

"use client";

import { finishSignupAction } from "@/app/actions/auth";
import { PasswordFields } from "@/components/password-fields";
import { ProfileFields, type ProfileDefaults } from "@/components/profile-fields";
import { useFormAction } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Department } from "@/lib/types";

export function WelcomeForm({ next, departments, defaults }: { next: string; departments: Department[]; defaults: ProfileDefaults }) {
  const { state, onSubmit, pending } = useFormAction(finishSignupAction);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <ProfileFields departments={departments} defaults={defaults} errors={state.fieldErrors} />
      <div className="border-t border-border pt-5">
        <PasswordFields errors={state.fieldErrors} />
      </div>
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

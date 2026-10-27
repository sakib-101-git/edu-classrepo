"use client";

import { useActionState, useRef } from "react";
import { updateAvatarAction, updateProfileAction } from "@/app/actions/account";
import { ProfileFields, type ProfileDefaults } from "@/components/profile-fields";
import { useActionToast, useFormAction } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle } from "@/lib/action-state";
import { AVATAR_TYPES } from "@/lib/files";
import type { Department } from "@/lib/types";

export function ProfileForm({ departments, defaults }: { departments: Department[]; defaults: ProfileDefaults }) {
  const { state, onSubmit, pending } = useFormAction(updateProfileAction);
  useActionToast(state);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!state.ok && <FormMessage state={state} />}
      <ProfileFields departments={departments} defaults={defaults} errors={state.fieldErrors} />
      <SubmitButton pending={pending} pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function AvatarForm({ name, src }: { name: string; src: string | null }) {
  const [state, action] = useActionState(updateAvatarAction, idle);
  const form = useRef<HTMLFormElement>(null);
  useActionToast(state);
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} src={src} size={72} />
      <div className="space-y-2">
        <form ref={form} action={action} className="flex flex-wrap gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium hover:bg-surface-muted focus-within:ring-2 focus-within:ring-brand/40">
            Change picture
            <input
              type="file"
              name="avatar"
              accept={Object.keys(AVATAR_TYPES).join(",")}
              className="sr-only"
              onChange={() => form.current?.requestSubmit()}
            />
          </label>
        </form>
        {src && (
          <form action={action}>
            <input type="hidden" name="remove" value="1" />
            <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…">Remove picture</SubmitButton>
          </form>
        )}
        <p className="text-xs text-ink-subtle">JPEG, PNG or WebP, up to 2 MB.</p>
      </div>
    </div>
  );
}

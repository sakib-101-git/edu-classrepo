"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { idle, type ActionState } from "@/lib/action-state";
import { Button } from "./button";
import { SubmitButton } from "./submit-button";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/**
 * Form submission without React's automatic reset of uncontrolled fields, so
 * what the user typed survives a validation error. Use with
 * <form onSubmit={onSubmit}> and <SubmitButton pending={pending}>.
 */
export function useFormAction(action: Action) {
  const [state, dispatch, pending] = useActionState(action, idle);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, onSubmit, pending };
}

/** Reports an action's result as a toast once per submission. */
export function useActionToast(state: ActionState) {
  const last = useRef<ActionState | null>(null);
  useEffect(() => {
    if (state === last.current || !state.message) return;
    last.current = state;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}

/**
 * A one-button form for small actions (enroll, delete, …) with hidden
 * fields, optional confirmation dialog, and toast feedback.
 */
export function ActionButton({
  action,
  fields,
  children,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  confirm,
  className,
}: {
  action: Action;
  fields: Record<string, string>;
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  confirm?: { title: string; body: ReactNode; confirmLabel: string };
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useActionToast(state);

  const hidden = Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));

  if (!confirm) {
    return (
      <form action={formAction} className={className}>
        {hidden}
        <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel}>{children}</SubmitButton>
      </form>
    );
  }

  return (
    <form ref={form} action={formAction} className={className}>
      {hidden}
      <Button variant={variant} size={size} onClick={() => dialog.current?.showModal()}>{children}</Button>
      <dialog
        ref={dialog}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-ink shadow-[var(--shadow-pop)]"
      >
        <div className="p-5">
          <h2 id="confirm-title" className="text-lg font-semibold">{confirm.title}</h2>
          <div className="mt-2 text-sm text-ink-muted">{confirm.body}</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-bg px-5 py-3">
          <Button variant="secondary" onClick={() => dialog.current?.close()} autoFocus>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              dialog.current?.close();
              form.current?.requestSubmit();
            }}
          >
            {confirm.confirmLabel}
          </Button>
        </div>
      </dialog>
    </form>
  );
}

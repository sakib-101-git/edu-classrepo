"use client";

import Link from "next/link";
import { loginAction, requestCodeAction, verifyCodeAction } from "@/app/actions/auth";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/env";
import { useFormAction } from "./ui/action-form";
import { FormMessage } from "./ui/alert";
import { describedBy, Field, Input } from "./ui/field";
import { SubmitButton } from "./ui/submit-button";

export function LoginForm({ next }: { next: string }) {
  const { state, onSubmit, pending } = useFormAction(loginAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
          invalid={Boolean(state.fieldErrors?.email)} aria-describedby={describedBy("email", state.fieldErrors?.email)} />
      </Field>
      <Field label={<span className="flex justify-between">Password <Link href="/forgot-password" className="font-normal text-brand hover:underline">Forgot?</Link></span>} htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required
          invalid={Boolean(state.fieldErrors?.password)} aria-describedby={describedBy("password", state.fieldErrors?.password)} />
      </Field>
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

/** Email-only form that sends a 6-digit code (register / sign in / reset). */
export function RequestCodeForm({ intent, next, submitLabel }: { intent: "register" | "signin" | "reset"; next?: string; submitLabel: string }) {
  const { state, onSubmit, pending } = useFormAction(requestCodeAction);
  const error = state.fieldErrors?.email;
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="intent" value={intent} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field
        label={intent === "register" ? "University email" : "Email"}
        htmlFor="email"
        error={error}
        hint={intent === "register" ? `Must end in @${ALLOWED_EMAIL_DOMAIN}` : undefined}
      >
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
          invalid={Boolean(error)} aria-describedby={describedBy("email", error, intent === "register")} />
      </Field>
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Sending code…">{submitLabel}</SubmitButton>
    </form>
  );
}

export function VerifyCodeForm({ email, intent, next }: { email: string; intent: string; next: string }) {
  const { state, onSubmit, pending } = useFormAction(verifyCodeAction);
  const { state: resendState, onSubmit: onResend, pending: resending } = useFormAction(requestCodeAction);
  const error = state.fieldErrors?.code;
  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5">
        <FormMessage state={state} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="next" value={next} />
        <Field label="6-digit code" htmlFor="code" error={error}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
            invalid={Boolean(error)}
            aria-describedby={describedBy("code", error)}
          />
        </Field>
        <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Verifying…">Verify</SubmitButton>
      </form>
      <form onSubmit={onResend} className="text-center text-sm text-ink-muted">
        {resendState.message && <div className="mb-3"><FormMessage state={resendState} /></div>}
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="resend" value="1" />
        Didn&apos;t get it? Check spam, or{" "}
        <SubmitButton pending={resending} variant="ghost" size="sm" className="h-auto px-1 py-0 font-medium text-brand underline-offset-2 hover:bg-transparent hover:underline" pendingLabel="Sending…">
          send a new code
        </SubmitButton>
      </form>
    </div>
  );
}

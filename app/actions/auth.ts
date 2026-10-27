"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { demoMode } from "@/lib/env";
import { formValues, parseForm, runAction } from "@/lib/server/action";
import { getBackend, UserError } from "@/lib/server/backend";
import { clientIp, enforceRateLimit } from "@/lib/server/rate-limit";
import { getViewer, safeNext } from "@/lib/server/session";
import { anyEmail, otpCode, password, profileFields, universityEmail } from "@/lib/validation";

const intent = z.enum(["register", "signin", "reset"]);

export async function requestCodeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const values = formValues(form);
    const parsedIntent = intent.safeParse(values.intent);
    if (!parsedIntent.success) throw new UserError("Unknown request.");
    const mode = parsedIntent.data;

    // Registration is restricted to the university domain (the database
    // enforces this too). Sign-in also accepts allowlisted admin addresses.
    const parsed = parseForm(z.object({ email: mode === "register" ? universityEmail : anyEmail }), values);
    if ("state" in parsed) return parsed.state;
    const { email } = parsed.data;

    await enforceRateLimit("code:ip", await clientIp());
    await enforceRateLimit("code:email", email);
    await (await getBackend()).requestCode(email, { createUser: mode === "register" });

    const next = safeNext(values.next, "");
    const query = new URLSearchParams({
      email,
      intent: mode,
      ...(next ? { next } : {}),
      ...(values.resend === "1" ? { resent: "1" } : {}),
    });
    redirect(`/verify?${query}`);
  });
}

export async function verifyCodeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const values = formValues(form);
    const parsed = parseForm(z.object({ email: anyEmail, code: otpCode, intent }), values);
    if ("state" in parsed) return parsed.state;
    const { email, code } = parsed.data;

    await enforceRateLimit("verify:ip", await clientIp());
    await enforceRateLimit("verify:email", email);
    const backend = await getBackend();
    await backend.verifyCode(email, code);

    const next = safeNext(values.next, "/");
    if (parsed.data.intent === "reset") redirect(`/account/password?reset=1`);
    const viewer = await backend.getViewer();
    if (!viewer?.onboarded) redirect(`/welcome?next=${encodeURIComponent(next)}`);
    redirect(next);
  });
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const values = formValues(form);
    const parsed = parseForm(z.object({ email: anyEmail, password: z.string().min(1, "Enter your password").max(200) }), values);
    if ("state" in parsed) return parsed.state;
    const { email } = parsed.data;

    await enforceRateLimit("login:ip", await clientIp());
    await enforceRateLimit("login:email", email);
    const backend = await getBackend();
    await backend.signInWithPassword(email, parsed.data.password);

    const next = safeNext(values.next, "/");
    const viewer = await backend.getViewer();
    redirect(viewer?.onboarded ? next : `/welcome?next=${encodeURIComponent(next)}`);
  });
}

const welcomeSchema = profileFields
  .extend({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

/** Final sign-up step, after the email code: name, details and password. */
export async function finishSignupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const values = formValues(form);
    const viewer = await getViewer();
    if (!viewer) redirect("/login");
    const parsed = parseForm(welcomeSchema, values);
    if ("state" in parsed) return parsed.state;

    const backend = await getBackend();
    await backend.setPassword(parsed.data.password);
    await backend.updateProfile({
      fullName: parsed.data.fullName,
      studentId: parsed.data.studentId,
      departmentId: parsed.data.departmentId,
      semester: parsed.data.semester,
      markOnboarded: true,
    });
    redirect(safeNext(values.next, "/"));
  });
}

const passwordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    if (!(await getViewer())) redirect("/login?next=/account/password");
    const parsed = parseForm(passwordSchema, formValues(form));
    if ("state" in parsed) return parsed.state;
    await (await getBackend()).setPassword(parsed.data.password);
    return { ok: true, message: "Password updated. Use it next time you sign in." };
  });
}

export async function signOutAction(): Promise<void> {
  await (await getBackend()).signOut();
  redirect("/");
}

export async function demoSignInAction(form: FormData): Promise<void> {
  if (!demoMode) throw new Error("Demo sign-in is only available in demo mode");
  const { demoSignInAs } = await import("@/lib/server/demo/backend");
  await demoSignInAs(form.get("role") === "admin" ? "admin" : "student");
  redirect(safeNext(String(form.get("next") ?? ""), "/"));
}

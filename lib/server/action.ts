import "server-only";

import { unstable_rethrow } from "next/navigation";
import type { ZodType } from "zod";
import type { ActionState } from "@/lib/action-state";
import { fieldErrors } from "@/lib/validation";
import { UserError } from "./backend";

/**
 * Runs a Server Action body and converts failures into an ActionState.
 * UserError messages are shown as-is; anything else is logged on the server
 * and replaced with a generic message, so internals never reach the browser.
 */
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (error) {
    unstable_rethrow(error); // let redirect()/notFound() through
    if (error instanceof UserError) return { ok: false, message: error.message };
    console.error("[action]", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** Parses input, throwing a UserError with the first problem. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const errors = fieldErrors(result.error);
    throw new UserError(errors.form ?? Object.values(errors)[0] ?? "Check the form and try again.");
  }
  return result.data;
}

/** Like parse(), but reports every field error to the form. */
export function parseForm<T>(schema: ZodType<T>, input: unknown): { data: T } | { state: ActionState } {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data };
  return { state: { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(result.error) } };
}

export function formValues(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") out[key] = value;
  return out;
}

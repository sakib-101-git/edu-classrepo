// Input schemas. Every server action parses its input with one of these;
// client forms reuse them only for hints, never as the security boundary.

import { z } from "zod";
import { ALLOWED_EMAIL_DOMAIN } from "./env";

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const universityEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(150, "Email is too long")
  .pipe(z.email("Enter a valid email address"))
  .refine((e) => e.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`), {
    message: `Use your @${ALLOWED_EMAIL_DOMAIN} university email`,
  });

export const anyEmail = z.string().trim().toLowerCase().max(150).pipe(z.email("Enter a valid email address"));

export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number");

export const otpCode = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export const fullName = z.string().trim().min(2, "Enter your full name").max(100, "Name is too long");

export const studentId = z.preprocess(
  blankToNull,
  z.string().trim().regex(/^[A-Za-z0-9-]{1,30}$/, "Use letters, numbers and dashes only").nullable(),
);

export const optionalUuid = z.preprocess(blankToNull, z.uuid("Invalid selection").nullable());

export const semester = z.preprocess(
  blankToNull,
  z.coerce.number().int().min(1, "Pick a semester").max(15, "Pick a semester").nullable(),
);

export const profileFields = z.object({
  fullName,
  studentId,
  departmentId: optionalUuid,
  semester,
});

export const registerSchema = profileFields.extend({ email: universityEmail });

export const departmentSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9]{1,11}$/, "2–12 letters/digits, e.g. CSE"),
  name: z.string().trim().min(2, "Enter a name").max(120),
});

export const facultySchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(150),
  shortForm: z.preprocess(
    blankToNull,
    z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9.]{0,11}$/, "Up to 12 letters, e.g. MRH").nullable(),
  ),
  email: z.preprocess(blankToNull, anyEmail.nullable()),
  departmentId: optionalUuid,
});

/** "cse111", "CSE-111" and "cse 111" all normalise to "CSE 111". */
export function normalizeCourseCode(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/[\s-]+/g, "");
  const m = compact.match(/^([A-Z]{2,6})(\d{3,4}[A-Z]?)$/);
  return m ? `${m[1]} ${m[2]}` : raw.trim().toUpperCase();
}

/** URL slug for a course code: "CSE 111" -> "cse-111". */
export function courseSlug(code: string): string {
  return code.toLowerCase().replace(/\s+/g, "-");
}

export const courseSchema = z.object({
  code: z
    .string()
    .transform(normalizeCourseCode)
    .pipe(z.string().regex(/^[A-Z]{2,6} [0-9]{3,4}[A-Z]?$/, "Use a code like CSE 111")),
  title: z.string().trim().min(2, "Enter a title").max(250),
  departmentId: z.uuid("Pick a department"),
  creditHours: z.preprocess(
    blankToNull,
    z.coerce.number().positive("Must be positive").max(12, "At most 12").nullable(),
  ),
  facultyIds: z.array(z.uuid()).max(50).default([]),
});

export const materialMetaSchema = z.object({
  courseId: z.uuid("Pick a course"),
  facultyId: optionalUuid,
  suggestedFaculty: z.preprocess(blankToNull, z.string().trim().max(150).nullable()),
  title: z.string().trim().min(1, "Give the material a title").max(200, "Title is too long"),
  description: z.preprocess(blankToNull, z.string().trim().max(1000, "Description is too long").nullable()),
});

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

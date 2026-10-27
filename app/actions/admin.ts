"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { formValues, parse, parseForm, runAction } from "@/lib/server/action";
import { getBackend, UserError } from "@/lib/server/backend";
import { getViewer } from "@/lib/server/session";
import { courseSchema, departmentSchema, facultySchema, optionalUuid } from "@/lib/validation";

// The UI hides these actions from non-admins, but that is cosmetic: the check
// below and the database policies are what actually enforce it.
async function assertAdmin() {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") throw new UserError("You don't have permission to do that.");
}

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    id: z.uuid(),
    title: z.string().trim().min(1, "Title is required").max(200),
    facultyId: optionalUuid,
  }),
  z.object({
    decision: z.literal("reject"),
    id: z.uuid(),
    reason: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().max(500).nullable(),
    ),
  }),
]);

export async function reviewMaterialAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();
    const input = parse(reviewSchema, formValues(form));
    const backend = await getBackend();
    if (input.decision === "approve") {
      await backend.reviewMaterial(input.id, { action: "approve", title: input.title, facultyId: input.facultyId });
    } else {
      await backend.reviewMaterial(input.id, { action: "reject", reason: input.reason });
    }
    refresh();
    return { ok: true, message: input.decision === "approve" ? "Approved and published." : "Rejected. The file was removed." };
  });
}

const idField = z.object({ id: optionalUuid });

export async function saveDepartmentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();
    const values = formValues(form);
    const parsed = parseForm(departmentSchema.extend(idField.shape), values);
    if ("state" in parsed) return parsed.state;
    const { id, ...input } = parsed.data;
    await (await getBackend()).saveDepartment(id, input);
    refresh();
    return { ok: true, message: id ? "Department saved." : "Department added." };
  });
}

export async function saveFacultyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();
    const parsed = parseForm(facultySchema.extend(idField.shape), formValues(form));
    if ("state" in parsed) return parsed.state;
    const { id, ...input } = parsed.data;
    await (await getBackend()).saveFaculty(id, input);
    refresh();
    return { ok: true, message: id ? "Instructor saved." : "Instructor added." };
  });
}

export async function saveCourseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();
    const values = { ...formValues(form), facultyIds: form.getAll("facultyIds").map(String) };
    const parsed = parseForm(courseSchema.extend(idField.shape), values);
    if ("state" in parsed) return parsed.state;
    const { id, ...input } = parsed.data;
    await (await getBackend()).saveCourse(id, input);
    refresh();
    return { ok: true, message: id ? `${input.code} saved.` : `${input.code} added.` };
  });
}

const deleteSchema = z.object({ id: z.uuid(), kind: z.enum(["department", "faculty", "course"]) });

export async function deleteCatalogItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();
    const { id, kind } = parse(deleteSchema, formValues(form));
    const backend = await getBackend();
    if (kind === "department") await backend.deleteDepartment(id);
    if (kind === "faculty") await backend.deleteFaculty(id);
    if (kind === "course") await backend.deleteCourse(id);
    refresh();
    return { ok: true, message: "Deleted." };
  });
}

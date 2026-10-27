"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { cleanFileName, MATERIAL_TYPES, MAX_MATERIAL_BYTES } from "@/lib/files";
import { parse, runAction } from "@/lib/server/action";
import { getBackend, UserError } from "@/lib/server/backend";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getViewer, safeNext } from "@/lib/server/session";
import type { MaterialStatus, UploadTarget } from "@/lib/types";
import { materialMetaSchema } from "@/lib/validation";

// Upload flow:
//   1. startUploadAction  – checks type/size, returns a one-time upload target
//   2. the browser sends the bytes straight to storage (never through Vercel)
//   3. finishUploadAction – verifies the stored bytes, then creates the record
// The database re-checks ownership, size and type of the stored object.

const fileInfo = z.object({
  fileName: z.string().min(1).max(500),
  contentType: z.string().max(200),
  size: z.number().int().positive().max(MAX_MATERIAL_BYTES, "Files must be 50 MB or smaller"),
});

type StartResult = { ok: true; target: UploadTarget } | { ok: false; message: string };

export async function startUploadAction(input: z.input<typeof fileInfo>): Promise<StartResult> {
  try {
    const viewer = await getViewer();
    if (!viewer?.onboarded) throw new UserError("Please sign in to upload.");
    const info = parse(fileInfo, input);
    const type = MATERIAL_TYPES[info.contentType];
    if (!type) throw new UserError("That file type isn't allowed. Use PDF, Word, PowerPoint or an image.");
    await enforceRateLimit("upload:user", viewer.id);
    return { ok: true, target: await (await getBackend()).createUploadTarget(type.ext) };
  } catch (error) {
    if (error instanceof UserError) return { ok: false, message: error.message };
    console.error("[upload:start]", error);
    return { ok: false, message: "Couldn't start the upload. Please try again." };
  }
}

const finishSchema = materialMetaSchema.extend({
  path: z.string().max(300),
  fileName: z.string().min(1).max(500),
  contentType: z.string().max(200),
  size: z.number().int().positive().max(MAX_MATERIAL_BYTES),
});

type FinishResult = { ok: true; id: string; status: MaterialStatus } | { ok: false; message: string };

export async function finishUploadAction(input: z.input<typeof finishSchema>): Promise<FinishResult> {
  const backend = await getBackend();
  let path: string | null = null;
  try {
    const viewer = await getViewer();
    if (!viewer?.onboarded) throw new UserError("Please sign in to upload.");
    const data = parse(finishSchema, input);
    const type = MATERIAL_TYPES[data.contentType];
    const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    if (!type || !new RegExp(`^uploads/${viewer.id}/${uuid}\\.${type.ext}$`).test(data.path)) {
      throw new UserError("The upload could not be verified. Please try again.");
    }
    path = data.path;

    // The browser's claimed type is not trusted: check the real file header.
    const head = await backend.readUploadHead(path);
    if (!type.magic(head)) {
      throw new UserError(`This file doesn't look like a real ${type.label} file, so it wasn't uploaded.`);
    }

    const created = await backend.createMaterial({
      courseId: data.courseId,
      facultyId: data.facultyId,
      suggestedFaculty: data.facultyId ? null : data.suggestedFaculty,
      title: data.title,
      description: data.description,
      originalFilename: cleanFileName(data.fileName),
      storagePath: path,
      contentType: data.contentType,
      kind: type.kind,
      sizeBytes: data.size,
    });
    return { ok: true, ...created };
  } catch (error) {
    if (path) await backend.discardUpload(path).catch(() => undefined);
    if (error instanceof UserError) return { ok: false, message: error.message };
    console.error("[upload:finish]", error);
    return { ok: false, message: "Couldn't save the upload. Please try again." };
  }
}

/** Abandoned upload (e.g. the user cancelled): remove the stored file. */
export async function discardUploadAction(path: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer || !path.startsWith(`uploads/${viewer.id}/`)) return;
  await (await getBackend()).discardUpload(path);
}

export async function deleteMaterialAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = parse(z.uuid(), form.get("id"));
    await (await getBackend()).deleteMaterial(id);
    const next = safeNext(String(form.get("next") ?? ""), "");
    if (next) redirect(next);
    refresh();
    return { ok: true, message: "Material deleted." };
  });
}

"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { parse, runAction } from "@/lib/server/action";
import { getBackend, UserError } from "@/lib/server/backend";
import { getViewer } from "@/lib/server/session";

export async function setEnrollmentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await getViewer();
    if (!viewer?.onboarded) throw new UserError("Please sign in to save courses.");
    const courseId = parse(z.uuid(), form.get("courseId"));
    const backend = await getBackend();
    if (form.get("enroll") === "1") {
      await backend.enroll(courseId);
      refresh();
      return { ok: true, message: "Added to My Courses." };
    }
    await backend.unenroll(courseId);
    refresh();
    return { ok: true, message: "Removed from My Courses." };
  });
}

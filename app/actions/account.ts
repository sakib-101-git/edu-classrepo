"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { AVATAR_TYPES, MAX_AVATAR_BYTES } from "@/lib/files";
import { formValues, parseForm, runAction } from "@/lib/server/action";
import { getBackend, UserError } from "@/lib/server/backend";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getViewer } from "@/lib/server/session";
import { profileFields } from "@/lib/validation";

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    if (!(await getViewer())) throw new UserError("Please sign in first.");
    const parsed = parseForm(profileFields, formValues(form));
    if ("state" in parsed) return parsed.state;
    await (await getBackend()).updateProfile(parsed.data);
    refresh();
    return { ok: true, message: "Profile saved." };
  });
}

export async function updateAvatarAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new UserError("Please sign in first.");
    const backend = await getBackend();

    if (form.get("remove") === "1") {
      await backend.setAvatar(null);
      refresh();
      return { ok: true, message: "Picture removed." };
    }

    const file = form.get("avatar");
    if (!(file instanceof File) || file.size === 0) throw new UserError("Choose an image first.");
    if (file.size > MAX_AVATAR_BYTES) throw new UserError("Pictures must be 2 MB or smaller.");
    const type = AVATAR_TYPES[file.type];
    if (!type) throw new UserError("Use a JPEG, PNG or WebP image.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!type.magic(bytes)) throw new UserError("That file isn't a valid image.");

    await enforceRateLimit("avatar:user", viewer.id);
    await backend.setAvatar({ bytes, contentType: file.type, ext: type.ext });
    refresh();
    return { ok: true, message: "Picture updated." };
  });
}

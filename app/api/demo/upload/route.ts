import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { demoMode } from "@/lib/env";
import { MATERIAL_TYPES } from "@/lib/files";
import { DEMO_MAX_UPLOAD_BYTES, DEMO_SESSION_COOKIE } from "@/lib/server/demo/backend";
import { demoStore } from "@/lib/server/demo/store";

// Demo-mode stand-in for a Supabase signed upload URL. Not routable otherwise.
export async function PUT(req: NextRequest) {
  if (!demoMode) return new NextResponse(null, { status: 404 });

  const store = demoStore();
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ticket = store.uploadTokens.get(token);
  const session = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
  if (!ticket || ticket.expires < Date.now() || !session || store.sessions.get(session) !== ticket.userId) {
    return NextResponse.json({ error: "Upload link expired" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!MATERIAL_TYPES[contentType]) return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > DEMO_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Demo mode accepts files up to 10 MB" }, { status: 413 });
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > DEMO_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Demo mode accepts files up to 10 MB" }, { status: 413 });
  }

  store.uploadTokens.delete(token);
  store.files.set(ticket.path, { bytes, contentType, ownerId: ticket.userId });
  return NextResponse.json({ path: ticket.path });
}

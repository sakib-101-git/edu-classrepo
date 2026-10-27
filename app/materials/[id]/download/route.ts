import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getBackend, UserError } from "@/lib/server/backend";

// Redirects to a short-lived, signed download URL. The storage policy decides
// whether this viewer may read the file (approved, own upload, or admin).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return new NextResponse("Not found", { status: 404 });

  const backend = await getBackend();
  const material = await backend.getMaterial(id.data);
  if (!material || material.status === "rejected") return new NextResponse("Not found", { status: 404 });

  try {
    const url = await backend.materialFileUrl(material, { download: true });
    const response = NextResponse.redirect(new URL(url, req.url), 302);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof UserError) return new NextResponse(error.message, { status: 404 });
    throw error;
  }
}

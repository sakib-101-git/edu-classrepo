import { NextResponse, type NextRequest } from "next/server";
import { demoMode } from "@/lib/env";
import { getBackend } from "@/lib/server/backend";
import { demoStore } from "@/lib/server/demo/store";

// Demo-mode stand-in for Supabase Storage URLs. Access is checked through the
// demo backend, which applies the same visibility rules as the database.
export async function GET(req: NextRequest) {
  if (!demoMode) return new NextResponse(null, { status: 404 });
  const params = req.nextUrl.searchParams;
  const store = demoStore();

  let path: string | null = null;
  let filename = "file";
  const avatar = params.get("avatar");
  const materialId = params.get("material");
  if (avatar) {
    path = avatar; // avatars are public, as in the Supabase bucket
  } else if (materialId) {
    const material = await (await getBackend()).getMaterial(materialId);
    if (material) {
      path = material.storagePath;
      filename = material.originalFilename;
    }
  }

  const file = path ? store.files.get(path) : undefined;
  if (!file) return new NextResponse("Not found", { status: 404 });

  const disposition = params.get("download") ? "attachment" : "inline";
  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      // Same-origin in demo mode, so allow it in the preview frame.
      "X-Frame-Options": "SAMEORIGIN",
      // No `sandbox`: Chrome refuses to render PDFs in sandboxed documents.
      // Only verified PDF/Office/image bytes are ever stored, never HTML.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
    },
  });
}

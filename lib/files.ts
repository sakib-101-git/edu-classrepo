// File rules shared by the upload form (for instant feedback) and the server
// (for enforcement). The database and storage bucket enforce the same list.

import type { MaterialKind } from "./types";

export const MAX_MATERIAL_BYTES = 50 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface FileType {
  kind: MaterialKind;
  ext: string;
  label: string;
  /** Leading bytes every genuine file of this type starts with. */
  magic: (head: Uint8Array) => boolean;
}

const startsWith = (head: Uint8Array, bytes: number[], offset = 0) =>
  bytes.every((b, i) => head[offset + i] === b);

const isPdf = (h: Uint8Array) => startsWith(h, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const isZip = (h: Uint8Array) => startsWith(h, [0x50, 0x4b, 0x03, 0x04]); // docx/pptx
const isOle = (h: Uint8Array) => startsWith(h, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // doc/ppt
const isPng = (h: Uint8Array) => startsWith(h, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isJpeg = (h: Uint8Array) => startsWith(h, [0xff, 0xd8, 0xff]);
const isGif = (h: Uint8Array) => startsWith(h, [0x47, 0x49, 0x46, 0x38]);
const isWebp = (h: Uint8Array) =>
  startsWith(h, [0x52, 0x49, 0x46, 0x46]) && startsWith(h, [0x57, 0x45, 0x42, 0x50], 8);

export const MATERIAL_TYPES: Record<string, FileType> = {
  "application/pdf": { kind: "pdf", ext: "pdf", label: "PDF", magic: isPdf },
  "application/msword": { kind: "document", ext: "doc", label: "Word", magic: isOle },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    kind: "document", ext: "docx", label: "Word", magic: isZip,
  },
  "application/vnd.ms-powerpoint": { kind: "presentation", ext: "ppt", label: "PowerPoint", magic: isOle },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    kind: "presentation", ext: "pptx", label: "PowerPoint", magic: isZip,
  },
  "image/jpeg": { kind: "image", ext: "jpg", label: "JPEG image", magic: isJpeg },
  "image/png": { kind: "image", ext: "png", label: "PNG image", magic: isPng },
  "image/gif": { kind: "image", ext: "gif", label: "GIF image", magic: isGif },
  "image/webp": { kind: "image", ext: "webp", label: "WebP image", magic: isWebp },
};

export const AVATAR_TYPES: Record<string, { ext: string; magic: (h: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: isJpeg },
  "image/png": { ext: "png", magic: isPng },
  "image/webp": { ext: "webp", magic: isWebp },
};

/** For the file input's `accept` attribute. */
export const MATERIAL_ACCEPT = [
  ...Object.keys(MATERIAL_TYPES),
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif", ".webp",
].join(",");

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Browsers sometimes report an empty or generic type (notably for Office files
 * on some platforms), so fall back to the extension. The server re-checks the
 * real bytes before anything is published.
 */
export function resolveMaterialType(fileName: string, reportedType: string): string | null {
  if (MATERIAL_TYPES[reportedType]) return reportedType;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? null;
}

export function kindLabel(kind: MaterialKind): string {
  return { pdf: "PDF", document: "Document", presentation: "Slides", image: "Image" }[kind];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A display-safe file name: no path parts, no control characters. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|?*]/g, "").trim();
  return (cleaned || "file").slice(0, 255);
}

/** Title suggestion from a file name: "week_3-sorting.pdf" -> "week 3 sorting". */
export function titleFromFileName(name: string): string {
  return cleanFileName(name).replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 200);
}

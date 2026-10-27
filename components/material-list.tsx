import Link from "next/link";
import { FileImage, FileText, Presentation, File } from "lucide-react";
import { formatBytes, kindLabel } from "@/lib/files";
import { formatDate } from "@/lib/format";
import type { Material, MaterialKind, MaterialStatus } from "@/lib/types";
import { Badge } from "./ui/badge";

const icons: Record<MaterialKind, typeof File> = {
  pdf: FileText,
  document: File,
  presentation: Presentation,
  image: FileImage,
};

export function KindIcon({ kind }: { kind: MaterialKind }) {
  const Icon = icons[kind];
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-muted">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function StatusBadge({ status }: { status: MaterialStatus }) {
  if (status === "approved") return <Badge tone="success">Published</Badge>;
  if (status === "pending") return <Badge tone="warning">Awaiting review</Badge>;
  return <Badge tone="danger">Not approved</Badge>;
}

export function MaterialRow({ material, showCourse }: { material: Material; showCourse?: boolean }) {
  const m = material;
  return (
    <li className="flex gap-3 px-4 py-3.5 sm:gap-4">
      <KindIcon kind={m.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/materials/${m.id}`} className="font-medium text-ink hover:text-brand hover:underline">
            {m.title}
          </Link>
          {m.status !== "approved" && <StatusBadge status={m.status} />}
        </div>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[0.8125rem] text-ink-subtle">
          {showCourse && <span className="font-medium text-ink-muted">{m.course.code}</span>}
          {m.faculty && (
            <span>
              {m.faculty.shortForm ? `${m.faculty.shortForm} · ` : ""}
              {m.faculty.name}
            </span>
          )}
          <span>{kindLabel(m.kind)} · {formatBytes(m.sizeBytes)}</span>
          <span>{formatDate(m.createdAt)}</span>
          {m.uploader && <span>by {m.uploader.name}</span>}
        </p>
      </div>
    </li>
  );
}

export function MaterialList({ materials, showCourse }: { materials: Material[]; showCourse?: boolean }) {
  return (
    <ul className="card divide-y divide-border">
      {materials.map((m) => (
        <MaterialRow key={m.id} material={m} showCourse={showCourse} />
      ))}
    </ul>
  );
}

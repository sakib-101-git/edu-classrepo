/* eslint-disable @next/next/no-img-element -- previews are short-lived signed URLs */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Download, FileQuestion, Trash2 } from "lucide-react";
import { deleteMaterialAction } from "@/app/actions/materials";
import { KindIcon, StatusBadge } from "@/components/material-list";
import { PageHeader } from "@/components/page-header";
import { ReviewPanel } from "@/components/review-panel";
import { ActionButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { formatBytes, kindLabel, MATERIAL_TYPES } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { getViewer } from "@/lib/server/session";
import { courseSlug } from "@/lib/validation";

type Props = { params: Promise<{ id: string }> };

async function load(rawId: string) {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return null;
  return (await getBackend()).getMaterial(id.data);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const material = await load((await params).id);
  return { title: material ? `${material.title} · ${material.course.code}` : "Material" };
}

export default async function MaterialPage({ params }: Props) {
  const material = await load((await params).id);
  if (!material) notFound();

  const backend = await getBackend();
  const viewer = await getViewer();
  const isAdmin = viewer?.role === "admin";
  const isOwner = viewer?.id === material.uploader?.id;
  const canPreview = material.status !== "rejected" && (material.kind === "pdf" || material.kind === "image");
  const previewUrl = canPreview ? await backend.materialFileUrl(material, { download: false }).catch(() => null) : null;
  const courseHref = `/courses/${courseSlug(material.course.code)}`;
  const [faculty, course] = isAdmin && material.status === "pending"
    ? await Promise.all([backend.listFaculty(), backend.getCourseByCode(material.course.code)])
    : [[], null];

  const details: [string, React.ReactNode][] = [
    ["Course", <Link key="c" href={courseHref} className="font-medium text-brand hover:underline">{material.course.code} · {material.course.title}</Link>],
    ["Instructor", material.faculty ? `${material.faculty.name}${material.faculty.shortForm ? ` (${material.faculty.shortForm})` : ""}` : "Not specified"],
    ["Type", `${MATERIAL_TYPES[material.contentType]?.label ?? kindLabel(material.kind)} · ${formatBytes(material.sizeBytes)}`],
    ["Shared by", material.uploader?.name ?? "Former member"],
    ["Added", formatDate(material.createdAt)],
    ["File name", <span key="f" className="break-all">{material.originalFilename}</span>],
  ];

  return (
    <div className="container-page py-10">
      <PageHeader
        crumbs={[{ href: "/courses", label: "Courses" }, { href: courseHref, label: material.course.code }]}
        title={material.title}
        eyebrow={material.status !== "approved" ? <StatusBadge status={material.status} /> : undefined}
        actions={
          material.status !== "rejected" && (
            <a href={`/materials/${material.id}/download`} className={buttonClass("primary")}>
              <Download className="size-4" aria-hidden /> Download
            </a>
          )
        }
      />

      {material.status === "pending" && isOwner && !isAdmin && (
        <Alert className="mb-6">Only you and the admins can see this until it&apos;s reviewed. Most uploads are reviewed within a few days.</Alert>
      )}
      {material.status === "rejected" && (
        <Alert tone="danger" className="mb-6">
          This upload wasn&apos;t approved and its file was removed.
          {material.rejectionReason && <> Reason: <q>{material.rejectionReason}</q></>}
        </Alert>
      )}

      {isAdmin && material.status === "pending" && (
        <section aria-labelledby="review" className="card mb-8 p-5">
          <h2 id="review" className="mb-4 text-lg font-semibold">Review this upload</h2>
          <ReviewPanel material={material} faculty={faculty} courseFacultyIds={course?.faculty.map((f) => f.id) ?? []} />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Preview" className="card overflow-hidden">
          {previewUrl && material.kind === "pdf" ? (
            <iframe src={previewUrl} title={`Preview of ${material.title}`} className="h-[75vh] min-h-[28rem] w-full bg-surface-muted" />
          ) : previewUrl && material.kind === "image" ? (
            <div className="grid place-items-center bg-surface-muted p-4">
              <img src={previewUrl} alt={material.title} className="max-h-[75vh] w-auto rounded" />
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              {material.status === "rejected" ? (
                <FileQuestion className="size-10 text-ink-subtle" aria-hidden />
              ) : (
                <KindIcon kind={material.kind} />
              )}
              <p className="mt-3 font-medium">
                {material.status === "rejected" ? "File removed" : `${kindLabel(material.kind)} files can't be previewed here`}
              </p>
              {material.status !== "rejected" && (
                <p className="mt-1 max-w-sm text-sm text-ink-muted">Download it to open in Word, PowerPoint, or a free alternative like LibreOffice.</p>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-sans text-sm font-semibold">Details</h2>
            <dl className="space-y-3 text-sm">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-ink-subtle">{k}</dt>
                  <dd className="mt-0.5 text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {material.description && (
              <>
                <h3 className="mb-1 mt-5 font-sans text-sm font-semibold">Description</h3>
                <p className="whitespace-pre-line text-sm text-ink-muted">{material.description}</p>
              </>
            )}
          </div>
          {(isOwner || isAdmin) && (
            <ActionButton
              action={deleteMaterialAction}
              fields={{ id: material.id, next: isOwner && !isAdmin ? "/uploads" : courseHref }}
              variant="secondary"
              className="[&_button]:w-full [&_button]:text-danger"
              confirm={{
                title: "Delete this material?",
                body: "The file is permanently removed for everyone. This can't be undone.",
                confirmLabel: "Delete",
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Delete material
            </ActionButton>
          )}
        </aside>
      </div>
    </div>
  );
}

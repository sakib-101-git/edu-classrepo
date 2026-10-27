import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { KindIcon, StatusBadge } from "@/components/material-list";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBytes } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { requireViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "My uploads" };

export default async function MyUploadsPage() {
  await requireViewer("/uploads");
  const uploads = await (await getBackend()).listMyUploads();
  const counts = {
    pending: uploads.filter((u) => u.status === "pending").length,
    approved: uploads.filter((u) => u.status === "approved").length,
    rejected: uploads.filter((u) => u.status === "rejected").length,
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        title="My uploads"
        description={
          uploads.length > 0
            ? `${counts.approved} published · ${counts.pending} awaiting review · ${counts.rejected} not approved`
            : "Everything you've shared, with its review status."
        }
        actions={<LinkButton href="/upload"><Upload className="size-4" aria-hidden /> Upload</LinkButton>}
      />
      {uploads.length === 0 ? (
        <EmptyState icon={Upload} title="You haven't uploaded anything yet" action={<LinkButton href="/upload">Upload a material</LinkButton>}>
          Notes, slides and past papers help everyone in your course. Admins review uploads before they go live.
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-border">
          {uploads.map((m) => (
            <li key={m.id} className="flex gap-3 px-4 py-4">
              <KindIcon kind={m.kind} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/materials/${m.id}`} className="font-medium hover:text-brand hover:underline">{m.title}</Link>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-0.5 text-[0.8125rem] text-ink-subtle">
                  {m.course.code} · {formatBytes(m.sizeBytes)} · uploaded {formatDate(m.createdAt)}
                </p>
                {m.status === "rejected" && m.rejectionReason && (
                  <p className="mt-1 text-sm text-danger">Reason: {m.rejectionReason}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

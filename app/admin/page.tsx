import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, ExternalLink } from "lucide-react";
import { KindIcon } from "@/components/material-list";
import { ReviewPanel } from "@/components/review-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, pageIndex } from "@/components/ui/pagination";
import { formatBytes, MATERIAL_TYPES } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { requireAdmin } from "@/lib/server/session";
import { withParams } from "@/lib/url";
import { AccessDenied, AdminShell } from "./admin-shell";

export const metadata: Metadata = { title: "Admin · Review queue" };

const PAGE_SIZE = 10;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AdminQueuePage({ searchParams }: Props) {
  if (!(await requireAdmin("/admin"))) return <AccessDenied />;
  const page = pageIndex((await searchParams).page);
  const backend = await getBackend();
  const [stats, queue, faculty, courses] = await Promise.all([
    backend.adminStats(),
    backend.listPendingMaterials(page, PAGE_SIZE),
    backend.listFaculty(),
    backend.listCourseOptions(),
  ]);

  const tiles = [
    { label: "Awaiting review", value: stats.pendingMaterials, emphasis: stats.pendingMaterials > 0 },
    { label: "Published materials", value: stats.approvedMaterials },
    { label: "Courses", value: stats.courses },
    { label: "Instructors", value: stats.faculty },
  ];

  return (
    <AdminShell title="Admin" description="Review student uploads and manage the course catalog.">
      <dl className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <dt className="text-sm text-ink-muted">{t.label}</dt>
            <dd className={`mt-1 font-serif text-3xl font-semibold ${t.emphasis ? "text-brand" : ""}`}>{t.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-4 text-xl font-semibold">Review queue</h2>
      {queue.items.length === 0 ? (
        <EmptyState icon={Inbox} title="All caught up">New student uploads will appear here, oldest first.</EmptyState>
      ) : (
        <ol className="space-y-4">
          {queue.items.map((m) => (
            <li key={m.id} className="card p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <KindIcon kind={m.kind} />
                  <div className="min-w-0">
                    <p className="font-medium">{m.title}</p>
                    <p className="mt-0.5 text-[0.8125rem] text-ink-subtle">
                      <span className="font-medium text-ink-muted">{m.course.code}</span> · {m.course.title}
                    </p>
                    <p className="text-[0.8125rem] text-ink-subtle">
                      {MATERIAL_TYPES[m.contentType]?.label} · {formatBytes(m.sizeBytes)} · by {m.uploader?.name ?? "former member"} · {formatDate(m.createdAt)}
                    </p>
                    {m.description && <p className="mt-2 text-sm text-ink-muted">{m.description}</p>}
                  </div>
                </div>
                <Link href={`/materials/${m.id}`} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                  Open preview <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </div>
              <ReviewPanel
                material={m}
                faculty={faculty}
                courseFacultyIds={courses.find((c) => c.id === m.course.id)?.facultyIds ?? []}
              />
            </li>
          ))}
        </ol>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={queue.total} href={(p) => withParams("/admin", { page: p > 1 ? p : null })} />
    </AdminShell>
  );
}

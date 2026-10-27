import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: { href: string; label: string }[];
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-subtle">
            {crumbs.map((c) => (
              <li key={c.href} className="flex items-center gap-1">
                <Link href={c.href} className="hover:text-ink hover:underline">{c.label}</Link>
                <ChevronRight className="size-3.5" aria-hidden />
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-2">{eyebrow}</div>}
          <h1 className="text-3xl font-semibold text-ink sm:text-[2.125rem]">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-ink-muted">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionHeading({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold">{title}</h2>
      {action}
    </div>
  );
}

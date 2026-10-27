import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "./button";

/**
 * Previous/next links that keep the current filters in the URL, so results
 * can be shared and the browser back button works. Pages are 1-based in URLs.
 */
export function Pagination({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const current = page + 1;
  const disabled = "pointer-events-none opacity-50";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      <Link
        href={href(current - 1)}
        aria-disabled={current <= 1}
        tabIndex={current <= 1 ? -1 : undefined}
        className={buttonClass("secondary", "sm", current <= 1 ? disabled : undefined)}
      >
        <ChevronLeft className="size-4" aria-hidden /> Previous
      </Link>
      <p className="text-sm text-ink-muted">
        Page {current} of {pages} <span className="text-ink-subtle">· {total} results</span>
      </p>
      <Link
        href={href(current + 1)}
        aria-disabled={current >= pages}
        tabIndex={current >= pages ? -1 : undefined}
        className={buttonClass("secondary", "sm", current >= pages ? disabled : undefined)}
      >
        Next <ChevronRight className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}

/** Reads a 1-based ?page= value into a 0-based index. */
export function pageIndex(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 1 ? n - 1 : 0;
}

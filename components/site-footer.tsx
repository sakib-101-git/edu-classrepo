import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="container-page flex flex-col gap-3 py-8 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          EDU ClassRepo · A student-run resource library for East Delta University.
          Materials are shared by students and reviewed before publishing.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/courses" className="hover:text-ink">Courses</Link>
          <Link href="/cover-page" className="hover:text-ink">Cover page</Link>
          <Link href="/upload" className="hover:text-ink">Contribute</Link>
        </nav>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { ArrowRight, BookOpen, FileStack, FileText, Library, Upload } from "lucide-react";
import { CourseGrid } from "@/components/course-card";
import { MaterialList } from "@/components/material-list";
import { SectionHeading } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { plural } from "@/lib/format";
import { getBackend } from "@/lib/server/backend";
import { getViewer } from "@/lib/server/session";

export default async function HomePage() {
  const backend = await getBackend();
  const viewer = await getViewer();
  const [departments, recent, myCourses] = await Promise.all([
    backend.listDepartments(),
    backend.listRecentMaterials(6),
    viewer?.onboarded ? backend.listMyCourses() : Promise.resolve([]),
  ]);
  const totalCourses = departments.reduce((n, d) => n + d.courseCount, 0);
  const totalMaterials = departments.reduce((n, d) => n + d.materialCount, 0);

  return (
    <div className="container-page py-10 sm:py-14">
      <section aria-labelledby="hero-title" className="max-w-3xl">
        <p className="mb-3 text-sm font-medium text-brand">East Delta University · student resource library</p>
        <h1 id="hero-title" className="text-4xl font-semibold leading-tight sm:text-5xl">
          {viewer?.fullName ? `Welcome back, ${viewer.fullName.split(" ")[0]}.` : "Find the notes, slides and papers your course needs."}
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          Materials organised by department, course and instructor — shared by EDU students and reviewed before they
          go live.
        </p>
        <div className="mt-6">
          <SearchBox size="lg" />
        </div>
        {totalCourses > 0 && (
          <p className="mt-3 text-sm text-ink-subtle">
            {plural(totalCourses, "course")} · {plural(totalMaterials, "published material")} ·{" "}
            {plural(departments.length, "department")}
          </p>
        )}
      </section>

      {viewer && !viewer.onboarded && (
        <div className="card mt-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-muted"><strong className="text-ink">Almost there.</strong> Finish setting up your account to save courses and upload.</p>
          <LinkButton href="/welcome">Finish sign-up</LinkButton>
        </div>
      )}

      {viewer?.onboarded && (
        <section aria-labelledby="mine" className="mt-12">
          <SectionHeading
            id="mine"
            title="Your courses"
            action={<Link href="/my-courses" className="text-sm font-medium text-brand hover:underline">Manage</Link>}
          />
          <div className="grid gap-3 lg:grid-cols-[1fr_17rem]">
            {myCourses.length > 0 ? (
              <CourseGrid courses={myCourses.slice(0, 6)} />
            ) : (
              <div className="card flex flex-col justify-center p-6 text-ink-muted">
                <p>Save the courses you&apos;re taking to reach their materials in one click.</p>
                <Link href="/courses" className="mt-2 inline-flex items-center gap-1 font-medium text-brand hover:underline">
                  Browse courses <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            )}
            <nav aria-label="Shortcuts" className="card flex flex-col p-2">
              {[
                { href: "/upload", icon: Upload, label: "Upload a material", hint: "Notes, slides, past papers" },
                { href: "/cover-page", icon: FileText, label: "Make a cover page", hint: "A4 PDF in a minute" },
                { href: "/uploads", icon: FileStack, label: "My uploads", hint: "Track review status" },
              ].map(({ href, icon: Icon, label, hint }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-lg p-3 hover:bg-surface-muted">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-ink-subtle">{hint}</span>
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      )}

      <section aria-labelledby="departments" className="mt-12">
        <SectionHeading
          id="departments"
          title="Browse by department"
          action={<Link href="/courses" className="text-sm font-medium text-brand hover:underline">All courses</Link>}
        />
        {departments.length === 0 ? (
          <EmptyState icon={Library} title="The catalog is empty">
            No departments or courses have been added yet.
            {viewer?.role === "admin" ? " Add them from the Admin area." : " Check back soon."}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/departments/${d.code.toLowerCase()}`}
                  className="card flex items-center gap-4 p-4 transition-colors hover:border-border-strong hover:bg-[#fffdfa]"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-semibold tracking-wide text-brand">
                    {d.code}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.name}</span>
                    <span className="block text-sm text-ink-subtle">
                      {plural(d.courseCount, "course")} · {plural(d.materialCount, "material")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent" className="mt-12">
        <SectionHeading id="recent" title="Recently published" />
        {recent.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No materials yet"
            action={<LinkButton href={viewer ? "/upload" : "/register"}>{viewer ? "Upload the first one" : "Create an account to contribute"}</LinkButton>}
          >
            Once students share notes and an admin approves them, they appear here.
          </EmptyState>
        ) : (
          <MaterialList materials={recent} showCourse />
        )}
      </section>

      {!viewer && (
        <section className="card mt-12 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Share what helped you</h2>
            <p className="mt-1 text-ink-muted">
              Sign up with your @eastdelta.edu.bd email to save courses, upload materials and generate cover pages
              with your details filled in.
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href="/register">Create account</LinkButton>
            <LinkButton href="/login" variant="secondary">Sign in</LinkButton>
          </div>
        </section>
      )}
    </div>
  );
}

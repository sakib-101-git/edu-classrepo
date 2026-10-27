import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { DesktopNav } from "@/components/nav";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const TABS = [
  { href: "/admin", label: "Review queue" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/faculty", label: "Instructors" },
  { href: "/admin/departments", label: "Departments" },
];

export function AdminShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="container-page py-10">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="-mt-4 mb-8 overflow-x-auto border-b border-border pb-2 [&_nav]:flex">
        <DesktopNav items={TABS} />
      </div>
      {children}
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="container-page py-16">
      <EmptyState icon={ShieldAlert} title="Admins only" action={<LinkButton href="/" variant="secondary">Go home</LinkButton>}>
        Your account doesn&apos;t have access to this area.
      </EmptyState>
    </div>
  );
}

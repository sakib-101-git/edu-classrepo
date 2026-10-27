import Link from "next/link";
import { LogOut, Shield, Upload, User, FileStack } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import type { Viewer } from "@/lib/types";
import { Avatar } from "./ui/avatar";
import { LinkButton } from "./ui/button";
import { Brand } from "./brand";
import { DesktopNav, MobileNav, UserMenu, type NavItem } from "./nav";

const menuItem = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-muted";

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const items: NavItem[] = [
    { href: "/courses", label: "Courses" },
    { href: "/departments", label: "Departments" },
    ...(viewer ? [{ href: "/my-courses", label: "My courses" }] : []),
    { href: "/cover-page", label: "Cover page" },
    ...(viewer?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <div className="container-page relative flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Brand />
          <DesktopNav items={items} />
        </div>

        <div className="flex items-center gap-2">
          {viewer ? (
            <>
              <LinkButton href="/upload" size="sm" className="hidden sm:inline-flex">
                <Upload className="size-4" aria-hidden /> Upload
              </LinkButton>
              <UserMenu label="Account menu" trigger={<Avatar name={viewer.fullName || viewer.email} src={viewer.avatarUrl} size={34} />}>
                <div className="px-3 pb-2 pt-1.5">
                  <p className="truncate text-sm font-semibold">{viewer.fullName || "New member"}</p>
                  <p className="truncate text-xs text-ink-subtle">{viewer.email}</p>
                </div>
                <div className="my-1 border-t border-border" />
                <Link href="/account" className={menuItem}><User className="size-4 text-ink-subtle" aria-hidden /> Account</Link>
                <Link href="/uploads" className={menuItem}><FileStack className="size-4 text-ink-subtle" aria-hidden /> My uploads</Link>
                <Link href="/upload" className={`${menuItem} sm:hidden`}><Upload className="size-4 text-ink-subtle" aria-hidden /> Upload</Link>
                {viewer.role === "admin" && (
                  <Link href="/admin" className={menuItem}><Shield className="size-4 text-ink-subtle" aria-hidden /> Admin</Link>
                )}
                <div className="my-1 border-t border-border" />
                <form action={signOutAction}>
                  <button type="submit" className={menuItem}><LogOut className="size-4 text-ink-subtle" aria-hidden /> Sign out</button>
                </form>
              </UserMenu>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">Sign in</LinkButton>
              <LinkButton href="/register" size="sm" className="hidden sm:inline-flex">Create account</LinkButton>
            </>
          )}
          <MobileNav
            items={items}
            footer={
              viewer ? (
                <LinkButton href="/upload" className="w-full"><Upload className="size-4" aria-hidden /> Upload a material</LinkButton>
              ) : (
                <LinkButton href="/register" className="w-full">Create account</LinkButton>
              )
            }
          />
        </div>
      </div>
    </header>
  );
}

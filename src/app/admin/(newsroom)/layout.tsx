import Link from "next/link";
import { NavLink } from "../_ui/nav-link";
import { SignOutButton } from "../_ui/sign-out-button";

const NAV = [
  ["/admin", "Inbox"],
  ["/admin/stories", "Stories"],
  ["/admin/conflicts", "Conflicts"],
  ["/admin/topics", "Sections"],
  ["/admin/map", "Map events"],
  ["/admin/activity", "Activity"],
] as const;

export default function NewsroomLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-semibold">
            GCW Newsroom
          </Link>
          <nav aria-label="Newsroom" className="order-last w-full sm:order-none sm:w-auto">
            <ul className="flex flex-wrap gap-1 text-sm">
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <NavLink href={href}>{label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ms-auto flex items-center gap-3 text-sm">
            <a href="/en" target="_blank" rel="noopener" className="text-neutral-600 underline-offset-2 hover:underline">
              View site
            </a>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

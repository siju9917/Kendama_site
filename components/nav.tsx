"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/clients", label: "Clients" },
  { href: "/calendar", label: "Calendar" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <div className="h-7 w-7 rounded bg-brand-600 grid place-items-center text-white font-bold text-sm">A</div>
            <span className="font-semibold">AppraiseOS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "px-3 py-1.5 rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " +
                  (active(l.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-700 hover:bg-gray-100")
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-gray-600">{userName}</span>
          <form action="/logout" method="post" className="hidden md:block">
            <button type="submit" className="btn-ghost text-sm">Log out</button>
          </form>
          <button
            type="button"
            className="md:hidden btn-ghost text-sm"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col px-4 py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={
                  "px-2 py-2 rounded-md text-sm font-medium " +
                  (active(l.href) ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100")
                }
              >
                {l.label}
              </Link>
            ))}
            <form action="/logout" method="post" className="mt-1 border-t border-gray-100 pt-2">
              <button type="submit" className="px-2 py-2 w-full text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                Log out ({userName})
              </button>
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/clients", label: "Clients" },
  { href: "/calendar", label: "Calendar" },
];

export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-brand-600 grid place-items-center text-white font-bold text-sm">A</div>
            <span className="font-semibold">AppraiseOS</span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "px-3 py-1.5 rounded-md text-sm font-medium " +
                    (active
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-700 hover:bg-gray-100")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{userName}</span>
          <form action="/logout" method="post">
            <button type="submit" className="btn-ghost text-sm">Log out</button>
          </form>
        </div>
      </div>
    </header>
  );
}

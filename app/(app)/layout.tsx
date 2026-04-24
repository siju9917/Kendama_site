import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { daysUntil } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const daysLeft = daysUntil(user.licenseExpiresAt);
  const expired = daysLeft != null && daysLeft < 0;
  const expiringSoon = daysLeft != null && daysLeft >= 0 && daysLeft <= 30;

  return (
    <div className="min-h-screen">
      <Nav userName={user.name} />
      {(expired || expiringSoon) && (
        <div
          className={
            (expired ? "bg-red-50 border-red-200 text-red-900" : "bg-amber-50 border-amber-200 text-amber-900") +
            " border-b px-4 py-2 text-sm"
          }
        >
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
            <div>
              {expired ? (
                <>⚠ Your appraiser license is expired. Sign actions are blocked.</>
              ) : (
                <>⚠ Your license expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}.</>
              )}
            </div>
            <Link href="/settings" className="underline whitespace-nowrap">Update in Settings</Link>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

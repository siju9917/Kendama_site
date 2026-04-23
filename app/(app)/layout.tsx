import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <Nav userName={user.name} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyPassword, createSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/login?e=bad");

  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email));
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?e=bad");
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { e } = await searchParams;
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card w-full max-w-md">
        <form action={login} className="card-body space-y-4">
          <h1 className="text-2xl font-semibold">Log in</h1>
          {e === "bad" && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              Invalid email or password.
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" name="email" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" name="password" required />
          </div>
          <button className="btn-primary w-full" type="submit">Log in</button>
          <p className="text-sm text-center text-gray-600">
            No account? <Link className="text-brand-600 hover:underline" href="/signup">Create one</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, hashPassword, createSession, randomId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function signup(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();
  if (!email || !password || !name) return;

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing.length) {
    redirect("/signup?e=exists");
  }

  try {
    const userId = randomId();
    await db.insert(schema.users).values({
      id: userId,
      email,
      name,
      passwordHash: hashPassword(password),
    });
    await createSession(userId);
  } catch (err: unknown) {
    // Handle the race where two concurrent signups hit the email UNIQUE constraint
    // after the first check passed (§3.13).
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      redirect("/signup?e=exists");
    }
    throw err;
  }
  redirect("/dashboard");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { e } = await searchParams;

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card w-full max-w-md">
        <form action={signup} className="card-body space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="text-sm text-gray-600 mt-1">Takes a few seconds. You'll set up your license and adjustment rules next.</p>
          </div>
          {e === "exists" && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              An account with that email already exists.
            </div>
          )}
          <div>
            <label className="label">Full name</label>
            <input className="input" name="name" placeholder="Dana Appraiser" required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" name="email" placeholder="dana@example.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" name="password" minLength={8} required />
          </div>
          <button className="btn-primary w-full" type="submit">Create account</button>
          <p className="text-sm text-center text-gray-600">
            Already have one? <Link className="text-brand-600 hover:underline" href="/login">Log in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

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

  const userId = randomId();
  await db.insert(schema.users).values({
    id: userId,
    email,
    name,
    passwordHash: hashPassword(password),
  });

  // Seed a default client + demo job so the user has something to click on immediately.
  const clientId = randomId();
  await db.insert(schema.clients).values({
    id: clientId,
    userId,
    name: "Pacific Northwest AMC",
    type: "amc",
    email: "orders@pnwamc.example",
    feeStandard: 550,
  });
  const jobId = randomId();
  await db.insert(schema.jobs).values({
    id: jobId,
    userId,
    clientId,
    subjectAddress: "1428 Maple Street",
    subjectCity: "Portland",
    subjectState: "OR",
    subjectZip: "97205",
    borrowerName: "J. Thompson",
    loanNumber: "LN-2026-" + Math.floor(Math.random() * 90000 + 10000),
    formType: "1004",
    feeCents: 55000,
    status: "NEW",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  });
  await db.insert(schema.jobEvents).values({
    id: randomId(),
    jobId,
    actorId: userId,
    type: "job.created",
    payload: JSON.stringify({ source: "signup-seed" }),
  });

  await createSession(userId);
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
            <p className="text-sm text-gray-600 mt-1">Get started in seconds. We'll seed a demo job.</p>
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

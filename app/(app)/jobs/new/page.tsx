import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, randomId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { listClientsForUser, recordEvent } from "@/lib/jobs";

async function createJob(formData: FormData) {
  "use server";
  const user = await requireUser();
  const clientId = String(formData.get("clientId") || "") || null;
  const subjectAddress = String(formData.get("subjectAddress") || "").trim();
  const subjectCity = String(formData.get("subjectCity") || "").trim();
  const subjectState = String(formData.get("subjectState") || "").trim().toUpperCase().slice(0, 2);
  const subjectZip = String(formData.get("subjectZip") || "").trim();
  const borrowerName = String(formData.get("borrowerName") || "").trim() || null;
  const loanNumber = String(formData.get("loanNumber") || "").trim() || null;
  const formType = String(formData.get("formType") || "1004");
  const feeDollars = Number(formData.get("fee") || 0);
  const dueStr = String(formData.get("dueAt") || "");

  if (!subjectAddress || !subjectCity || !subjectState || !subjectZip) {
    redirect("/jobs/new?e=missing");
  }

  const jobId = randomId();
  await db.insert(schema.jobs).values({
    id: jobId,
    userId: user.id,
    clientId,
    subjectAddress,
    subjectCity,
    subjectState,
    subjectZip,
    borrowerName,
    loanNumber,
    formType,
    feeCents: Math.round(feeDollars * 100),
    dueAt: dueStr ? new Date(dueStr) : null,
    status: "NEW",
  });
  await recordEvent(jobId, user.id, "job.created");
  redirect(`/jobs/${jobId}`);
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await requireUser();
  const clients = await listClientsForUser(user.id);
  const { e } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/jobs" className="text-sm text-gray-600 hover:underline">← Back to jobs</Link>
        <h1 className="text-3xl font-semibold mt-2">New job</h1>
      </div>

      <form action={createJob} className="card card-body space-y-5">
        {e === "missing" && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            Subject address, city, state, and zip are required.
          </div>
        )}

        <div>
          <label className="label">Client</label>
          <select name="clientId" className="input" defaultValue={clients[0]?.id || ""}>
            <option value="">— No client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="label">Subject property</legend>
          <input className="input" name="subjectAddress" placeholder="Street address" required />
          <div className="grid grid-cols-3 gap-3">
            <input className="input col-span-2" name="subjectCity" placeholder="City" required />
            <input className="input" name="subjectState" placeholder="ST" maxLength={2} required />
          </div>
          <input className="input" name="subjectZip" placeholder="ZIP" pattern="[0-9]{5}" required />
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Borrower</label>
            <input className="input" name="borrowerName" placeholder="Optional" />
          </div>
          <div>
            <label className="label">Loan #</label>
            <input className="input" name="loanNumber" placeholder="Optional" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Form</label>
            <select name="formType" className="input" defaultValue="1004">
              <option value="1004">1004 — SFR</option>
              <option value="1073">1073 — Condo</option>
              <option value="2055">2055 — Drive-by</option>
              <option value="1025">1025 — 2-4 Unit</option>
            </select>
          </div>
          <div>
            <label className="label">Fee ($)</label>
            <input className="input" name="fee" type="number" min="0" step="25" defaultValue={550} required />
          </div>
          <div>
            <label className="label">Due date</label>
            <input className="input" name="dueAt" type="date" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link href="/jobs" className="btn-secondary">Cancel</Link>
          <button className="btn-primary" type="submit">Create job</button>
        </div>
      </form>
    </div>
  );
}

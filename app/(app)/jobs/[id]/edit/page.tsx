import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { requireJobForUser, listClientsForUser, recordEvent } from "@/lib/jobs";
import { eq } from "drizzle-orm";
import { inputDate } from "@/lib/format";

async function saveJob(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  await requireJobForUser(user.id, jobId);

  const subjectAddress = String(formData.get("subjectAddress") || "").trim();
  const subjectCity = String(formData.get("subjectCity") || "").trim();
  const subjectState = String(formData.get("subjectState") || "").trim().toUpperCase().slice(0, 2);
  const subjectZip = String(formData.get("subjectZip") || "").trim();
  if (!subjectAddress || !subjectCity || !subjectState || !subjectZip) {
    redirect(`/jobs/${jobId}/edit?e=missing`);
  }

  const feeDollars = Number(formData.get("fee") || 0);
  if (!Number.isFinite(feeDollars) || feeDollars < 0) {
    redirect(`/jobs/${jobId}/edit?e=badfee`);
  }

  const dueStr = String(formData.get("dueAt") || "");
  await db
    .update(schema.jobs)
    .set({
      subjectAddress,
      subjectCity,
      subjectState,
      subjectZip,
      borrowerName: String(formData.get("borrowerName") || "").trim() || null,
      loanNumber: String(formData.get("loanNumber") || "").trim() || null,
      formType: String(formData.get("formType") || "1004"),
      feeCents: Math.round(feeDollars * 100),
      clientId: String(formData.get("clientId") || "") || null,
      dueAt: dueStr ? new Date(dueStr + "T23:59:59") : null, // 3.7: end-of-day in server TZ
    })
    .where(eq(schema.jobs.id, jobId));
  await recordEvent(jobId, user.id, "job.edited");
  redirect(`/jobs/${jobId}`);
}

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { e } = await searchParams;
  const job = await requireJobForUser(user.id, id);
  const clients = await listClientsForUser(user.id);

  const flash =
    e === "missing" ? "Subject address, city, state, and zip are required." :
    e === "badfee" ? "Fee must be zero or a positive number." :
    null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/jobs/${id}`} className="text-sm text-gray-600 hover:underline">← Back to job</Link>
        <h1 className="text-3xl font-semibold mt-2">Edit job</h1>
      </div>

      <form action={saveJob} className="card card-body space-y-5">
        <input type="hidden" name="jobId" value={id} />
        {flash && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{flash}</div>
        )}

        <div>
          <label htmlFor="clientId" className="label">Client</label>
          <select id="clientId" name="clientId" className="input" defaultValue={job.clientId || ""}>
            <option value="">— No client —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="label">Subject property</legend>
          <input className="input" name="subjectAddress" defaultValue={job.subjectAddress} required aria-label="Street address" />
          <div className="grid grid-cols-3 gap-3">
            <input className="input col-span-2" name="subjectCity" defaultValue={job.subjectCity} required aria-label="City" />
            <input className="input" name="subjectState" defaultValue={job.subjectState} maxLength={2} required aria-label="State" />
          </div>
          <input className="input" name="subjectZip" defaultValue={job.subjectZip} pattern="[0-9]{5}" required aria-label="ZIP" />
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="borrowerName" className="label">Borrower</label>
            <input id="borrowerName" className="input" name="borrowerName" defaultValue={job.borrowerName ?? ""} />
          </div>
          <div>
            <label htmlFor="loanNumber" className="label">Loan #</label>
            <input id="loanNumber" className="input" name="loanNumber" defaultValue={job.loanNumber ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="formType" className="label">Form</label>
            <select id="formType" name="formType" className="input" defaultValue={job.formType}>
              <option value="1004">1004 — SFR</option>
              <option value="1073">1073 — Condo</option>
              <option value="2055">2055 — Drive-by</option>
              <option value="1025">1025 — 2-4 Unit</option>
            </select>
          </div>
          <div>
            <label htmlFor="fee" className="label">Fee ($)</label>
            <input id="fee" className="input" name="fee" type="number" min="0" step="25" defaultValue={job.feeCents / 100} required />
          </div>
          <div>
            <label htmlFor="dueAt" className="label">Due date</label>
            <input id="dueAt" className="input" name="dueAt" type="date" defaultValue={inputDate(job.dueAt)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href={`/jobs/${id}`} className="btn-secondary">Cancel</Link>
          <button className="btn-primary" type="submit">Save changes</button>
        </div>
      </form>
    </div>
  );
}

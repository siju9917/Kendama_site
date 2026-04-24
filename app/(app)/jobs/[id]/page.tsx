import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, randomId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  requireJobForUser,
  listClientsForUser,
  listEventsForJob,
  listPhotosForJob,
  listRoomsForJob,
  listCompsForJob,
  getInvoiceForJob,
  recordEvent,
  computeGLA,
} from "@/lib/jobs";
import { and, eq } from "drizzle-orm";
import { usd, fmtDate, fmtDateTime, inputDateTime, STATUS_LABEL, type JobStatus } from "@/lib/format";
import { ConfirmSubmit } from "@/components/confirm-button";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * CAS helper: perform an UPDATE scoped to (id, expected status); if the
 * rowcount is 0 the user raced another tab. Drizzle returns `changes` on SQLite.
 */
async function casStatus(jobId: string, from: JobStatus, patch: Partial<typeof schema.jobs.$inferInsert>) {
  const result = await db
    .update(schema.jobs)
    .set(patch)
    .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.status, from)))
    .run();
  return result.changes > 0;
}

async function updateJob(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const job = await requireJobForUser(user.id, jobId);
  const action = String(formData.get("_action"));

  if (action === "schedule") {
    const inspectionStr = String(formData.get("inspectionAt") || "");
    const when = inspectionStr ? new Date(inspectionStr) : null;
    await db
      .update(schema.jobs)
      .set({ inspectionAt: when, status: when ? "SCHEDULED" : job.status })
      .where(eq(schema.jobs.id, jobId));
    await recordEvent(jobId, user.id, "inspection.scheduled", { at: when });
  } else if (action === "markInspected") {
    if (!(await casStatus(jobId, "SCHEDULED", { status: "INSPECTED" }))) {
      redirect(`/jobs/${jobId}?e=stale`);
    }
    await recordEvent(jobId, user.id, "status.changed", { to: "INSPECTED" });
  } else if (action === "markDrafting") {
    if (!(await casStatus(jobId, "INSPECTED", { status: "DRAFTING" }))) {
      redirect(`/jobs/${jobId}?e=stale`);
    }
    await recordEvent(jobId, user.id, "status.changed", { to: "DRAFTING" });
  } else if (action === "sign") {
    // 6.18: block signing with an expired license.
    if (user.licenseExpiresAt && user.licenseExpiresAt.getTime() < Date.now()) {
      redirect(`/jobs/${jobId}?e=expired`);
    }
    const valueDollars = Number(formData.get("valueConclusion") || 0);
    if (!Number.isFinite(valueDollars) || valueDollars <= 0 || valueDollars > 1e9) {
      redirect(`/jobs/${jobId}?e=badvalue`);
    }
    if (!(await casStatus(jobId, "DRAFTING", {
      status: "IN_REVIEW",
      signedAt: new Date(),
      valueConclusionCents: Math.round(valueDollars * 100),
    }))) {
      redirect(`/jobs/${jobId}?e=stale`);
    }
    await recordEvent(jobId, user.id, "report.signed", { value: valueDollars });
  } else if (action === "deliver") {
    if (!(await casStatus(jobId, "IN_REVIEW", { status: "DELIVERED", deliveredAt: new Date() }))) {
      redirect(`/jobs/${jobId}?e=stale`);
    }
    // After the CAS wins, create the invoice (at most one — we hold the transition).
    const invoice = await getInvoiceForJob(jobId);
    if (!invoice) {
      await db.insert(schema.invoices).values({
        id: randomId(),
        jobId,
        number: `INV-${new Date().getFullYear()}-${jobId.slice(0, 6).toUpperCase()}`,
        amountCents: job.feeCents,
        status: "sent",
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      });
    }
    await recordEvent(jobId, user.id, "report.delivered");
  } else if (action === "markPaid") {
    if (!(await casStatus(jobId, "DELIVERED", { status: "PAID", paidAt: new Date() }))) {
      redirect(`/jobs/${jobId}?e=stale`);
    }
    const invoice = await getInvoiceForJob(jobId);
    if (invoice) {
      await db
        .update(schema.invoices)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(schema.invoices.id, invoice.id));
    }
    await recordEvent(jobId, user.id, "invoice.paid");
  } else if (action === "updateClient") {
    const clientId = String(formData.get("clientId") || "") || null;
    await db.update(schema.jobs).set({ clientId }).where(eq(schema.jobs.id, jobId));
  } else if (action === "delete") {
    // Best-effort FS cleanup AFTER the DB is gone. Wrapped in a transaction so
    // the DB state is all-or-nothing.
    db.transaction((tx) => {
      tx.delete(schema.invoices).where(eq(schema.invoices.jobId, jobId)).run();
      tx.delete(schema.comparables).where(eq(schema.comparables.jobId, jobId)).run();
      tx.delete(schema.photos).where(eq(schema.photos.jobId, jobId)).run();
      tx.delete(schema.rooms).where(eq(schema.rooms.jobId, jobId)).run();
      tx.delete(schema.inspectionItems).where(eq(schema.inspectionItems.jobId, jobId)).run();
      tx.delete(schema.jobEvents).where(eq(schema.jobEvents.jobId, jobId)).run();
      tx.delete(schema.jobs)
        .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.userId, user.id)))
        .run();
    });
    try {
      await fs.rm(path.join(UPLOAD_DIR, jobId), { recursive: true, force: true });
    } catch {}
    redirect("/jobs");
  }
  redirect(`/jobs/${jobId}`);
}

export default async function JobDetail({
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
  const [clients, events, photos, rooms, comps, invoice] = await Promise.all([
    listClientsForUser(user.id),
    listEventsForJob(id),
    listPhotosForJob(id),
    listRoomsForJob(id),
    listCompsForJob(id),
    getInvoiceForJob(id),
  ]);
  const gla = computeGLA(rooms);
  const clientName = clients.find((c) => c.id === job.clientId)?.name;
  const invoiceUnpaid = invoice && invoice.status !== "paid";

  const flash =
    e === "stale" ? "Another tab changed this job. Reloaded with latest state." :
    e === "badvalue" ? "Value conclusion must be a positive number." :
    e === "expired" ? "Your appraiser license is expired. Update it in Settings before signing." :
    null;

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          {flash}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/jobs" className="text-sm text-gray-600 hover:underline">← All jobs</Link>
          <h1 className="text-2xl font-semibold mt-2">{job.subjectAddress}</h1>
          <div className="text-gray-600">{job.subjectCity}, {job.subjectState} {job.subjectZip}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`status-${job.status as JobStatus}`}>{STATUS_LABEL[job.status as JobStatus]}</span>
            <span className="text-sm text-gray-500">Form {job.formType} · {usd(job.feeCents)} · Due {fmtDate(job.dueAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-w-md">
          <Link href={`/jobs/${id}/edit`} className="btn-ghost">Edit</Link>
          <Link href={`/jobs/${id}/inspection`} className="btn-secondary">Inspection</Link>
          <Link href={`/jobs/${id}/comps`} className="btn-secondary">Comparables</Link>
          <Link
            href={`/jobs/${id}/report`}
            className="btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open report PDF
          </Link>
          <Link href={`/jobs/${id}/workfile`} className="btn-ghost">Export workfile</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card card-body">
            <h2 className="font-semibold mb-3">Workflow</h2>
            <div className="flex flex-wrap items-center gap-2">
              <form action={updateJob}>
                <input type="hidden" name="jobId" value={id} />
                <input type="hidden" name="_action" value="schedule" />
                <div className="flex items-center gap-2">
                  <input
                    className="input py-1.5"
                    type="datetime-local"
                    name="inspectionAt"
                    defaultValue={inputDateTime(job.inspectionAt)}
                  />
                  <button className="btn-secondary" type="submit">Schedule inspection</button>
                </div>
              </form>
              {job.status === "SCHEDULED" && (
                <form action={updateJob}>
                  <input type="hidden" name="jobId" value={id} />
                  <input type="hidden" name="_action" value="markInspected" />
                  <button className="btn-secondary" type="submit">Mark inspected</button>
                </form>
              )}
              {job.status === "INSPECTED" && (
                <form action={updateJob}>
                  <input type="hidden" name="jobId" value={id} />
                  <input type="hidden" name="_action" value="markDrafting" />
                  <button className="btn-secondary" type="submit">Start draft</button>
                </form>
              )}
              {job.status === "DRAFTING" && (
                <form action={updateJob} className="flex items-center gap-2">
                  <input type="hidden" name="jobId" value={id} />
                  <input type="hidden" name="_action" value="sign" />
                  <input
                    className="input py-1.5 w-40"
                    type="number"
                    step="1000"
                    name="valueConclusion"
                    placeholder="Value $"
                    required
                  />
                  <button className="btn-primary" type="submit">Sign report</button>
                </form>
              )}
              {job.status === "IN_REVIEW" && (
                <form action={updateJob}>
                  <input type="hidden" name="jobId" value={id} />
                  <input type="hidden" name="_action" value="deliver" />
                  <button className="btn-primary" type="submit">Deliver + invoice</button>
                </form>
              )}
              {job.status === "DELIVERED" && invoiceUnpaid && (
                <form action={updateJob}>
                  <input type="hidden" name="jobId" value={id} />
                  <input type="hidden" name="_action" value="markPaid" />
                  <button className="btn-primary" type="submit">Mark paid</button>
                </form>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
              <Fact label="Inspection" value={fmtDateTime(job.inspectionAt)} />
              <Fact label="Signed" value={fmtDateTime(job.signedAt)} />
              <Fact label="Delivered" value={fmtDateTime(job.deliveredAt)} />
              <Fact label="Value conclusion" value={job.valueConclusionCents ? usd(job.valueConclusionCents) : "—"} />
              <Fact label="GLA" value={gla ? `${Math.round(gla).toLocaleString()} sqft` : "—"} />
              <Fact label="Comps" value={String(comps.length)} />
            </div>
          </div>

          <div className="card">
            <div className="card-body border-b border-gray-100">
              <h2 className="font-semibold">Activity</h2>
            </div>
            <ul className="divide-y divide-gray-100 max-h-96 overflow-auto">
              {events.length === 0 && <li className="p-4 text-sm text-gray-500">No activity yet.</li>}
              {events.map((ev) => (
                <li key={ev.id} className="p-4 flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{ev.type}</div>
                    {ev.payload && <pre className="mt-0.5 text-xs text-gray-600 whitespace-pre-wrap break-words">{ev.payload}</pre>}
                  </div>
                  <div className="text-gray-500 whitespace-nowrap">{fmtDateTime(ev.at)}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card card-body">
            <h3 className="font-semibold mb-3">Summary</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Client" value={clientName || "—"} />
              <Row label="Borrower" value={job.borrowerName || "—"} />
              <Row label="Loan #" value={job.loanNumber || "—"} />
              <Row label="Form" value={job.formType} />
              <Row label="Fee" value={usd(job.feeCents)} />
              <Row label="Photos" value={String(photos.length)} />
              <Row label="Rooms" value={String(rooms.length)} />
            </dl>

            <form action={updateJob} className="mt-4 border-t pt-4">
              <input type="hidden" name="jobId" value={id} />
              <input type="hidden" name="_action" value="updateClient" />
              <label className="label">Change client</label>
              <select name="clientId" className="input" defaultValue={job.clientId || ""}>
                <option value="">— No client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button className="btn-secondary w-full mt-2" type="submit">Save</button>
            </form>
          </div>

          {invoice && (
            <div className="card card-body">
              <h3 className="font-semibold mb-3">Invoice</h3>
              <div className="text-sm">
                <div className="flex justify-between"><span className="text-gray-600">#</span><span className="font-mono">{invoice.number}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Amount</span><span>{usd(invoice.amountCents)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Status</span><span className="font-medium capitalize">{invoice.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Due</span><span>{fmtDate(invoice.dueAt)}</span></div>
              </div>
              <Link href={`/jobs/${id}/invoice`} target="_blank" className="btn-secondary w-full mt-3">Invoice PDF</Link>
            </div>
          )}

          <div className="card card-body">
            <h3 className="font-semibold mb-3 text-red-700">Danger zone</h3>
            <p className="text-xs text-gray-600 mb-3">
              Permanently removes the job, all inspection data, photos, comps, invoice, and activity log.
              Can't be undone.
            </p>
            <form action={updateJob}>
              <input type="hidden" name="jobId" value={id} />
              <input type="hidden" name="_action" value="delete" />
              <ConfirmSubmit
                label="Delete job"
                message="Permanently delete this job and all its data"
                confirmLabel="Yes, delete permanently"
              />
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

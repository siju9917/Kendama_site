import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { requireJobForUser, recordEvent } from "@/lib/jobs";
import { and, eq } from "drizzle-orm";
import { inputDate } from "@/lib/format";

async function saveComp(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const compId = String(formData.get("compId"));
  await requireJobForUser(user.id, jobId);

  await db
    .update(schema.comparables)
    .set({
      address: String(formData.get("address") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim().toUpperCase().slice(0, 2),
      zip: String(formData.get("zip") || "").trim(),
      saleDate: formData.get("saleDate") ? new Date(String(formData.get("saleDate"))) : null,
      salePriceCents: Math.round(Number(formData.get("salePrice") || 0) * 100),
      gla: Number(formData.get("gla") || 0),
      beds: Number(formData.get("beds") || 3),
      bathsFull: Number(formData.get("bathsFull") || 2),
      bathsHalf: Number(formData.get("bathsHalf") || 0),
      yearBuilt: Number(formData.get("yearBuilt")) || null,
      lotSqft: Number(formData.get("lotSqft")) || null,
      garageStalls: Number(formData.get("garageStalls") || 0),
      distanceMi: Number(formData.get("distanceMi")) || null,
      condition: String(formData.get("condition") || "C3"),
      quality: String(formData.get("quality") || "Q3"),
      notes: String(formData.get("notes") || "") || null,
    })
    // Tenant-scoped update: (id, jobId) guarantees cross-tenant safety.
    .where(and(eq(schema.comparables.id, compId), eq(schema.comparables.jobId, jobId)));
  await recordEvent(jobId, user.id, "comp.edited", { compId });
  redirect(`/jobs/${jobId}/comps`);
}

export default async function EditCompPage({ params }: { params: Promise<{ id: string; compId: string }> }) {
  const user = await requireUser();
  const { id, compId } = await params;
  await requireJobForUser(user.id, id);
  const rows = await db
    .select()
    .from(schema.comparables)
    .where(and(eq(schema.comparables.id, compId), eq(schema.comparables.jobId, id)));
  const comp = rows[0];
  if (!comp) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={`/jobs/${id}/comps`} className="text-sm text-gray-600 hover:underline">← Back to comps</Link>
        <h1 className="text-2xl font-semibold mt-2">Edit Comp {comp.position}</h1>
      </div>
      <form action={saveComp} className="card card-body grid grid-cols-2 md:grid-cols-6 gap-3">
        <input type="hidden" name="jobId" value={id} />
        <input type="hidden" name="compId" value={compId} />
        <Field span={3} label="Street"><input className="input" name="address" defaultValue={comp.address} required /></Field>
        <Field span={2} label="City"><input className="input" name="city" defaultValue={comp.city} required /></Field>
        <Field label="State"><input className="input" name="state" defaultValue={comp.state} maxLength={2} required /></Field>
        <Field label="ZIP"><input className="input" name="zip" defaultValue={comp.zip} required /></Field>
        <Field label="Sale date"><input className="input" name="saleDate" type="date" defaultValue={inputDate(comp.saleDate)} /></Field>
        <Field span={2} label="Sale price $"><input className="input" name="salePrice" type="number" step="1000" defaultValue={comp.salePriceCents / 100} required /></Field>
        <Field label="Dist (mi)"><input className="input" name="distanceMi" type="number" step="0.1" defaultValue={comp.distanceMi ?? undefined} /></Field>
        <Field label="GLA"><input className="input" name="gla" type="number" defaultValue={comp.gla} required /></Field>
        <Field label="Beds"><input className="input" name="beds" type="number" defaultValue={comp.beds} /></Field>
        <Field label="Full baths"><input className="input" name="bathsFull" type="number" defaultValue={comp.bathsFull} /></Field>
        <Field label="Half baths"><input className="input" name="bathsHalf" type="number" defaultValue={comp.bathsHalf} /></Field>
        <Field label="Garage"><input className="input" name="garageStalls" type="number" defaultValue={comp.garageStalls} /></Field>
        <Field label="Year built"><input className="input" name="yearBuilt" type="number" defaultValue={comp.yearBuilt ?? undefined} /></Field>
        <Field label="Lot sqft"><input className="input" name="lotSqft" type="number" defaultValue={comp.lotSqft ?? undefined} /></Field>
        <Field label="Condition"><select className="input" name="condition" defaultValue={comp.condition ?? "C3"}>{["C1","C2","C3","C4","C5"].map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Quality"><select className="input" name="quality" defaultValue={comp.quality ?? "Q3"}>{["Q1","Q2","Q3","Q4","Q5"].map(q=><option key={q}>{q}</option>)}</select></Field>
        <Field span={6} label="Notes"><textarea className="input" name="notes" rows={2} defaultValue={comp.notes ?? ""}/></Field>
        <div className="col-span-6 flex justify-end gap-2">
          <Link href={`/jobs/${id}/comps`} className="btn-secondary">Cancel</Link>
          <button className="btn-primary" type="submit">Save comp</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  const cls = span ? `md:col-span-${span}` : "";
  return (
    <label className={cls}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

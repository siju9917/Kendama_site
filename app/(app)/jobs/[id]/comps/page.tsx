import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, randomId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  requireJobForUser,
  listCompsForJob,
  listRoomsForJob,
  listItemsForJob,
  computeGLA,
  recordEvent,
  getAdjustmentProfile,
} from "@/lib/jobs";
import { eq, and } from "drizzle-orm";
import { computeCompAdjustments, reconcileValue, type Subject } from "@/lib/adjustments";
import { usd, usdPrecise, fmtDate, inputDate } from "@/lib/format";

async function addComp(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  await requireJobForUser(user.id, jobId);

  const existing = await listCompsForJob(jobId);
  const position = (existing[existing.length - 1]?.position ?? 0) + 1;

  await db.insert(schema.comparables).values({
    id: randomId(),
    jobId,
    position,
    address: String(formData.get("address") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    state: String(formData.get("state") || "").trim().toUpperCase(),
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
    source: "manual",
  });
  await recordEvent(jobId, user.id, "comp.added");
  redirect(`/jobs/${jobId}/comps`);
}

async function deleteComp(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const compId = String(formData.get("compId"));
  await requireJobForUser(user.id, jobId);
  await db.delete(schema.comparables).where(and(eq(schema.comparables.id, compId), eq(schema.comparables.jobId, jobId)));
  redirect(`/jobs/${jobId}/comps`);
}

function subjectFromChecklist(rooms: { lengthFt: number; widthFt: number; isBelowGrade: boolean }[], items: { section: string; key: string; valueText: string | null }[]): Subject {
  const find = (section: string, key: string) => items.find((i) => i.section === section && i.key === key)?.valueText ?? "";
  const num = (v: string) => (v === "" ? 0 : Number(v));
  const gla = Math.round(computeGLA(rooms));
  return {
    gla,
    beds: Number(find("bath", "beds")) || 3,
    bathsFull: num(find("bath", "full_baths")) || 2,
    bathsHalf: num(find("bath", "half_baths")),
    garageStalls: num(find("garage", "garage_stalls")),
    lotSqft: num(find("site", "lot_size")) || null,
    condition: find("interior", "condition_interior") || find("exterior", "condition_exterior") || null,
    quality: find("interior", "quality") || null,
  };
}

export const metadata = { title: "Comparables · AppraiseOS" };

export default async function CompsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const job = await requireJobForUser(user.id, id);
  const [comps, rooms, items, profile] = await Promise.all([
    listCompsForJob(id),
    listRoomsForJob(id),
    listItemsForJob(id),
    getAdjustmentProfile(user.id),
  ]);
  const subject = subjectFromChecklist(rooms, items);
  const computed = comps.map((c) => ({ comp: c, ...computeCompAdjustments(subject, c, profile) }));
  const indicated = reconcileValue(computed.map((c) => c.adjustedPriceCents));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/jobs/${id}`} className="text-sm text-gray-600 hover:underline">← {job.subjectAddress}</Link>
        <h1 className="text-2xl font-semibold mt-2">Comparables</h1>
        <p className="text-gray-600 text-sm mt-1">
          Subject rolled up from the inspection: {subject.gla} sqft GLA ·
          {" "}{subject.beds}/{subject.bathsFull}.{subject.bathsHalf} ·
          {" "}{subject.garageStalls}-car garage
          {subject.lotSqft ? <> · {subject.lotSqft.toLocaleString()} sqft lot</> : null}
        </p>
      </div>

      {comps.length > 0 && (
        <div className="card card-body">
          <h2 className="font-semibold mb-3">Adjustment grid</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Feature</th>
                  <th className="py-2 pr-3">Subject</th>
                  {computed.map((c) => (
                    <th key={c.comp.id} className="py-2 pr-3 min-w-[180px]">Comp {c.comp.position}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-1.5 pr-3 font-medium">Address</td>
                  <td className="py-1.5 pr-3 text-gray-700">{job.subjectAddress}</td>
                  {computed.map((c) => (
                    <td key={c.comp.id} className="py-1.5 pr-3 text-gray-700">
                      {c.comp.address}
                      <div className="text-xs text-gray-500">{c.comp.city}, {c.comp.state} {c.comp.distanceMi != null ? ` · ${c.comp.distanceMi} mi` : ""}</div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-medium">Sale price</td>
                  <td className="py-1.5 pr-3 text-gray-400">—</td>
                  {computed.map((c) => (
                    <td key={c.comp.id} className="py-1.5 pr-3">
                      {usdPrecise(c.comp.salePriceCents)}
                      <div className="text-xs text-gray-500">{fmtDate(c.comp.saleDate)}</div>
                    </td>
                  ))}
                </tr>
                {computed[0].rows.map((_, rowIdx) => {
                  const label = computed[0].rows[rowIdx].label;
                  return (
                    <tr key={rowIdx}>
                      <td className="py-1.5 pr-3 font-medium">{label}</td>
                      <td className="py-1.5 pr-3">{computed[0].rows[rowIdx].subjectVal}</td>
                      {computed.map((c) => {
                        const r = c.rows[rowIdx];
                        return (
                          <td key={c.comp.id} className="py-1.5 pr-3">
                            <div>{r.compVal}</div>
                            <div className={"text-xs " + (r.adjCents > 0 ? "text-emerald-700" : r.adjCents < 0 ? "text-red-700" : "text-gray-400")}>
                              {r.adjCents === 0 ? "no adj" : (r.adjCents > 0 ? "+" : "") + usdPrecise(r.adjCents)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="py-2 pr-3 font-semibold">Net adjustment</td>
                  <td></td>
                  {computed.map((c) => (
                    <td key={c.comp.id} className="py-2 pr-3 font-medium">
                      {(c.netAdjustmentCents > 0 ? "+" : "") + usdPrecise(c.netAdjustmentCents)}
                      <div className="text-xs text-gray-500">{c.netAdjustmentPct.toFixed(1)}%</div>
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2 pr-3 font-semibold">Gross adjustment</td>
                  <td></td>
                  {computed.map((c) => {
                    const warn25 = c.grossAdjustmentPct > 25;
                    const warn15 = c.grossAdjustmentPct > 15;
                    return (
                      <td key={c.comp.id} className="py-2 pr-3 font-medium">
                        {usdPrecise(c.grossAdjustmentCents)}
                        <div className={"text-xs " + (warn25 ? "text-red-700 font-semibold" : warn15 ? "text-amber-700" : "text-gray-500")}>
                          {c.grossAdjustmentPct.toFixed(1)}% {warn25 ? " ⚠ > 25%" : warn15 ? " ⚠ > 15%" : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t-2 border-gray-300 bg-brand-50">
                  <td className="py-3 pr-3 font-bold">Adjusted sale price</td>
                  <td></td>
                  {computed.map((c) => (
                    <td key={c.comp.id} className="py-3 pr-3 font-bold">{usdPrecise(c.adjustedPriceCents)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between bg-brand-50 border border-brand-200 rounded p-4">
            <div>
              <div className="text-sm text-brand-900/70">Indicated value (average of adjusted prices, rounded $1k)</div>
              <div className="text-2xl font-bold text-brand-900">{usd(indicated)}</div>
            </div>
            <div className="text-xs text-gray-600 text-right max-w-xs">
              Fannie guideline: single-comp net ≤ 15%, gross ≤ 25%. Rows flag in amber/red when over.
            </div>
          </div>

          <div className="mt-4 flex gap-3 flex-wrap text-xs">
            {comps.map((c) => (
              <div key={c.id} className="inline-flex items-center gap-1 border border-gray-200 rounded px-2 py-1">
                <span className="font-medium">Comp {c.position}</span>
                <Link href={`/jobs/${id}/comps/${c.id}/edit`} className="text-brand-600 hover:underline">Edit</Link>
                <span className="text-gray-300">·</span>
                <form action={deleteComp} className="inline-block">
                  <input type="hidden" name="jobId" value={id} />
                  <input type="hidden" name="compId" value={c.id} />
                  <button type="submit" className="text-red-600 hover:underline">Remove</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card card-body">
        <h2 className="font-semibold mb-3">Add a comparable</h2>
        <form action={addComp} className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <input type="hidden" name="jobId" value={id} />
          <input className="input md:col-span-3" name="address" placeholder="Street" required />
          <input className="input md:col-span-2" name="city" placeholder="City" required />
          <input className="input" name="state" placeholder="ST" maxLength={2} required />
          <input className="input" name="zip" placeholder="ZIP" required />
          <input className="input" name="saleDate" type="date" defaultValue={inputDate(Date.now() - 1000*60*60*24*30)} />
          <input className="input md:col-span-2" name="salePrice" type="number" step="1000" placeholder="Sale price $" required />
          <input className="input" name="distanceMi" type="number" step="0.1" placeholder="Dist (mi)" />
          <input className="input" name="gla" type="number" placeholder="GLA sqft" required />
          <input className="input" name="beds" type="number" placeholder="Beds" defaultValue={3} />
          <input className="input" name="bathsFull" type="number" placeholder="Full baths" defaultValue={2} />
          <input className="input" name="bathsHalf" type="number" placeholder="Half baths" defaultValue={0} />
          <input className="input" name="garageStalls" type="number" placeholder="Garage" defaultValue={2} />
          <input className="input" name="yearBuilt" type="number" placeholder="Year built" />
          <input className="input" name="lotSqft" type="number" placeholder="Lot sqft" />
          <select className="input" name="condition" defaultValue="C3">
            <option>C1</option><option>C2</option><option>C3</option><option>C4</option><option>C5</option>
          </select>
          <select className="input" name="quality" defaultValue="Q3">
            <option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>Q5</option>
          </select>
          <button className="btn-primary md:col-span-6 justify-self-end" type="submit">Add comparable</button>
        </form>
      </div>
    </div>
  );
}

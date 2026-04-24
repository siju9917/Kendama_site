import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getAdjustmentProfile } from "@/lib/jobs";
import { eq } from "drizzle-orm";

export const metadata = { title: "Adjustment rules · AppraiseOS" };

async function saveProfile(formData: FormData) {
  "use server";
  const user = await requireUser();
  const profile = await getAdjustmentProfile(user.id);
  const num = (k: string, min = 0, max = 1e9) => {
    const n = Number(formData.get(k) || 0);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return Math.round(n);
  };
  const cents = (k: string, dollars = true) => {
    const n = Number(formData.get(k) || 0);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * (dollars ? 100 : 1));
  };
  const annualPct = Number(formData.get("annualAppreciationPct") || 0);
  if (!Number.isFinite(annualPct) || annualPct < -50 || annualPct > 50) {
    redirect("/settings/adjustments?e=badrate");
  }
  await db
    .update(schema.adjustmentProfiles)
    .set({
      perGlaSqftCents: cents("perGlaSqft"),
      perBedCents: cents("perBed"),
      perFullBathCents: cents("perFullBath"),
      perHalfBathCents: cents("perHalfBath"),
      perGarageStallCents: cents("perGarageStall"),
      perLotSqftCents: cents("perLotSqft"),
      perConditionStepCents: cents("perConditionStep"),
      perQualityStepCents: cents("perQualityStep"),
      annualAppreciationBps: Math.round(annualPct * 100),
      updatedAt: new Date(),
    })
    .where(eq(schema.adjustmentProfiles.id, profile.id));
  redirect("/settings/adjustments?saved=1");
}

export default async function AdjustmentsSettingsPage({
  searchParams,
}: { searchParams: Promise<{ saved?: string; e?: string }> }) {
  const user = await requireUser();
  const { saved, e } = await searchParams;
  const p = await getAdjustmentProfile(user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-gray-600 hover:underline">← Settings</Link>
        <h1 className="text-3xl font-semibold mt-2">Adjustment rules</h1>
        <p className="text-gray-600 mt-1">
          Applied to every comparable grid. Tune per your market — these are defaults only.
        </p>
      </div>

      {saved === "1" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
          Rules saved. New comp grids will use them immediately.
        </div>
      )}
      {e === "badrate" && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-900">
          Annual appreciation must be between -50% and +50%.
        </div>
      )}

      <form action={saveProfile} className="card card-body space-y-6">
        <section className="space-y-3">
          <h2 className="font-semibold">Physical feature rates ($ per unit of difference)</h2>
          <div className="grid grid-cols-2 gap-3">
            <Dollar name="perGlaSqft" label="GLA ($/sqft)" value={p.perGlaSqftCents / 100} step="1" help="Typical: $40–$75" />
            <Dollar name="perBed" label="Bedroom ($)" value={p.perBedCents / 100} step="500" help="Typical: $3k–$10k" />
            <Dollar name="perFullBath" label="Full bath ($)" value={p.perFullBathCents / 100} step="500" help="Typical: $5k–$12k" />
            <Dollar name="perHalfBath" label="Half bath ($)" value={p.perHalfBathCents / 100} step="250" help="Typical: $2k–$5k" />
            <Dollar name="perGarageStall" label="Garage stall ($)" value={p.perGarageStallCents / 100} step="250" help="Typical: $3k–$7k" />
            <Dollar name="perLotSqft" label="Lot ($/sqft)" value={p.perLotSqftCents / 100} step="0.25" help="Typical: $1–$10 in urban markets" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Condition / quality</h2>
          <div className="grid grid-cols-2 gap-3">
            <Dollar name="perConditionStep" label="Condition step ($)" value={p.perConditionStepCents / 100} step="500" help="C1 vs C2, C2 vs C3, etc." />
            <Dollar name="perQualityStep" label="Quality step ($)" value={p.perQualityStepCents / 100} step="500" help="Q1 vs Q2, Q2 vs Q3, etc." />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Time adjustment</h2>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Annual appreciation (%)</span>
              <input
                className="input"
                type="number"
                step="0.25"
                name="annualAppreciationPct"
                defaultValue={p.annualAppreciationBps / 100}
              />
              <p className="text-xs text-gray-500 mt-0.5">Positive = rising market. Compounded monthly from each comp's sale date.</p>
            </label>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button className="btn-primary" type="submit">Save rules</button>
        </div>
      </form>
    </div>
  );
}

function Dollar({
  name, label, value, step, help,
}: { name: string; label: string; value: number; step: string; help?: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input" type="number" name={name} defaultValue={value} step={step} min="0" />
      {help && <p className="text-xs text-gray-500 mt-0.5">{help}</p>}
    </label>
  );
}

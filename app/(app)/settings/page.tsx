import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings · AppraiseOS" };

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SignaturePad } from "@/components/signature-pad";
import { inputDate, daysUntil } from "@/lib/format";

async function saveProfile(formData: FormData) {
  "use server";
  const user = await requireUser();
  const expiresStr = String(formData.get("licenseExpiresAt") || "");
  const signatureDataUrl = String(formData.get("signature") || "");

  await db
    .update(schema.users)
    .set({
      name: String(formData.get("name") || "").trim() || user.name,
      licenseNumber: String(formData.get("licenseNumber") || "").trim() || null,
      licenseState: String(formData.get("licenseState") || "").trim().toUpperCase().slice(0, 2) || null,
      licenseExpiresAt: expiresStr ? new Date(expiresStr + "T23:59:59") : null,
      // Only persist signature if the user drew one this submit (non-empty data URL).
      ...(signatureDataUrl && signatureDataUrl.startsWith("data:image/")
        ? { signatureDataUrl }
        : {}),
    })
    .where(eq(schema.users.id, user.id));
  redirect("/settings?saved=1");
}

export default async function SettingsPage({
  searchParams,
}: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { saved } = await searchParams;
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  const me = rows[0]!;
  const daysLeft = daysUntil(me.licenseExpiresAt);
  const expiringSoon = daysLeft != null && daysLeft <= 30 && daysLeft >= 0;
  const expired = daysLeft != null && daysLeft < 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-gray-600 mt-1">Profile, license, and signature used on signed reports.</p>
      </div>

      {saved === "1" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
          Settings saved.
        </div>
      )}
      {expired && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-900">
          ⚠ Your license is expired. The Sign report action is blocked until you renew and update here.
        </div>
      )}
      {expiringSoon && !expired && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          ⚠ License expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}. Update once you've renewed.
        </div>
      )}

      <form action={saveProfile} className="space-y-6">
        <section className="card card-body space-y-3">
          <h2 className="font-semibold">Profile</h2>
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input id="name" className="input" name="name" defaultValue={me.name} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" value={me.email} disabled />
            <p className="text-xs text-gray-500 mt-1">Email changes aren't supported yet.</p>
          </div>
        </section>

        <section className="card card-body space-y-3">
          <h2 className="font-semibold">License</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="licenseNumber" className="label">License #</label>
              <input id="licenseNumber" className="input" name="licenseNumber" defaultValue={me.licenseNumber ?? ""} />
            </div>
            <div>
              <label htmlFor="licenseState" className="label">State</label>
              <input id="licenseState" className="input" name="licenseState" maxLength={2} defaultValue={me.licenseState ?? ""} />
            </div>
          </div>
          <div>
            <label htmlFor="licenseExpiresAt" className="label">Expires</label>
            <input id="licenseExpiresAt" className="input" type="date" name="licenseExpiresAt" defaultValue={inputDate(me.licenseExpiresAt)} />
          </div>
        </section>

        <section className="card card-body space-y-3">
          <h2 className="font-semibold">Signature</h2>
          <p className="text-sm text-gray-600">Drawn here once, embedded on every signed URAR you produce.</p>
          <SignaturePad name="signature" initialDataUrl={me.signatureDataUrl} />
        </section>

        <div className="flex justify-end">
          <button className="btn-primary" type="submit">Save settings</button>
        </div>
      </form>

      <section className="card card-body">
        <h2 className="font-semibold">Adjustment rules</h2>
        <p className="text-sm text-gray-600 mt-1 mb-3">
          Configure the $-per-unit adjustments used in every comparable grid.
        </p>
        <a href="/settings/adjustments" className="btn-secondary">Open adjustment settings →</a>
      </section>
    </div>
  );
}

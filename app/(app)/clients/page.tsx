import { requireUser, randomId } from "@/lib/auth";

export const metadata = { title: "Clients · AppraiseOS" };

import { db, schema } from "@/lib/db";
import { redirect } from "next/navigation";
import { listClientsForUser } from "@/lib/jobs";
import { eq, and, count } from "drizzle-orm";

async function addClient(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/clients?e=missing");
  await db.insert(schema.clients).values({
    id: randomId(),
    userId: user.id,
    name,
    type: String(formData.get("type") || "amc"),
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    feeStandard: Number(formData.get("feeStandard") || 500),
  });
  redirect("/clients");
}

async function saveClient(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/clients?e=missing");
  await db
    .update(schema.clients)
    .set({
      name,
      type: String(formData.get("type") || "amc"),
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      feeStandard: Number(formData.get("feeStandard") || 500),
    })
    // Tenant-scoped: user can only edit their own.
    .where(and(eq(schema.clients.id, id), eq(schema.clients.userId, user.id)));
  redirect("/clients");
}

async function deleteClient(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  // 3.12: block delete when jobs still reference the client.
  const refs = await db
    .select({ n: count() })
    .from(schema.jobs)
    .where(and(eq(schema.jobs.clientId, id), eq(schema.jobs.userId, user.id)));
  if ((refs[0]?.n ?? 0) > 0) {
    redirect(`/clients?e=inuse`);
  }
  await db.delete(schema.clients).where(
    and(eq(schema.clients.id, id), eq(schema.clients.userId, user.id)),
  );
  redirect("/clients");
}

export default async function ClientsPage({
  searchParams,
}: { searchParams: Promise<{ e?: string; edit?: string }> }) {
  const user = await requireUser();
  const { e, edit: editId } = await searchParams;
  const clients = await listClientsForUser(user.id);
  const editing = editId ? clients.find((c) => c.id === editId) : null;

  const flash =
    e === "missing" ? "Client name is required." :
    e === "inuse" ? "Can't delete a client with jobs attached. Reassign the jobs first." :
    null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Clients</h1>

      {flash && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">{flash}</div>
      )}

      {editing ? (
        <form action={saveClient} className="card card-body grid md:grid-cols-5 gap-3">
          <input type="hidden" name="id" value={editing.id} />
          <input className="input md:col-span-2" name="name" defaultValue={editing.name} placeholder="Client name" required aria-label="Client name" />
          <select className="input" name="type" defaultValue={editing.type}>
            <option value="amc">AMC</option>
            <option value="lender">Lender</option>
            <option value="private">Private</option>
          </select>
          <input className="input" name="email" type="email" defaultValue={editing.email ?? ""} placeholder="Email" />
          <input className="input" name="feeStandard" type="number" defaultValue={editing.feeStandard ?? 550} placeholder="Typical fee $" />
          <div className="md:col-span-5 flex items-center gap-2">
            <button className="btn-primary" type="submit">Save</button>
            <a href="/clients" className="btn-secondary">Cancel</a>
          </div>
        </form>
      ) : (
        <form action={addClient} className="card card-body grid md:grid-cols-5 gap-3">
          <input className="input md:col-span-2" name="name" placeholder="Client name" required aria-label="Client name" />
          <select className="input" name="type" defaultValue="amc">
            <option value="amc">AMC</option>
            <option value="lender">Lender</option>
            <option value="private">Private</option>
          </select>
          <input className="input" name="email" type="email" placeholder="Email" />
          <input className="input" name="feeStandard" type="number" placeholder="Typical fee $" defaultValue={550} />
          <button className="btn-primary md:col-span-5 justify-self-start" type="submit">Add client</button>
        </form>
      )}

      <div className="card">
        <ul className="divide-y divide-gray-100">
          {clients.length === 0 && (
            <li className="p-8 text-sm text-gray-500 text-center">
              No clients yet. Add your first AMC or lender above.
            </li>
          )}
          {clients.map((c) => (
            <li key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-600">
                  <span className="capitalize">{c.type}</span>
                  {c.email && <> · {c.email}</>}
                  {c.feeStandard != null && <> · Typical fee ${c.feeStandard}</>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/clients?edit=${c.id}`} className="text-sm text-brand-600 hover:underline">Edit</a>
                <form action={deleteClient}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:underline"
                    aria-label={`Delete client ${c.name}`}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

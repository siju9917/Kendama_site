import { requireUser, randomId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { redirect } from "next/navigation";
import { listClientsForUser } from "@/lib/jobs";
import { eq, and } from "drizzle-orm";

async function addClient(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/clients");
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

async function deleteClient(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  await db.delete(schema.clients).where(and(eq(schema.clients.id, id), eq(schema.clients.userId, user.id)));
  redirect("/clients");
}

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await listClientsForUser(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Clients</h1>

      <form action={addClient} className="card card-body grid md:grid-cols-5 gap-3">
        <input className="input md:col-span-2" name="name" placeholder="Client name" required />
        <select className="input" name="type" defaultValue="amc">
          <option value="amc">AMC</option>
          <option value="lender">Lender</option>
          <option value="private">Private</option>
        </select>
        <input className="input" name="email" type="email" placeholder="Email" />
        <input className="input" name="feeStandard" type="number" placeholder="Typical fee $" defaultValue={550} />
        <button className="btn-primary md:col-span-5 justify-self-start" type="submit">Add client</button>
      </form>

      <div className="card">
        <ul className="divide-y divide-gray-100">
          {clients.length === 0 && <li className="p-4 text-sm text-gray-500">No clients yet.</li>}
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
              <form action={deleteClient}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn-ghost text-red-600" type="submit">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

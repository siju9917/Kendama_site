import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireUser, randomId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  requireJobForUser,
  listItemsForJob,
  listRoomsForJob,
  listPhotosForJob,
  recordEvent,
  computeGLA,
} from "@/lib/jobs";
import { eq, and } from "drizzle-orm";
import { URAR_1004_CHECKLIST } from "@/lib/checklist";
import { validatePhoto, MAX_PHOTOS_PER_REQUEST } from "@/lib/images";
import { PhotoGrid } from "@/components/photo-grid";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function saveChecklist(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const job = await getJobForUser(user.id, jobId);
  if (!job) throw new Response("Not found", { status: 404 });

  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("ci_")) continue;
    const rest = k.slice(3);
    const dot = rest.indexOf(".");
    if (dot < 0) continue;
    const section = rest.slice(0, dot);
    const key = rest.slice(dot + 1);
    const str = String(v);
    const existing = await db
      .select()
      .from(schema.inspectionItems)
      .where(and(
        eq(schema.inspectionItems.jobId, jobId),
        eq(schema.inspectionItems.section, section),
        eq(schema.inspectionItems.key, key),
      ));
    if (existing[0]) {
      await db
        .update(schema.inspectionItems)
        .set({ valueText: str, updatedAt: new Date() })
        .where(eq(schema.inspectionItems.id, existing[0].id));
    } else if (str !== "") {
      await db.insert(schema.inspectionItems).values({
        id: randomId(),
        jobId,
        section,
        key,
        valueText: str,
      });
    }
  }
  await recordEvent(jobId, user.id, "inspection.updated");
  redirect(`/jobs/${jobId}/inspection`);
}

async function addRoom(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const job = await getJobForUser(user.id, jobId);
  if (!job) throw new Response("Not found", { status: 404 });
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect(`/jobs/${jobId}/inspection`);
  await db.insert(schema.rooms).values({
    id: randomId(),
    jobId,
    name,
    level: String(formData.get("level") || "Main"),
    lengthFt: Number(formData.get("lengthFt") || 0),
    widthFt: Number(formData.get("widthFt") || 0),
    isBelowGrade: String(formData.get("isBelowGrade") || "") === "on",
  });
  await recordEvent(jobId, user.id, "room.added", { name });
  redirect(`/jobs/${jobId}/inspection`);
}

async function deleteRoom(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const roomId = String(formData.get("roomId"));
  await requireJobForUser(user.id, jobId);
  // Scope by BOTH id and jobId: prevents a crafted request from deleting a
  // row belonging to a different job.
  await db.delete(schema.rooms).where(
    and(eq(schema.rooms.id, roomId), eq(schema.rooms.jobId, jobId)),
  );
  redirect(`/jobs/${jobId}/inspection`);
}

async function uploadPhoto(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  await requireJobForUser(user.id, jobId);

  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS_PER_REQUEST);
  const tag = String(formData.get("tag") || "misc");
  const caption = String(formData.get("caption") || "") || null;

  await fs.mkdir(path.join(UPLOAD_DIR, jobId), { recursive: true });

  let accepted = 0;
  let rejected = 0;
  for (const file of files) {
    const raw = Buffer.from(await file.arrayBuffer());
    // Server-side magic-byte sniff — client-supplied MIME and filename are untrusted.
    const validated = validatePhoto(raw);
    if (!validated) {
      rejected++;
      continue;
    }
    const id = randomId();
    const filename = `${id}.${validated.ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, jobId, filename), validated.buf);
    await db.insert(schema.photos).values({
      id,
      jobId,
      filename,
      mimeType: validated.mime,
      tag,
      caption,
      sizeBytes: validated.buf.length,
    });
    accepted++;
  }
  if (accepted) await recordEvent(jobId, user.id, "photos.uploaded", { count: accepted, tag });
  redirect(`/jobs/${jobId}/inspection${rejected ? `?rejected=${rejected}` : ""}`);
}

async function deletePhoto(formData: FormData) {
  "use server";
  const user = await requireUser();
  const jobId = String(formData.get("jobId"));
  const photoId = String(formData.get("photoId"));
  await requireJobForUser(user.id, jobId);
  const photos = await db
    .select()
    .from(schema.photos)
    .where(and(eq(schema.photos.id, photoId), eq(schema.photos.jobId, jobId)));
  const photo = photos[0];
  if (photo) {
    try { await fs.unlink(path.join(UPLOAD_DIR, jobId, photo.filename)); } catch {}
    await db.delete(schema.photos).where(
      and(eq(schema.photos.id, photoId), eq(schema.photos.jobId, jobId)),
    );
  }
  redirect(`/jobs/${jobId}/inspection`);
}

export default async function InspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rejected?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { rejected } = await searchParams;
  const job = await requireJobForUser(user.id, id);
  const [items, rooms, photos] = await Promise.all([
    listItemsForJob(id),
    listRoomsForJob(id),
    listPhotosForJob(id),
  ]);
  const gla = computeGLA(rooms);
  const rejectedCount = Number(rejected) || 0;

  const itemValue = (section: string, key: string) =>
    items.find((i) => i.section === section && i.key === key)?.valueText ?? "";

  const photosByTag = photos.reduce<Record<string, typeof photos>>((acc, p) => {
    const t = p.tag || "misc";
    (acc[t] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/jobs/${id}`} className="text-sm text-gray-600 hover:underline">← {job.subjectAddress}</Link>
        <h1 className="text-2xl font-semibold mt-2">Inspection</h1>
      </div>
      {rejectedCount > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          {rejectedCount} file{rejectedCount > 1 ? "s were" : " was"} rejected — only JPEG, PNG,
          and WebP images up to 12 MB are accepted. HEIC from iPhone isn't supported yet.
        </div>
      )}

      <div className="card card-body">
        <h2 className="font-semibold mb-3">Rooms &amp; GLA</h2>
        <table className="w-full text-sm">
          <thead className="text-gray-600">
            <tr><th className="text-left py-1 w-1/3">Room</th><th className="text-left">Level</th><th>L</th><th>W</th><th>Area</th><th>Below grade</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="py-2">{r.name}</td>
                <td>{r.level}</td>
                <td className="text-center">{r.lengthFt}</td>
                <td className="text-center">{r.widthFt}</td>
                <td className="text-center">{(r.lengthFt * r.widthFt).toFixed(0)}</td>
                <td className="text-center">{r.isBelowGrade ? "Yes" : ""}</td>
                <td className="text-right">
                  <form action={deleteRoom}>
                    <input type="hidden" name="jobId" value={id} />
                    <input type="hidden" name="roomId" value={r.id} />
                    <button type="submit" className="text-red-600 hover:underline text-xs">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && <tr><td colSpan={7} className="py-3 text-gray-500">No rooms yet.</td></tr>}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={4} className="pt-3 font-semibold">GLA (above-grade):</td>
              <td className="pt-3 text-center font-semibold">{Math.round(gla).toLocaleString()} sqft</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>

        <form action={addRoom} className="mt-5 grid grid-cols-6 gap-2">
          <input type="hidden" name="jobId" value={id} />
          <input className="input col-span-2" name="name" placeholder="Room name (Kitchen, Bed 1…)" required />
          <select className="input" name="level" defaultValue="Main">
            <option>Main</option><option>Upper</option><option>Lower</option><option>Basement</option>
          </select>
          <input className="input" name="lengthFt" type="number" step="0.5" placeholder="L (ft)" required />
          <input className="input" name="widthFt" type="number" step="0.5" placeholder="W (ft)" required />
          <label className="flex items-center gap-2 text-sm col-span-5">
            <input type="checkbox" name="isBelowGrade" /> Below grade (excluded from GLA)
          </label>
          <button className="btn-primary" type="submit">Add</button>
        </form>
      </div>

      <form action={saveChecklist} className="card card-body space-y-6">
        <input type="hidden" name="jobId" value={id} />
        <h2 className="font-semibold">URAR checklist</h2>
        {URAR_1004_CHECKLIST.map((section) => (
          <fieldset key={section.key} className="border-t border-gray-100 pt-4 first:border-none first:pt-0">
            <legend className="font-medium mb-3">{section.title}</legend>
            <div className="grid md:grid-cols-2 gap-3">
              {section.items.map((it) => {
                const name = `ci_${section.key}.${it.key}`;
                const val = itemValue(section.key, it.key);
                return (
                  <div key={it.key}>
                    <label className="label">{it.label}</label>
                    {it.kind === "textarea" ? (
                      <textarea className="input" rows={2} name={name} defaultValue={val} />
                    ) : it.kind === "select" ? (
                      <select className="input" name={name} defaultValue={val}>
                        <option value=""></option>
                        {it.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : it.kind === "number" ? (
                      <input className="input" type="number" step="0.5" name={name} defaultValue={val} />
                    ) : (
                      <input className="input" type="text" name={name} defaultValue={val} />
                    )}
                    {it.hint && <p className="text-xs text-gray-500 mt-0.5">{it.hint}</p>}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
        <div className="flex justify-end pt-2">
          <button className="btn-primary" type="submit">Save checklist</button>
        </div>
      </form>

      <div className="card card-body">
        <h2 className="font-semibold mb-3">Photos ({photos.length})</h2>
        <form action={uploadPhoto} encType="multipart/form-data" className="grid md:grid-cols-6 gap-2 items-start">
          <input type="hidden" name="jobId" value={id} />
          <select className="input md:col-span-1" name="tag" defaultValue="front">
            <option value="front">Front elevation</option>
            <option value="rear">Rear elevation</option>
            <option value="street">Street scene</option>
            <option value="kitchen">Kitchen</option>
            <option value="bath">Bath</option>
            <option value="living">Living</option>
            <option value="bedroom">Bedroom</option>
            <option value="mechanical">Mechanical</option>
            <option value="exterior_misc">Exterior misc</option>
            <option value="interior_misc">Interior misc</option>
          </select>
          <input className="input md:col-span-2" name="caption" placeholder="Caption (optional)" />
          <input className="input md:col-span-2" type="file" name="photos" accept="image/*" multiple required />
          <button className="btn-primary" type="submit">Upload</button>
        </form>

        <div className="mt-5 space-y-6">
          {Object.keys(photosByTag).length === 0 && <p className="text-sm text-gray-500">No photos uploaded yet.</p>}
          {Object.entries(photosByTag).map(([tag, tagPhotos]) => (
            <div key={tag}>
              <h3 className="font-medium capitalize mb-2">
                {tag.replace("_", " ")}{" "}
                <span className="text-xs text-gray-500">({tagPhotos.length})</span>
              </h3>
              <PhotoGrid
                jobId={id}
                photos={tagPhotos.map((p) => ({ id: p.id, caption: p.caption, tag: p.tag }))}
                renderDeleteForm={(photoId) => (
                  <form action={deletePhoto}>
                    <input type="hidden" name="jobId" value={id} />
                    <input type="hidden" name="photoId" value={photoId} />
                    <button
                      type="submit"
                      className="bg-red-600 text-white text-xs rounded px-2 py-0.5"
                      aria-label="Delete photo"
                    >
                      ✕
                    </button>
                  </form>
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

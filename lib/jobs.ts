import { db, schema } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomId } from "./auth";
import { notFound } from "next/navigation";

export async function listJobsForUser(userId: string) {
  return db.select().from(schema.jobs).where(eq(schema.jobs.userId, userId)).orderBy(desc(schema.jobs.createdAt));
}

export async function getJobForUser(userId: string, jobId: string) {
  const rows = await db
    .select()
    .from(schema.jobs)
    .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.userId, userId)));
  return rows[0] ?? null;
}

/**
 * Load a job for the current user or 404 out. Use in every server action
 * before any child-record mutation — provides the tenant-isolation guard.
 */
export async function requireJobForUser(userId: string, jobId: string) {
  const job = await getJobForUser(userId, jobId);
  if (!job) notFound();
  return job;
}

export async function listClientsForUser(userId: string) {
  return db.select().from(schema.clients).where(eq(schema.clients.userId, userId)).orderBy(schema.clients.name);
}

export async function recordEvent(jobId: string, actorId: string, type: string, payload?: unknown) {
  await db.insert(schema.jobEvents).values({
    id: randomId(),
    jobId,
    actorId,
    type,
    payload: payload == null ? null : JSON.stringify(payload),
  });
}

export async function listEventsForJob(jobId: string) {
  return db
    .select()
    .from(schema.jobEvents)
    .where(eq(schema.jobEvents.jobId, jobId))
    .orderBy(desc(schema.jobEvents.at));
}

export async function listPhotosForJob(jobId: string) {
  return db
    .select()
    .from(schema.photos)
    .where(eq(schema.photos.jobId, jobId))
    .orderBy(desc(schema.photos.createdAt));
}

export async function listRoomsForJob(jobId: string) {
  return db.select().from(schema.rooms).where(eq(schema.rooms.jobId, jobId));
}

export async function listCompsForJob(jobId: string) {
  return db
    .select()
    .from(schema.comparables)
    .where(eq(schema.comparables.jobId, jobId))
    .orderBy(schema.comparables.position);
}

export async function listItemsForJob(jobId: string) {
  return db.select().from(schema.inspectionItems).where(eq(schema.inspectionItems.jobId, jobId));
}

export async function getInvoiceForJob(jobId: string) {
  const rows = await db.select().from(schema.invoices).where(eq(schema.invoices.jobId, jobId));
  return rows[0] ?? null;
}

export function computeGLA(rooms: { lengthFt: number; widthFt: number; isBelowGrade: boolean }[]) {
  return rooms.reduce((sum, r) => (r.isBelowGrade ? sum : sum + r.lengthFt * r.widthFt), 0);
}

export function computeGBA(rooms: { lengthFt: number; widthFt: number }[]) {
  return rooms.reduce((sum, r) => sum + r.lengthFt * r.widthFt, 0);
}

/**
 * Load the user's adjustment profile, creating a default row if absent.
 * Called from the comps grid and PDF renderer so rules stay in sync.
 */
export async function getAdjustmentProfile(userId: string) {
  const rows = await db
    .select()
    .from(schema.adjustmentProfiles)
    .where(eq(schema.adjustmentProfiles.userId, userId));
  if (rows[0]) return rows[0];
  // Insert defaults.
  const id = randomId();
  await db.insert(schema.adjustmentProfiles).values({ id, userId });
  const fresh = await db
    .select()
    .from(schema.adjustmentProfiles)
    .where(eq(schema.adjustmentProfiles.id, id));
  return fresh[0]!;
}

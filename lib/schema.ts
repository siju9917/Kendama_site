import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const ts = () => integer("_ts", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  licenseExpiresAt: integer("license_expires_at", { mode: "timestamp_ms" }),
  signatureDataUrl: text("signature_data_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("amc"),
  email: text("email"),
  phone: text("phone"),
  feeStandard: integer("fee_standard").default(500),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  clientId: text("client_id").references(() => clients.id),
  subjectAddress: text("subject_address").notNull(),
  subjectCity: text("subject_city").notNull(),
  subjectState: text("subject_state").notNull(),
  subjectZip: text("subject_zip").notNull(),
  borrowerName: text("borrower_name"),
  loanNumber: text("loan_number"),
  formType: text("form_type").notNull().default("1004"),
  feeCents: integer("fee_cents").notNull().default(50000),
  dueAt: integer("due_at", { mode: "timestamp_ms" }),
  status: text("status").notNull().default("NEW"),
  inspectionAt: integer("inspection_at", { mode: "timestamp_ms" }),
  valueConclusionCents: integer("value_conclusion_cents"),
  signedAt: integer("signed_at", { mode: "timestamp_ms" }),
  deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const jobEvents = sqliteTable("job_events", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  actorId: text("actor_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  payload: text("payload"),
  at: integer("at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const inspectionItems = sqliteTable("inspection_items", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  section: text("section").notNull(),
  key: text("key").notNull(),
  valueText: text("value_text"),
  valueNumber: real("value_number"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  name: text("name").notNull(),
  level: text("level").notNull().default("Main"),
  lengthFt: real("length_ft").notNull().default(0),
  widthFt: real("width_ft").notNull().default(0),
  isBelowGrade: integer("is_below_grade", { mode: "boolean" }).notNull().default(false),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  tag: text("tag"),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const comparables = sqliteTable("comparables", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  position: integer("position").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  saleDate: integer("sale_date", { mode: "timestamp_ms" }),
  salePriceCents: integer("sale_price_cents").notNull().default(0),
  gla: integer("gla").notNull().default(0),
  beds: integer("beds").notNull().default(3),
  bathsFull: integer("baths_full").notNull().default(2),
  bathsHalf: integer("baths_half").notNull().default(0),
  yearBuilt: integer("year_built"),
  lotSqft: integer("lot_sqft"),
  garageStalls: integer("garage_stalls").notNull().default(0),
  condition: text("condition").default("C3"),
  quality: text("quality").default("Q3"),
  distanceMi: real("distance_mi"),
  source: text("source").default("manual"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  number: text("number").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("draft"),
  issuedAt: integer("issued_at", { mode: "timestamp_ms" }),
  dueAt: integer("due_at", { mode: "timestamp_ms" }),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const adjustmentProfiles = sqliteTable("adjustment_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  // One row per user for v0; a per-market table is v1.
  perGlaSqftCents: integer("per_gla_sqft_cents").notNull().default(5000),
  perBedCents: integer("per_bed_cents").notNull().default(500000),
  perFullBathCents: integer("per_full_bath_cents").notNull().default(750000),
  perHalfBathCents: integer("per_half_bath_cents").notNull().default(300000),
  perGarageStallCents: integer("per_garage_stall_cents").notNull().default(400000),
  perLotSqftCents: integer("per_lot_sqft_cents").notNull().default(100),
  perConditionStepCents: integer("per_condition_step_cents").notNull().default(1500000),
  perQualityStepCents: integer("per_quality_step_cents").notNull().default(2000000),
  annualAppreciationBps: integer("annual_appreciation_bps").notNull().default(300), // 3% yoy
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type Comparable = typeof comparables.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type InspectionItem = typeof inspectionItems.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type JobEvent = typeof jobEvents.$inferSelect;

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "app.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };

// Bootstrap tables on first use. Avoids needing a separate migration step for the demo.
sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  license_number TEXT,
  license_state TEXT,
  license_expires_at INTEGER,
  signature_data_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'amc',
  email TEXT,
  phone TEXT,
  fee_standard INTEGER DEFAULT 500,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  client_id TEXT REFERENCES clients(id),
  subject_address TEXT NOT NULL,
  subject_city TEXT NOT NULL,
  subject_state TEXT NOT NULL,
  subject_zip TEXT NOT NULL,
  borrower_name TEXT,
  loan_number TEXT,
  form_type TEXT NOT NULL DEFAULT '1004',
  fee_cents INTEGER NOT NULL DEFAULT 50000,
  due_at INTEGER,
  status TEXT NOT NULL DEFAULT 'NEW',
  inspection_at INTEGER,
  value_conclusion_cents INTEGER,
  signed_at INTEGER,
  delivered_at INTEGER,
  paid_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  actor_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload TEXT,
  at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS inspection_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value_text TEXT,
  value_number REAL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Main',
  length_ft REAL NOT NULL DEFAULT 0,
  width_ft REAL NOT NULL DEFAULT 0,
  is_below_grade INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tag TEXT,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS comparables (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  position INTEGER NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  sale_date INTEGER,
  sale_price_cents INTEGER NOT NULL DEFAULT 0,
  gla INTEGER NOT NULL DEFAULT 0,
  beds INTEGER NOT NULL DEFAULT 3,
  baths_full INTEGER NOT NULL DEFAULT 2,
  baths_half INTEGER NOT NULL DEFAULT 0,
  year_built INTEGER,
  lot_sqft INTEGER,
  garage_stalls INTEGER NOT NULL DEFAULT 0,
  condition TEXT DEFAULT 'C3',
  quality TEXT DEFAULT 'Q3',
  distance_mi REAL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  number TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_at INTEGER,
  due_at INTEGER,
  paid_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS adjustment_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  per_gla_sqft_cents INTEGER NOT NULL DEFAULT 5000,
  per_bed_cents INTEGER NOT NULL DEFAULT 500000,
  per_full_bath_cents INTEGER NOT NULL DEFAULT 750000,
  per_half_bath_cents INTEGER NOT NULL DEFAULT 300000,
  per_garage_stall_cents INTEGER NOT NULL DEFAULT 400000,
  per_lot_sqft_cents INTEGER NOT NULL DEFAULT 100,
  per_condition_step_cents INTEGER NOT NULL DEFAULT 1500000,
  per_quality_step_cents INTEGER NOT NULL DEFAULT 2000000,
  annual_appreciation_bps INTEGER NOT NULL DEFAULT 300,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_adj_user ON adjustment_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_photos_job ON photos(job_id);
CREATE INDEX IF NOT EXISTS idx_comps_job_pos ON comparables(job_id, position);
CREATE INDEX IF NOT EXISTS idx_events_job ON job_events(job_id, at);
CREATE INDEX IF NOT EXISTS idx_rooms_job ON rooms(job_id);
CREATE INDEX IF NOT EXISTS idx_items_job ON inspection_items(job_id, section, key);
`);

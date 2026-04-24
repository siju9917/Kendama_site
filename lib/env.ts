import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function readOrCreateSessionSecret(): string {
  const envVal = process.env.APPRAISE_SESSION_SECRET;
  if (envVal && envVal.length >= 32) return envVal;

  // Persist a locally-generated secret so sessions survive restarts without
  // requiring the user to manage environment variables on first run.
  const dataDir = path.join(process.cwd(), "data");
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
  const secretFile = path.join(dataDir, ".session-secret");
  if (fs.existsSync(secretFile)) {
    const v = fs.readFileSync(secretFile, "utf8").trim();
    if (v.length >= 32) return v;
  }
  const fresh = randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(secretFile, fresh, { mode: 0o600 });
  } catch (e) {
    // Fall back to the generated value in memory. Sessions won't survive a restart.
    console.warn("could not persist session secret:", e);
  }
  return fresh;
}

export const env = {
  isProd: process.env.NODE_ENV === "production",
  sessionSecret: readOrCreateSessionSecret(),
  port: Number(process.env.PORT || 3000),
  uploadDir: process.env.APPRAISE_UPLOAD_DIR
    ? path.resolve(process.env.APPRAISE_UPLOAD_DIR)
    : path.join(process.cwd(), "uploads"),
  dbPath: process.env.APPRAISE_DB_PATH
    ? path.resolve(process.env.APPRAISE_DB_PATH)
    : path.join(process.cwd(), "data", "app.db"),
};

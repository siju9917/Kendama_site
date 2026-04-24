import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

const UPLOAD_DIR = env.uploadDir;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const rows = await db
    .select({ photo: schema.photos, job: schema.jobs })
    .from(schema.photos)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.photos.jobId))
    .where(and(eq(schema.photos.id, id), eq(schema.jobs.userId, user.id)));
  const row = rows[0];
  if (!row) return new NextResponse("Not found", { status: 404 });
  const file = path.join(UPLOAD_DIR, row.photo.jobId, row.photo.filename);
  try {
    const buf = await fs.readFile(file);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": row.photo.mimeType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

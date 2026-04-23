import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJobForUser, listPhotosForJob, listEventsForJob, listCompsForJob, listRoomsForJob, listItemsForJob } from "@/lib/jobs";
import { generateReportPDF } from "@/lib/pdf/report";
import archiver from "archiver";
import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", "http://localhost"));
  const { id } = await params;
  const job = await getJobForUser(user.id, id);
  if (!job) return new NextResponse("Not found", { status: 404 });

  const [photos, events, comps, rooms, items] = await Promise.all([
    listPhotosForJob(id),
    listEventsForJob(id),
    listCompsForJob(id),
    listRoomsForJob(id),
    listItemsForJob(id),
  ]);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });

  const summary = {
    job: {
      id: job.id,
      subject: `${job.subjectAddress}, ${job.subjectCity}, ${job.subjectState} ${job.subjectZip}`,
      formType: job.formType,
      feeCents: job.feeCents,
      status: job.status,
      inspectionAt: job.inspectionAt,
      signedAt: job.signedAt,
      deliveredAt: job.deliveredAt,
      paidAt: job.paidAt,
      valueConclusionCents: job.valueConclusionCents,
    },
    rooms,
    inspectionItems: items,
    comparables: comps,
    events,
    exportedAt: new Date().toISOString(),
    exportedBy: user.email,
  };

  archive.append(JSON.stringify(summary, null, 2), { name: "workfile.json" });

  const pdf = await generateReportPDF(id);
  archive.append(Buffer.from(pdf), { name: `appraisal-report.pdf` });

  for (const p of photos) {
    const src = path.join(process.cwd(), "uploads", id, p.filename);
    if (fs.existsSync(src)) {
      archive.file(src, { name: `photos/${p.tag || "misc"}/${p.filename}` });
    }
  }

  archive.finalize();
  await done;

  const buf = Buffer.concat(chunks);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="workfile-${id.slice(0, 8)}.zip"`,
    },
  });
}

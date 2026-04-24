import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fs from "node:fs/promises";
import path from "node:path";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { computeGLA } from "@/lib/jobs";
import { computeCompAdjustments, reconcileValue, type Subject } from "@/lib/adjustments";

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN) newPage(ctx);
}

function drawText(ctx: Ctx, text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.bold : ctx.font;
  const color = opts.color ? rgb(...opts.color) : rgb(0.1, 0.1, 0.15);
  ensureSpace(ctx, size + 2);
  ctx.page.drawText(text, { x: MARGIN, y: ctx.y - size, size, font, color });
  ctx.y -= size + 4;
}

function drawHR(ctx: Ctx) {
  ensureSpace(ctx, 6);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y - 2 },
    end: { x: PAGE_W - MARGIN, y: ctx.y - 2 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.65),
  });
  ctx.y -= 8;
}

function drawKV(ctx: Ctx, cols: { label: string; value: string }[]) {
  ensureSpace(ctx, 14);
  const colWidth = (PAGE_W - MARGIN * 2) / cols.length;
  cols.forEach((c, i) => {
    const x = MARGIN + colWidth * i;
    ctx.page.drawText(c.label, { x, y: ctx.y - 8, size: 7, font: ctx.bold, color: rgb(0.4, 0.4, 0.5) });
    ctx.page.drawText(c.value, { x, y: ctx.y - 20, size: 10, font: ctx.font, color: rgb(0.1, 0.1, 0.15) });
  });
  ctx.y -= 26;
}

function drawSectionHeader(ctx: Ctx, title: string) {
  ensureSpace(ctx, 22);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 16, width: PAGE_W - MARGIN * 2, height: 16, color: rgb(0.17, 0.42, 0.69) });
  ctx.page.drawText(title.toUpperCase(), { x: MARGIN + 6, y: ctx.y - 12, size: 9, font: ctx.bold, color: rgb(1, 1, 1) });
  ctx.y -= 22;
}

function usd(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function generateReportPDF(jobId: string): Promise<Uint8Array> {
  const job = (await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)))[0];
  if (!job) throw new Error("Job not found");
  const user = (await db.select().from(schema.users).where(eq(schema.users.id, job.userId)))[0];
  const client = job.clientId
    ? (await db.select().from(schema.clients).where(eq(schema.clients.id, job.clientId)))[0]
    : null;
  const [rooms, comps, items, photos] = await Promise.all([
    db.select().from(schema.rooms).where(eq(schema.rooms.jobId, jobId)),
    db.select().from(schema.comparables).where(eq(schema.comparables.jobId, jobId)),
    db.select().from(schema.inspectionItems).where(eq(schema.inspectionItems.jobId, jobId)),
    db.select().from(schema.photos).where(eq(schema.photos.jobId, jobId)),
  ]);

  const gla = Math.round(computeGLA(rooms));
  const itemVal = (section: string, key: string) => items.find((i) => i.section === section && i.key === key)?.valueText ?? "";

  const subject: Subject = {
    gla,
    beds: Number(itemVal("bath", "beds")) || 3,
    bathsFull: Number(itemVal("bath", "full_baths")) || 2,
    bathsHalf: Number(itemVal("bath", "half_baths")) || 0,
    garageStalls: Number(itemVal("garage", "garage_stalls")) || 0,
    lotSqft: Number(itemVal("site", "lot_size")) || null,
  };
  const computed = comps.map((c) => ({ comp: c, ...computeCompAdjustments(subject, c) }));
  const indicated = reconcileValue(computed.map((c) => c.adjustedPriceCents));

  const doc = await PDFDocument.create();
  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  // Title block
  drawText(ctx, "UNIFORM RESIDENTIAL APPRAISAL REPORT", { size: 14, bold: true, color: [0.1, 0.25, 0.5] });
  drawText(ctx, `Fannie Mae Form ${job.formType} · AppraiseOS draft rendering`, { size: 9, color: [0.4, 0.4, 0.5] });
  drawHR(ctx);

  drawSectionHeader(ctx, "Subject");
  drawKV(ctx, [
    { label: "Property Address", value: `${job.subjectAddress}, ${job.subjectCity}, ${job.subjectState} ${job.subjectZip}` },
    { label: "Borrower", value: job.borrowerName || "—" },
    { label: "Loan #", value: job.loanNumber || "—" },
  ]);
  drawKV(ctx, [
    { label: "Client", value: client?.name ?? "—" },
    { label: "Inspection", value: fmtDate(job.inspectionAt) },
    { label: "Effective date", value: fmtDate(job.signedAt ?? job.deliveredAt ?? new Date()) },
    { label: "Appraiser", value: user?.name ?? "—" },
  ]);

  drawSectionHeader(ctx, "Improvements & Site");
  drawKV(ctx, [
    { label: "Year built", value: itemVal("exterior", "year_built") || "—" },
    { label: "Construction", value: itemVal("exterior", "construction") || "—" },
    { label: "Foundation", value: itemVal("exterior", "foundation") || "—" },
    { label: "Roof", value: itemVal("exterior", "roof") || "—" },
  ]);
  drawKV(ctx, [
    { label: "GLA (sqft)", value: gla.toLocaleString() },
    { label: "Beds", value: String(subject.beds) },
    { label: "Full/Half baths", value: `${subject.bathsFull}/${subject.bathsHalf}` },
    { label: "Garage", value: `${subject.garageStalls}-car ${itemVal("garage", "garage_type") || ""}`.trim() },
  ]);
  drawKV(ctx, [
    { label: "Condition", value: itemVal("interior", "condition_interior") || itemVal("exterior", "condition_exterior") || "—" },
    { label: "Quality", value: itemVal("interior", "quality") || "—" },
    { label: "Lot size (sqft)", value: subject.lotSqft ? subject.lotSqft.toLocaleString() : "—" },
    { label: "View", value: itemVal("site", "view") || "—" },
  ]);

  drawSectionHeader(ctx, "Room Schedule");
  if (rooms.length === 0) {
    drawText(ctx, "No rooms recorded.", { color: [0.5, 0.5, 0.55] });
  } else {
    // Header row
    ensureSpace(ctx, 14);
    ctx.page.drawText("Room", { x: MARGIN, y: ctx.y - 10, size: 8, font: ctx.bold });
    ctx.page.drawText("Level", { x: MARGIN + 150, y: ctx.y - 10, size: 8, font: ctx.bold });
    ctx.page.drawText("Dim (ft)", { x: MARGIN + 220, y: ctx.y - 10, size: 8, font: ctx.bold });
    ctx.page.drawText("Area", { x: MARGIN + 300, y: ctx.y - 10, size: 8, font: ctx.bold });
    ctx.page.drawText("GLA?", { x: MARGIN + 360, y: ctx.y - 10, size: 8, font: ctx.bold });
    ctx.y -= 14;
    for (const r of rooms) {
      ensureSpace(ctx, 12);
      ctx.page.drawText(r.name, { x: MARGIN, y: ctx.y - 10, size: 9, font: ctx.font });
      ctx.page.drawText(r.level, { x: MARGIN + 150, y: ctx.y - 10, size: 9, font: ctx.font });
      ctx.page.drawText(`${r.lengthFt} × ${r.widthFt}`, { x: MARGIN + 220, y: ctx.y - 10, size: 9, font: ctx.font });
      ctx.page.drawText(String(Math.round(r.lengthFt * r.widthFt)), { x: MARGIN + 300, y: ctx.y - 10, size: 9, font: ctx.font });
      ctx.page.drawText(r.isBelowGrade ? "Below" : "Yes", { x: MARGIN + 360, y: ctx.y - 10, size: 9, font: ctx.font });
      ctx.y -= 12;
    }
    drawHR(ctx);
    drawText(ctx, `Total GLA (above grade): ${gla.toLocaleString()} sqft`, { bold: true });
  }

  drawSectionHeader(ctx, "Sales Comparison Approach");
  if (computed.length === 0) {
    drawText(ctx, "No comparables entered yet.", { color: [0.5, 0.5, 0.55] });
  } else {
    for (const c of computed) {
      ensureSpace(ctx, 70);
      drawText(ctx, `Comp ${c.comp.position}: ${c.comp.address}, ${c.comp.city}, ${c.comp.state}`, { bold: true });
      drawKV(ctx, [
        { label: "Sale price", value: usd(c.comp.salePriceCents) },
        { label: "Sale date", value: fmtDate(c.comp.saleDate) },
        { label: "Distance", value: c.comp.distanceMi != null ? `${c.comp.distanceMi} mi` : "—" },
        { label: "GLA", value: String(c.comp.gla) },
      ]);
      drawKV(ctx, [
        { label: "Net adj", value: usd(c.netAdjustmentCents) + ` (${c.netAdjustmentPct.toFixed(1)}%)` },
        { label: "Gross adj", value: usd(c.grossAdjustmentCents) + ` (${c.grossAdjustmentPct.toFixed(1)}%)` },
        { label: "Adjusted price", value: usd(c.adjustedPriceCents) },
      ]);
    }
  }

  drawSectionHeader(ctx, "Reconciliation & Value Conclusion");
  drawText(ctx, `Indicated value (sales comparison): ${usd(indicated)}`, { bold: true });
  if (job.valueConclusionCents) {
    drawText(ctx, `Appraiser's final value conclusion: ${usd(job.valueConclusionCents)}`, { bold: true, color: [0.1, 0.3, 0.55] });
  }

  drawSectionHeader(ctx, "Signature & Certification");
  drawText(ctx, `Appraiser: ${user?.name ?? "—"}`);
  drawText(ctx, `License: ${user?.licenseNumber ?? "—"} (${user?.licenseState ?? "—"})`);
  drawText(ctx, `Signed: ${fmtDate(job.signedAt)}`);
  // Embed the appraiser's captured signature image if present and the job is signed.
  if (job.signedAt && user?.signatureDataUrl && user.signatureDataUrl.startsWith("data:image/")) {
    try {
      const [meta, b64] = user.signatureDataUrl.split(",");
      const bytes = Buffer.from(b64 ?? "", "base64");
      const img = meta.includes("png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      ensureSpace(ctx, 60);
      const w = 160;
      const h = 40;
      ctx.page.drawImage(img, { x: MARGIN, y: ctx.y - h, width: w, height: h });
      ctx.y -= h + 4;
    } catch {
      // Corrupt signature, skip silently.
    }
  }
  drawText(ctx, "I certify that, to the best of my knowledge, the statements of fact contained in this report are true and", { size: 8, color: [0.4, 0.4, 0.5] });
  drawText(ctx, "correct, and that this report has been prepared in conformity with USPAP.", { size: 8, color: [0.4, 0.4, 0.5] });

  // Photo addendum
  if (photos.length > 0) {
    newPage(ctx);
    drawText(ctx, "PHOTO ADDENDUM", { size: 14, bold: true, color: [0.1, 0.25, 0.5] });
    drawHR(ctx);

    const cols = 2;
    const gap = 10;
    const thumbW = (PAGE_W - MARGIN * 2 - gap) / cols;
    const thumbH = thumbW * 0.66;

    let col = 0;
    let rowY = ctx.y;

    for (const p of photos.slice(0, 12)) {
      try {
        const buf = await fs.readFile(path.join(process.cwd(), "uploads", jobId, p.filename));
        let embedded;
        try {
          embedded = await doc.embedJpg(buf);
        } catch {
          try {
            embedded = await doc.embedPng(buf);
          } catch {
            continue;
          }
        }
        if (col === 0) {
          if (rowY - thumbH - 24 < MARGIN) {
            newPage(ctx);
            drawText(ctx, "PHOTO ADDENDUM (continued)", { size: 14, bold: true, color: [0.1, 0.25, 0.5] });
            drawHR(ctx);
            rowY = ctx.y;
          }
        }
        const x = MARGIN + col * (thumbW + gap);
        const y = rowY - thumbH;
        ctx.page.drawImage(embedded, { x, y, width: thumbW, height: thumbH });
        ctx.page.drawText(`${p.tag ?? ""}${p.caption ? " — " + p.caption : ""}`, { x, y: y - 12, size: 8, font: ctx.font });
        col++;
        if (col >= cols) {
          col = 0;
          rowY = y - 24;
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  return await doc.save();
}

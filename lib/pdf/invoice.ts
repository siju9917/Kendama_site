import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

function usd(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function generateInvoicePDF(jobId: string): Promise<Uint8Array> {
  const job = (await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)))[0];
  if (!job) throw new Error("Job not found");
  const invoice = (await db.select().from(schema.invoices).where(eq(schema.invoices.jobId, jobId)))[0];
  if (!invoice) throw new Error("No invoice for job");
  const user = (await db.select().from(schema.users).where(eq(schema.users.id, job.userId)))[0];
  const client = job.clientId
    ? (await db.select().from(schema.clients).where(eq(schema.clients.id, job.clientId)))[0]
    : null;

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("INVOICE", { x: 40, y: 740, size: 28, font: bold, color: rgb(0.1, 0.25, 0.5) });
  page.drawText(invoice.number, { x: 40, y: 715, size: 11, font, color: rgb(0.3, 0.3, 0.35) });

  // From
  page.drawText("FROM", { x: 40, y: 680, size: 8, font: bold, color: rgb(0.4, 0.4, 0.5) });
  page.drawText(user?.name ?? "", { x: 40, y: 665, size: 11, font: bold });
  page.drawText(user?.email ?? "", { x: 40, y: 650, size: 10, font });
  page.drawText(`License: ${user?.licenseNumber ?? "—"} (${user?.licenseState ?? "—"})`, { x: 40, y: 635, size: 10, font });

  // Bill to
  page.drawText("BILL TO", { x: 340, y: 680, size: 8, font: bold, color: rgb(0.4, 0.4, 0.5) });
  page.drawText(client?.name ?? "—", { x: 340, y: 665, size: 11, font: bold });
  if (client?.email) page.drawText(client.email, { x: 340, y: 650, size: 10, font });

  // Meta row
  page.drawLine({ start: { x: 40, y: 600 }, end: { x: 572, y: 600 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) });
  const meta = [
    { l: "Issued", v: fmtDate(invoice.issuedAt) },
    { l: "Due", v: fmtDate(invoice.dueAt) },
    { l: "Status", v: invoice.status.toUpperCase() },
  ];
  meta.forEach((m, i) => {
    const x = 40 + i * 180;
    page.drawText(m.l, { x, y: 585, size: 8, font: bold, color: rgb(0.4, 0.4, 0.5) });
    page.drawText(m.v, { x, y: 570, size: 11, font });
  });
  page.drawLine({ start: { x: 40, y: 555 }, end: { x: 572, y: 555 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) });

  // Line item
  page.drawText("Description", { x: 40, y: 520, size: 9, font: bold, color: rgb(0.4, 0.4, 0.5) });
  page.drawText("Amount", { x: 500, y: 520, size: 9, font: bold, color: rgb(0.4, 0.4, 0.5) });
  page.drawText(`Appraisal report — Form ${job.formType}`, { x: 40, y: 498, size: 11, font });
  page.drawText(`${job.subjectAddress}, ${job.subjectCity}, ${job.subjectState} ${job.subjectZip}`, { x: 40, y: 484, size: 9, font, color: rgb(0.4, 0.4, 0.45) });
  page.drawText(usd(invoice.amountCents), { x: 500, y: 498, size: 11, font });

  page.drawLine({ start: { x: 40, y: 460 }, end: { x: 572, y: 460 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) });

  // Total
  page.drawText("TOTAL DUE", { x: 420, y: 430, size: 10, font: bold, color: rgb(0.4, 0.4, 0.5) });
  page.drawText(usd(invoice.amountCents), { x: 500, y: 430, size: 14, font: bold });

  if (invoice.status === "paid" && invoice.paidAt) {
    page.drawRectangle({ x: 40, y: 380, width: 120, height: 32, borderColor: rgb(0.2, 0.6, 0.3), borderWidth: 2 });
    page.drawText("PAID", { x: 68, y: 392, size: 18, font: bold, color: rgb(0.2, 0.6, 0.3) });
    page.drawText(`on ${fmtDate(invoice.paidAt)}`, { x: 170, y: 398, size: 10, font, color: rgb(0.4, 0.4, 0.45) });
  }

  page.drawText("Please remit within terms. Thank you.", { x: 40, y: 60, size: 9, font, color: rgb(0.5, 0.5, 0.55) });
  page.drawText("AppraiseOS", { x: 520, y: 60, size: 8, font, color: rgb(0.5, 0.5, 0.55) });

  return await doc.save();
}

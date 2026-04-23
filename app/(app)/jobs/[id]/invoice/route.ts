import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJobForUser, getInvoiceForJob } from "@/lib/jobs";
import { generateInvoicePDF } from "@/lib/pdf/invoice";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", "http://localhost"));
  const { id } = await params;
  const job = await getJobForUser(user.id, id);
  if (!job) return new NextResponse("Not found", { status: 404 });
  const invoice = await getInvoiceForJob(id);
  if (!invoice) return new NextResponse("No invoice yet — deliver the report first.", { status: 404 });

  const pdf = await generateInvoicePDF(id);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}

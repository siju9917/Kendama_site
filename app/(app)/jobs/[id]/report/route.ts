import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJobForUser } from "@/lib/jobs";
import { generateReportPDF } from "@/lib/pdf/report";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", "http://localhost"));
  const { id } = await params;
  const job = await getJobForUser(user.id, id);
  if (!job) return new NextResponse("Not found", { status: 404 });

  const pdf = await generateReportPDF(id);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="appraisal-${job.subjectAddress.replace(/\W+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}

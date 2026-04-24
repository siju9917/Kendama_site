import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";

// POST-only to prevent CSRF-by-image-tag logout.
export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}

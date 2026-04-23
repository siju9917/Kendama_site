import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";

async function handler(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
export const POST = handler;
export const GET = handler;

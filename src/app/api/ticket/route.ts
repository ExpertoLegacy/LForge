import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { redeemTicket } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { ticket?: unknown } | null;
    if (typeof body?.ticket !== "string") {
      return jsonError(new Error("Enter your entrance ticket."), 400);
    }
    if (!(await redeemTicket(body.ticket, request.nextUrl.hostname))) {
      return jsonError(new Error("Invalid or expired ticket."), 401);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

import { requireTicket } from "@/lib/tickets";
import { NextRequest, NextResponse } from "next/server";
import { createNotebook, listNotebooks } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  const denied = await requireTicket();
  if (denied) return denied;

  try {
    const notebooks = await listNotebooks();
    return NextResponse.json({ notebooks });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireTicket();
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const notebook = await createNotebook(body.title ?? "");
    return NextResponse.json({ notebook }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

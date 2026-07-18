import { NextResponse } from "next/server";
import { listContactMessages } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const messages = await listContactMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load messages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

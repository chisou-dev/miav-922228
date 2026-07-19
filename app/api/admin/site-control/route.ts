import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase/requireAdmin";
import {
  getSiteControl,
  setSiteControl,
} from "@/lib/site-control/siteControlRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const control = await getSiteControl();
    return NextResponse.json({ control });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load site control.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const current = await getSiteControl();

  const traceEnabled =
    typeof record.traceEnabled === "boolean"
      ? record.traceEnabled
      : current.traceEnabled;
  const contactEnabled =
    typeof record.contactEnabled === "boolean"
      ? record.contactEnabled
      : current.contactEnabled;

  try {
    const control = await setSiteControl({ traceEnabled, contactEnabled });
    return NextResponse.json({ control, ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update site control.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

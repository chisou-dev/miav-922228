import { NextResponse } from "next/server";
import { getSiteControl } from "@/lib/site-control/siteControlRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public flags only — no admin metadata beyond what visitors need. */
export async function GET() {
  try {
    const control = await getSiteControl();
    return NextResponse.json({
      traceEnabled: control.traceEnabled,
      contactEnabled: control.contactEnabled,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load site control.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { POST_redeem } from "@/features/signals/api";
import {
  decideRedeemCors,
  finalizeRedeemCorsResponse,
  redeemCorsPreflight,
} from "@/features/signals/redeemCors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CORS preflight — redeem endpoint only (not other Signal APIs). */
export async function OPTIONS(request: Request) {
  return redeemCorsPreflight(request);
}

export async function POST(request: Request) {
  const decision = decideRedeemCors(request);
  if (decision.kind === "denied") {
    return NextResponse.json(
      { valid: false, reason: "SERVER_ERROR" },
      { status: 403 },
    );
  }

  const response = await POST_redeem(request);
  return finalizeRedeemCorsResponse(request, response);
}

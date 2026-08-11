import { NextResponse } from "next/server";
import { verifySignalCode } from "@/features/signals/codeServer";
import {
  getRewardForSignal,
  isSignalAvailableForTarget,
} from "@/features/signals/rewards";
import {
  evaluateSignalRedeem,
  isSignalRewardTarget,
} from "@/features/signals/redeemEvaluate";
import type { SignalRewardTarget } from "@/features/signals/types";

function readJsonObject(
  body: unknown,
): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  return body as Record<string, unknown>;
}

export async function POST_validate(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, reason: "INVALID_FORMAT" },
      { status: 400 },
    );
  }

  const record = readJsonObject(body);
  const code = typeof record?.code === "string" ? record.code : "";
  const targetRaw =
    typeof record?.targetApp === "string" ? record.targetApp.trim() : "";

  if (targetRaw && !isSignalRewardTarget(targetRaw)) {
    return NextResponse.json(
      { valid: false, reason: "NOT_AVAILABLE_FOR_TARGET" },
      { status: 200 },
    );
  }

  const targetApp = targetRaw
    ? (targetRaw as SignalRewardTarget)
    : undefined;

  const verified = verifySignalCode(code);
  if (!verified.ok) {
    return NextResponse.json(
      { valid: false, reason: verified.reason },
      { status: 200 },
    );
  }

  if (targetApp && !isSignalAvailableForTarget(verified.signalId, targetApp)) {
    return NextResponse.json(
      {
        valid: false,
        reason: "NOT_AVAILABLE_FOR_TARGET",
        signalId: verified.signalId,
      },
      { status: 200 },
    );
  }

  const reward = targetApp
    ? getRewardForSignal(verified.signalId, targetApp)
    : undefined;

  return NextResponse.json({
    valid: true,
    signalId: verified.signalId,
    code: verified.code,
    ...(targetApp && reward
      ? { rewardId: reward.rewardId, targetApp }
      : {}),
  });
}

/**
 * Cross-app redeem contract (Luminous / Writer Memo / Binary).
 * Body: { code, targetApp }. No auth. Codes are reusable keys.
 * rewardId comes only from SIGNAL_REWARDS after HMAC verify.
 */
export async function POST_redeem(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, reason: "INVALID_FORMAT" },
      { status: 400 },
    );
  }

  const record = readJsonObject(body);
  const code = typeof record?.code === "string" ? record.code : "";
  const targetApp =
    typeof record?.targetApp === "string" ? record.targetApp : "";

  if (!code.trim()) {
    return NextResponse.json(
      { valid: false, reason: "INVALID_FORMAT" },
      { status: 200 },
    );
  }
  if (!targetApp.trim()) {
    return NextResponse.json(
      { valid: false, reason: "NOT_AVAILABLE_FOR_TARGET" },
      { status: 200 },
    );
  }

  try {
    const result = evaluateSignalRedeem(code, targetApp);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { valid: false, reason: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

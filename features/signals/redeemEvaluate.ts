import "server-only";

import { verifySignalCode } from "@/features/signals/codeServer";
import {
  isSignalRewardTarget,
  resolveRedeemForSignal,
} from "@/features/signals/redeemResolve";
import type { SignalRedeemApiResponse } from "@/features/signals/types";

export { isSignalRewardTarget } from "@/features/signals/redeemResolve";

/**
 * Server-side redeem evaluation for cross-app clients.
 * HMAC first; rewardId only from SIGNAL_REWARDS — never client-supplied.
 * Codes are reusable keys (not single-use).
 */
export function evaluateSignalRedeem(
  code: string,
  targetAppRaw: string,
): SignalRedeemApiResponse {
  const targetApp = targetAppRaw.trim();
  if (!targetApp || !isSignalRewardTarget(targetApp)) {
    return { valid: false, reason: "NOT_AVAILABLE_FOR_TARGET" };
  }

  const verified = verifySignalCode(code);
  if (!verified.ok) {
    return { valid: false, reason: verified.reason };
  }

  return resolveRedeemForSignal(verified.signalId, targetApp);
}

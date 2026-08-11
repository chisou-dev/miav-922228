/**
 * Luminous Structure Signal integration contract (Phase 6A).
 * No game UI — constants + thin redeem client for the future Luminous app.
 *
 * targetApp = "luminous" (not workId "luminous-structure").
 */

import { getRewardForSignal } from "@/features/signals/rewards";
import type {
  SignalRedeemApiResponse,
  SignalReward,
  SignalRewardTarget,
} from "@/features/signals/types";

/** Formal Signal reward target for Luminous Structure. */
export const LUMINOUS_SIGNAL_TARGET: SignalRewardTarget = "luminous";

/**
 * Look up the Luminous reward for a Signal via SIGNAL_REWARDS
 * (single source of truth — do not hardcode rewardIds at call sites).
 */
export function getLuminousReward(
  signalId: string,
): SignalReward | undefined {
  return getRewardForSignal(signalId, LUMINOUS_SIGNAL_TARGET);
}

/**
 * Future Luminous Structure client helper.
 * Sends only { code, targetApp } — no Google Auth, UID, or MIAV ID.
 */
export async function redeemLuminousSignal(
  code: string,
  options?: {
    baseUrl?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<SignalRedeemApiResponse> {
  const baseUrl = options?.baseUrl ?? "";
  const fetchImpl = options?.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(`${baseUrl}/api/signals/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        targetApp: LUMINOUS_SIGNAL_TARGET,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | SignalRedeemApiResponse
      | null;

    if (!data || typeof data !== "object" || typeof data.valid !== "boolean") {
      return { valid: false, reason: "SERVER_ERROR" };
    }

    if (data.valid) {
      if (
        typeof data.signalId !== "string" ||
        typeof data.rewardId !== "string" ||
        data.targetApp !== LUMINOUS_SIGNAL_TARGET
      ) {
        return { valid: false, reason: "SERVER_ERROR" };
      }
      return data;
    }

    if (
      data.reason === "INVALID_FORMAT" ||
      data.reason === "UNKNOWN_SIGNAL" ||
      data.reason === "NOT_AVAILABLE_FOR_TARGET" ||
      data.reason === "ALREADY_REDEEMED" ||
      data.reason === "SERVER_ERROR"
    ) {
      return data;
    }

    return { valid: false, reason: "SERVER_ERROR" };
  } catch {
    return { valid: false, reason: "SERVER_ERROR" };
  }
}

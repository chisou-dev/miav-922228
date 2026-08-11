/**
 * Pure redeem resolution after HMAC identity is known.
 * Safe for scripts / shared use — no Firestore, no secrets.
 */

import {
  getRewardForSignal,
  isSignalAvailableForTarget,
} from "@/features/signals/rewards";
import type {
  SignalRedeemApiResponse,
  SignalRewardTarget,
} from "@/features/signals/types";

const REWARD_TARGETS = new Set<SignalRewardTarget>([
  "luminous",
  "writer-memo",
  "binary",
  "miav",
]);

export function isSignalRewardTarget(
  value: string,
): value is SignalRewardTarget {
  return REWARD_TARGETS.has(value as SignalRewardTarget);
}

/**
 * Map a verified signalId + targetApp → rewardId via SIGNAL_REWARDS only.
 * Never invents rewards. Caller must HMAC-verify the code first on the server.
 */
export function resolveRedeemForSignal(
  signalId: string,
  targetAppRaw: string,
): SignalRedeemApiResponse {
  const targetApp = targetAppRaw.trim();
  if (!targetApp || !isSignalRewardTarget(targetApp)) {
    return { valid: false, reason: "NOT_AVAILABLE_FOR_TARGET" };
  }

  if (!isSignalAvailableForTarget(signalId, targetApp)) {
    return {
      valid: false,
      reason: "NOT_AVAILABLE_FOR_TARGET",
      signalId,
    };
  }

  const reward = getRewardForSignal(signalId, targetApp);
  if (!reward?.rewardId) {
    return {
      valid: false,
      reason: "NOT_AVAILABLE_FOR_TARGET",
      signalId,
    };
  }

  return {
    valid: true,
    signalId,
    rewardId: reward.rewardId,
    targetApp,
  };
}

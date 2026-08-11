"use client";

import { getSignalDefinition } from "@/features/signals/definitions";
import {
  addDiscovery,
  hasDiscovery,
  type SignalDiscovery,
} from "@/features/signals/discovery";
import {
  addRedeemedReward,
  hasRedeemedReward,
} from "@/features/signals/storage";
import { normalizeSignalCode, parseSignalCode } from "@/features/signals/code";
import {
  getRewardForSignal,
  isSignalAvailableForTarget,
} from "@/features/signals/rewards";
import type {
  SignalRewardTarget,
  SignalValidationResult,
} from "@/features/signals/types";

export type DiscoverSignalResult =
  | { ok: true; discovery: SignalDiscovery; alreadyDiscovered: boolean }
  | {
      ok: false;
      reason: "UNKNOWN_SIGNAL" | "NOT_ACQUIRABLE";
    };

/**
 * Discover a Signal on-device (Phase 5).
 * Does not mint or display a code — claim happens later on My MIAV.
 */
export function discoverSignal(signalId: string): DiscoverSignalResult {
  const definition = getSignalDefinition(signalId);
  if (!definition) {
    return { ok: false, reason: "UNKNOWN_SIGNAL" };
  }
  if (!definition.acquirable) {
    return { ok: false, reason: "NOT_ACQUIRABLE" };
  }

  const already = hasDiscovery(signalId);
  const discovery = addDiscovery(signalId);
  return { ok: true, discovery, alreadyDiscovered: already };
}

/** @deprecated Prefer discoverSignal — kept for older call sites. */
export async function acquireSignal(signalId: string) {
  const result = discoverSignal(signalId);
  if (!result.ok) {
    return {
      ok: false as const,
      reason: result.reason,
    };
  }
  return {
    ok: true as const,
    alreadyOwned: result.alreadyDiscovered,
    userSignal: {
      signalId: result.discovery.signalId,
      code: "",
      acquiredAt: result.discovery.discoveredAt,
      source: getSignalDefinition(signalId)!.source,
    },
  };
}

type ValidateApiResponse = {
  valid?: boolean;
  signalId?: string;
  reason?:
    | "INVALID_FORMAT"
    | "UNKNOWN_SIGNAL"
    | "NOT_AVAILABLE_FOR_TARGET"
    | "ALREADY_REDEEMED";
  error?: string;
};

/**
 * Shared validation interface for MIAV apps.
 * Cryptographic check is server-side; target / redeem rules applied here.
 */
export async function validateSignalCode(
  code: string,
  targetApp?: SignalRewardTarget,
): Promise<SignalValidationResult> {
  const parsed = parseSignalCode(code);
  if (!parsed) {
    const trimmed = code.trim();
    if (!trimmed) return { valid: false, reason: "INVALID_FORMAT" };
    const loose = /^(MIAV-[A-Z0-9]+)-([A-F0-9]{4})-([A-F0-9]{4})$/i.test(
      trimmed.replace(/\s+/g, ""),
    );
    return {
      valid: false,
      reason: loose ? "UNKNOWN_SIGNAL" : "INVALID_FORMAT",
    };
  }

  let response: Response;
  try {
    response = await fetch("/api/signals/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: parsed.normalized }),
    });
  } catch {
    return { valid: false, reason: "UNKNOWN_SIGNAL" };
  }

  let data: ValidateApiResponse = {};
  try {
    data = (await response.json()) as ValidateApiResponse;
  } catch {
    return { valid: false, reason: "UNKNOWN_SIGNAL" };
  }

  if (!data.valid || !data.signalId) {
    const reason = data.reason;
    if (
      reason === "INVALID_FORMAT" ||
      reason === "UNKNOWN_SIGNAL" ||
      reason === "NOT_AVAILABLE_FOR_TARGET" ||
      reason === "ALREADY_REDEEMED"
    ) {
      return { valid: false, reason };
    }
    return { valid: false, reason: "UNKNOWN_SIGNAL" };
  }

  if (targetApp) {
    if (!isSignalAvailableForTarget(data.signalId, targetApp)) {
      return { valid: false, reason: "NOT_AVAILABLE_FOR_TARGET" };
    }
    if (hasRedeemedReward(data.signalId, targetApp)) {
      return { valid: false, reason: "ALREADY_REDEEMED" };
    }
    const reward = getRewardForSignal(data.signalId, targetApp);
    return {
      valid: true,
      signalId: data.signalId,
      rewardId: reward?.rewardId,
    };
  }

  return { valid: true, signalId: data.signalId };
}

/**
 * Validate + record redeem for a target app (device-local).
 * Cross-app reward unlock remains for a later phase.
 */
export async function redeemSignal(
  code: string,
  targetApp: SignalRewardTarget,
): Promise<SignalValidationResult> {
  const result = await validateSignalCode(code, targetApp);
  if (!result.valid) return result;

  const reward = getRewardForSignal(result.signalId, targetApp);
  if (!reward) {
    return { valid: false, reason: "NOT_AVAILABLE_FOR_TARGET" };
  }

  addRedeemedReward({
    signalId: result.signalId,
    targetApp,
    rewardId: reward.rewardId,
    redeemedAt: new Date().toISOString(),
    code: normalizeSignalCode(code),
  });

  return {
    valid: true,
    signalId: result.signalId,
    rewardId: reward.rewardId,
  };
}

export type ClaimPendingResult =
  | {
      ok: true;
      added: number;
      signals: Array<{ signalId: string; code: string; title: string }>;
    }
  | {
      ok: false;
      reason:
        | "NETWORK"
        | "UNAUTHORIZED"
        | "MIAV_ID_REQUIRED"
        | "CLAIM_FAILED";
      message?: string;
    };

/** POST pending local discoveries to the claim API (My MIAV). */
export async function claimPendingDiscoveries(
  token: string,
  signalIds: string[],
): Promise<ClaimPendingResult> {
  if (signalIds.length === 0) {
    return { ok: true, added: 0, signals: [] };
  }

  let response: Response;
  try {
    response = await fetch("/api/signals/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ signalIds }),
    });
  } catch {
    return { ok: false, reason: "NETWORK" };
  }

  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    code?: string;
    error?: string;
    claimed?: Array<{ signalId: string; code: string; title: string }>;
    alreadyClaimed?: Array<{ signalId: string; code: string; title: string }>;
  } | null;

  if (response.status === 401) {
    return { ok: false, reason: "UNAUTHORIZED" };
  }
  if (response.status === 403 && data?.code === "MIAV_ID_REQUIRED") {
    return { ok: false, reason: "MIAV_ID_REQUIRED" };
  }
  if (!response.ok || !data?.ok) {
    return {
      ok: false,
      reason: "CLAIM_FAILED",
      message: data?.error,
    };
  }

  const claimed = Array.isArray(data.claimed) ? data.claimed : [];
  const already = Array.isArray(data.alreadyClaimed) ? data.alreadyClaimed : [];
  return {
    ok: true,
    added: claimed.length,
    signals: [...claimed, ...already],
  };
}

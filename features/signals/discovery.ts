"use client";

/**
 * Phase 5 — on-device Signal discovery (pre-claim).
 * Codes are never stored here. Server claims are the source of truth after claim.
 *
 * Migration:
 * - Reads legacy `miav_signals_v1` signal ids into discoveries (without showing codes).
 * - Leaves legacy store intact for local redeem history.
 */

import { getSignalDefinition } from "@/features/signals/definitions";

export const DISCOVERY_STORAGE_KEY = "miav_signal_discoveries_v1";
const LEGACY_STORAGE_KEY = "miav_signals_v1";

export type SignalDiscovery = {
  signalId: string;
  discoveredAt: string;
};

export type SignalDiscoveryStoreV1 = {
  version: 1;
  discoveries: SignalDiscovery[];
  /** Signal ids successfully claimed (or alreadyClaimed) — avoid re-post spam. */
  claimedIds: string[];
};

function emptyStore(): SignalDiscoveryStoreV1 {
  return { version: 1, discoveries: [], claimedIds: [] };
}

function isDiscovery(value: unknown): value is SignalDiscovery {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.signalId === "string" &&
    typeof record.discoveredAt === "string"
  );
}

function readRawStore(): SignalDiscoveryStoreV1 {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(DISCOVERY_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<SignalDiscoveryStoreV1>;
    return {
      version: 1,
      discoveries: Array.isArray(parsed.discoveries)
        ? parsed.discoveries.filter(isDiscovery)
        : [],
      claimedIds: Array.isArray(parsed.claimedIds)
        ? parsed.claimedIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: SignalDiscoveryStoreV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode
  }
}

/** One-time migrate legacy V1 acquired signals → discoveries (no code carry). */
function migrateLegacyInto(store: SignalDiscoveryStoreV1): SignalDiscoveryStoreV1 {
  if (typeof window === "undefined") return store;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return store;
    const parsed = JSON.parse(raw) as {
      signals?: Array<{ signalId?: string; acquiredAt?: string }>;
    };
    if (!Array.isArray(parsed.signals)) return store;

    const known = new Set(store.discoveries.map((d) => d.signalId));
    const claimed = new Set(store.claimedIds);
    let changed = false;
    const discoveries = [...store.discoveries];

    for (const item of parsed.signals) {
      if (!item || typeof item.signalId !== "string") continue;
      if (known.has(item.signalId) || claimed.has(item.signalId)) continue;
      if (!getSignalDefinition(item.signalId)) continue;
      discoveries.push({
        signalId: item.signalId,
        discoveredAt:
          typeof item.acquiredAt === "string"
            ? item.acquiredAt
            : new Date().toISOString(),
      });
      known.add(item.signalId);
      changed = true;
    }

    if (!changed) return store;
    const next = { ...store, discoveries };
    writeStore(next);
    return next;
  } catch {
    return store;
  }
}

export function readDiscoveryStore(): SignalDiscoveryStoreV1 {
  return migrateLegacyInto(readRawStore());
}

export function listDiscoveries(): SignalDiscovery[] {
  return readDiscoveryStore().discoveries.slice();
}

export function listPendingDiscoveries(): SignalDiscovery[] {
  const store = readDiscoveryStore();
  const claimed = new Set(store.claimedIds);
  return store.discoveries.filter((d) => !claimed.has(d.signalId));
}

export function hasDiscovery(signalId: string): boolean {
  const store = readDiscoveryStore();
  return (
    store.discoveries.some((d) => d.signalId === signalId) ||
    store.claimedIds.includes(signalId)
  );
}

/** Record a discovery — no code, no network. Idempotent. */
export function addDiscovery(signalId: string): SignalDiscovery {
  const store = readDiscoveryStore();
  const existing = store.discoveries.find((d) => d.signalId === signalId);
  if (existing) return existing;
  if (store.claimedIds.includes(signalId)) {
    return {
      signalId,
      discoveredAt: new Date().toISOString(),
    };
  }
  const entry: SignalDiscovery = {
    signalId,
    discoveredAt: new Date().toISOString(),
  };
  writeStore({
    ...store,
    discoveries: [...store.discoveries, entry],
  });
  return entry;
}

/**
 * After successful claim API: drop from pending discoveries, mark claimed locally.
 * On failure callers must NOT call this (keep pending for retry).
 */
export function markDiscoveriesClaimed(signalIds: string[]): void {
  if (signalIds.length === 0) return;
  const store = readDiscoveryStore();
  const claimed = new Set([...store.claimedIds, ...signalIds]);
  writeStore({
    version: 1,
    discoveries: store.discoveries.filter((d) => !claimed.has(d.signalId)),
    claimedIds: [...claimed],
  });
}

"use client";

import type {
  RedeemedReward,
  SignalsStoreV1,
  UserSignal,
} from "@/features/signals/types";

const STORAGE_KEY = "miav_signals_v1";

function emptyStore(): SignalsStoreV1 {
  return { version: 1, signals: [], redeems: [] };
}

function isUserSignal(value: unknown): value is UserSignal {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.signalId === "string" &&
    typeof record.code === "string" &&
    typeof record.acquiredAt === "string" &&
    typeof record.source === "string"
  );
}

function isRedeem(value: unknown): value is RedeemedReward {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.signalId === "string" &&
    typeof record.targetApp === "string" &&
    typeof record.rewardId === "string" &&
    typeof record.redeemedAt === "string" &&
    typeof record.code === "string"
  );
}

export function readSignalsStore(): SignalsStoreV1 {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<SignalsStoreV1>;
    const signals = Array.isArray(parsed.signals)
      ? parsed.signals.filter(isUserSignal)
      : [];
    const redeems = Array.isArray(parsed.redeems)
      ? parsed.redeems.filter(isRedeem)
      : [];
    return { version: 1, signals, redeems };
  } catch {
    return emptyStore();
  }
}

function writeSignalsStore(store: SignalsStoreV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — fail quietly; caller still has in-memory result.
  }
}

export function listUserSignals(): UserSignal[] {
  return readSignalsStore().signals.slice();
}

export function getUserSignal(signalId: string): UserSignal | undefined {
  return readSignalsStore().signals.find((item) => item.signalId === signalId);
}

export function hasUserSignal(signalId: string): boolean {
  return Boolean(getUserSignal(signalId));
}

/** Idempotent upsert by signalId — duplicate acquire does not corrupt store. */
export function upsertUserSignal(entry: UserSignal): UserSignal {
  const store = readSignalsStore();
  const existingIndex = store.signals.findIndex(
    (item) => item.signalId === entry.signalId,
  );
  if (existingIndex >= 0) {
    return store.signals[existingIndex]!;
  }
  store.signals = [...store.signals, entry];
  writeSignalsStore(store);
  return entry;
}

export function listRedeemedRewards(): RedeemedReward[] {
  return readSignalsStore().redeems.slice();
}

export function hasRedeemedReward(
  signalId: string,
  targetApp: string,
): boolean {
  return readSignalsStore().redeems.some(
    (item) => item.signalId === signalId && item.targetApp === targetApp,
  );
}

export function addRedeemedReward(entry: RedeemedReward): RedeemedReward {
  const store = readSignalsStore();
  const existing = store.redeems.find(
    (item) =>
      item.signalId === entry.signalId && item.targetApp === entry.targetApp,
  );
  if (existing) return existing;
  store.redeems = [...store.redeems, entry];
  writeSignalsStore(store);
  return entry;
}

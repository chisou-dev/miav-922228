import { getSignalDefinition } from "@/features/signals/definitions";
import type {
  SignalReward,
  SignalRewardTarget,
} from "@/features/signals/types";

/**
 * Rewards are separate from Signal definitions.
 * One Signal may unlock different rewards per target app.
 */
export const SIGNAL_REWARDS: readonly SignalReward[] = [
  {
    signalId: "novel-chapter-14",
    targetApp: "luminous",
    rewardId: "light-style-novel-14",
    title: "Chapter 14 Light",
  },
  {
    signalId: "novel-chapter-14",
    targetApp: "writer-memo",
    rewardId: "reflection-theme-novel-14",
    title: "Reflection Theme",
  },
  {
    signalId: "novel-chapter-14",
    targetApp: "miav",
    rewardId: "miav-badge-novel-14",
    title: "Chapter 14 Badge",
  },
] as const;

export function listSignalRewards(): readonly SignalReward[] {
  return SIGNAL_REWARDS;
}

export function getRewardForSignal(
  signalId: string,
  targetApp: SignalRewardTarget,
): SignalReward | undefined {
  return SIGNAL_REWARDS.find(
    (reward) =>
      reward.signalId === signalId && reward.targetApp === targetApp,
  );
}

export function isSignalAvailableForTarget(
  signalId: string,
  targetApp: SignalRewardTarget,
): boolean {
  const definition = getSignalDefinition(signalId);
  if (!definition) return false;
  if (!definition.rewardTargets.includes(targetApp)) return false;
  return Boolean(getRewardForSignal(signalId, targetApp));
}

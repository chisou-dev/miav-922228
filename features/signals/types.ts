/**
 * MIAV Signal System V1 — shared types.
 * Definitions vs user state vs rewards stay separate.
 */

export type SignalSource =
  | "novel"
  | "binary"
  | "luminous"
  | "writer-memo"
  | "miav-world"
  | "other";

export type SignalRewardTarget =
  | "luminous"
  | "writer-memo"
  | "binary"
  | "miav";

export type SignalDefinition = {
  id: string;
  codePrefix: string;
  source: SignalSource;
  title: string;
  description?: string;
  /** When true, undiscovered signals show only as "Unknown Signal". */
  hidden: boolean;
  rewardTargets: SignalRewardTarget[];
  version: number;
  /**
   * When true, `/api/signals/issue` may mint a code for this id.
   * Hidden teasers stay false until their source app ships.
   */
  acquirable?: boolean;
};

/** Persisted inventory entry — never mixed into SignalDefinition. */
export type UserSignal = {
  signalId: string;
  code: string;
  acquiredAt: string;
  source: SignalSource;
  /** Guest visitorId or Google Firebase UID — metadata for future sync. */
  ownerKind?: "guest" | "google";
  ownerId?: string;
  /** Reserved for future cross-app usage tracking. */
  usedIn?: string[];
};

export type SignalReward = {
  signalId: string;
  targetApp: SignalRewardTarget;
  rewardId: string;
  title: string;
};

export type RedeemedReward = {
  signalId: string;
  targetApp: SignalRewardTarget;
  rewardId: string;
  redeemedAt: string;
  code: string;
};

export type SignalValidationFailureReason =
  | "INVALID_FORMAT"
  | "UNKNOWN_SIGNAL"
  | "NOT_AVAILABLE_FOR_TARGET"
  | "ALREADY_REDEEMED";

export type SignalValidationResult =
  | {
      valid: true;
      signalId: string;
      rewardId?: string;
    }
  | {
      valid: false;
      reason: SignalValidationFailureReason;
    };

/**
 * HTTP redeem contract for cross-app clients (e.g. future Luminous Structure).
 * Does not require Google Auth / MIAV ID — code + targetApp only.
 */
export type SignalRedeemFailureReason =
  | SignalValidationFailureReason
  | "SERVER_ERROR";

export type SignalRedeemApiResponse =
  | {
      valid: true;
      signalId: string;
      rewardId: string;
      targetApp: SignalRewardTarget;
    }
  | {
      valid: false;
      reason: SignalRedeemFailureReason;
      signalId?: string;
    };

export type SignalOwner = {
  kind: "guest" | "google";
  id: string;
};

export type SignalsStoreV1 = {
  version: 1;
  signals: UserSignal[];
  redeems: RedeemedReward[];
};

/** Public claimed Signal for My MIAV — never includes uid. */
export type PublicMySignal = {
  signalId: string;
  title: string;
  description?: string;
  source: SignalSource;
  claimedAt: string;
  code: string;
  rewardTargets: string[];
};

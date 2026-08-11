export type {
  PublicMySignal,
  RedeemedReward,
  SignalDefinition,
  SignalOwner,
  SignalRedeemApiResponse,
  SignalRedeemFailureReason,
  SignalReward,
  SignalRewardTarget,
  SignalSource,
  SignalValidationFailureReason,
  SignalValidationResult,
  SignalsStoreV1,
  UserSignal,
} from "@/features/signals/types";

export {
  SIGNAL_DEFINITIONS,
  getSignalDefinition,
  getSignalDefinitionByPrefix,
  isAcquirableSignal,
  listSignalDefinitions,
} from "@/features/signals/definitions";

export {
  SIGNAL_REWARDS,
  getRewardForSignal,
  isSignalAvailableForTarget,
  listSignalRewards,
} from "@/features/signals/rewards";

export {
  SIGNAL_CODE_RE,
  formatSignalCode,
  normalizeSignalCode,
  parseSignalCode,
} from "@/features/signals/code";

export {
  acquireSignal,
  claimPendingDiscoveries,
  discoverSignal,
  redeemSignal,
  validateSignalCode,
} from "@/features/signals/service";

export {
  LUMINOUS_SIGNAL_TARGET,
  getLuminousReward,
  redeemLuminousSignal,
} from "@/features/signals/integrations/luminous";

export { EnterSignalForm } from "@/features/signals/EnterSignalForm";
export { MySignalsPage } from "@/features/signals/MySignalsPage";
export { ReceiveChapter14Signal } from "@/features/signals/ReceiveChapter14Signal";
export { SignalsRedirectPage } from "@/features/signals/SignalsRedirectPage";

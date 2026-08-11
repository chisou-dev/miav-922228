import type { SignalDefinition } from "@/features/signals/types";

/**
 * Canonical Signal catalog — single source of truth.
 * Do not hardcode Signal metadata in pages or games.
 */
export const SIGNAL_DEFINITIONS: readonly SignalDefinition[] = [
  {
    id: "novel-chapter-14",
    codePrefix: "MIAV-N14",
    source: "novel",
    title: "Chapter 14 Signal",
    description: "A signal discovered at the end of Chapter 14.",
    hidden: false,
    rewardTargets: ["luminous", "writer-memo", "miav"],
    version: 1,
    acquirable: true,
  },
  {
    id: "binary-level-30",
    codePrefix: "MIAV-B30",
    source: "binary",
    title: "Level 30 Signal",
    description: "A signal from Binary Block Level 30.",
    hidden: true,
    rewardTargets: ["miav", "writer-memo"],
    version: 1,
    acquirable: false,
  },
  {
    id: "luminous-structure-alpha",
    codePrefix: "MIAV-LUM",
    source: "luminous",
    title: "Luminous Signal",
    description: "A signal from Luminous Structure.",
    hidden: true,
    rewardTargets: ["writer-memo", "miav"],
    version: 1,
    acquirable: false,
  },
  {
    id: "writer-memo-reflection",
    codePrefix: "MIAV-WM1",
    source: "writer-memo",
    title: "Writer Signal",
    description: "A signal from Writer Memo.",
    hidden: true,
    rewardTargets: ["luminous", "miav"],
    version: 1,
    acquirable: false,
  },
] as const;

const byId = new Map(
  SIGNAL_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const byPrefix = new Map(
  SIGNAL_DEFINITIONS.map((definition) => [
    definition.codePrefix.toUpperCase(),
    definition,
  ]),
);

export function listSignalDefinitions(): readonly SignalDefinition[] {
  return SIGNAL_DEFINITIONS;
}

export function getSignalDefinition(
  signalId: string,
): SignalDefinition | undefined {
  return byId.get(signalId);
}

export function getSignalDefinitionByPrefix(
  codePrefix: string,
): SignalDefinition | undefined {
  return byPrefix.get(codePrefix.trim().toUpperCase());
}

export function isAcquirableSignal(signalId: string): boolean {
  return getSignalDefinition(signalId)?.acquirable === true;
}

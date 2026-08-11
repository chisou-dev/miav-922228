/**
 * Phase 5 Signal pure checks — no Firestore / production writes.
 *
 * Run: npx tsx scripts/validate-trace-phase5.ts
 */
import { signalClaimDocumentId } from "../features/signals/claimId";
import { formatSignalCode, parseSignalCode } from "../features/signals/code";
import { getSignalDefinition, isAcquirableSignal } from "../features/signals/definitions";
import type { PublicMySignal } from "../features/signals/types";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

// Deterministic claim id
const uid = "firebase-uid-abc";
const id1 = signalClaimDocumentId(uid, "novel-chapter-14");
const id2 = signalClaimDocumentId(uid, "novel-chapter-14");
const idOther = signalClaimDocumentId(uid, "binary-level-30");
assert(id1 === id2, "claim id deterministic");
assert(id1 !== idOther, "claim id differs per signal");
assert(!id1.includes(uid), "claim id does not embed raw uid");
assert(/^[a-f0-9]{64}$/.test(id1), "claim id sha256 hex");

// Catalog
assert(isAcquirableSignal("novel-chapter-14"), "chapter 14 acquirable");
assert(!isAcquirableSignal("luminous-structure-alpha"), "luminous not acquirable");
assert(
  getSignalDefinition("novel-chapter-14")?.title === "Chapter 14 Signal",
  "chapter 14 title",
);

// Public payload privacy
const pub: PublicMySignal = {
  signalId: "novel-chapter-14",
  title: "Chapter 14 Signal",
  source: "novel",
  claimedAt: "2026-08-11T00:00:00.000Z",
  code: "MIAV-N14-AAAA-BBBB",
  rewardTargets: ["miav"],
};
assert(!("uid" in pub), "public signal has no uid");
assert(
  !JSON.stringify(pub).includes("firebase"),
  "public signal json has no firebase",
);

// Code format helper still works
const formatted = formatSignalCode("MIAV-N14", "abcd1234");
assert(formatted === "MIAV-N14-ABCD-1234", "formatSignalCode");
assert(parseSignalCode(formatted)?.definition.id === "novel-chapter-14", "parse known prefix");

// Unknown / not claimable rules for client validation
assert(
  !isAcquirableSignal("not-a-real-signal"),
  "unknown signal not acquirable",
);

// Duplicate claim semantics (pure): same doc id → one claim
assert(
  signalClaimDocumentId("u1", "novel-chapter-14") ===
    signalClaimDocumentId("u1", "novel-chapter-14"),
  "F duplicate same claim id",
);
assert(
  signalClaimDocumentId("u1", "novel-chapter-14") !==
    signalClaimDocumentId("u2", "novel-chapter-14"),
  "D other user different claim id",
);

if (process.exitCode) {
  console.error("\nSome Phase 5 checks failed");
  process.exit(1);
}
console.log("\nAll Phase 5 local checks passed");

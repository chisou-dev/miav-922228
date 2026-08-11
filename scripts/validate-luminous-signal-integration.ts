/**
 * Phase 6A — Luminous Signal redeem contract checks (no HTTP server / no deploy).
 *
 * Run: npx tsx scripts/validate-luminous-signal-integration.ts
 *
 * HMAC mint/verify stays in server-only modules; this script covers the
 * public contract: targetApp, reward mapping, reusable keys, client helper body.
 */
import { parseSignalCode } from "../features/signals/code";
import {
  getLuminousReward,
  LUMINOUS_SIGNAL_TARGET,
  redeemLuminousSignal,
} from "../features/signals/integrations/luminous";
import { resolveRedeemForSignal } from "../features/signals/redeemResolve";
import {
  getRewardForSignal,
  SIGNAL_REWARDS,
} from "../features/signals/rewards";
import { getWorkById } from "../features/world-memory/trace/works";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

const SIGNAL_ID = "novel-chapter-14";
const REWARD_ID = "light-style-novel-14";

assert(LUMINOUS_SIGNAL_TARGET === "luminous", "target id is luminous");
assert(
  getWorkById("luminous-structure")?.enabled === false,
  "world workId luminous-structure stays disabled",
);

const catalogReward = getRewardForSignal(SIGNAL_ID, "luminous");
assert(catalogReward?.rewardId === REWARD_ID, "rewards.ts maps chapter 14");
assert(
  getLuminousReward(SIGNAL_ID)?.rewardId === catalogReward?.rewardId,
  "getLuminousReward uses SIGNAL_REWARDS",
);
assert(
  catalogReward?.title === "Chapter 14 Light",
  "display title Chapter 14 Light",
);

// A — verified signalId + luminous → reward
const a = resolveRedeemForSignal(SIGNAL_ID, "luminous");
assert(a.valid === true, "A valid");
if (a.valid) {
  assert(a.signalId === SIGNAL_ID, "A signalId");
  assert(a.rewardId === REWARD_ID, "A rewardId");
  assert(a.targetApp === "luminous", "A targetApp");
}

// B — wrong / unknown target
const b = resolveRedeemForSignal(SIGNAL_ID, "unknown");
assert(b.valid === false, "B invalid target");
if (!b.valid) {
  assert(b.reason === "NOT_AVAILABLE_FOR_TARGET", "B NOT_AVAILABLE_FOR_TARGET");
}

const b2 = resolveRedeemForSignal(SIGNAL_ID, "binary");
assert(b2.valid === false, "B binary not available for chapter 14");
if (!b2.valid) {
  assert(b2.reason === "NOT_AVAILABLE_FOR_TARGET", "B2 reason");
}

// C — well-formed but wrong checksum (server HMAC rejects; parser accepts)
const wellFormedBad = "MIAV-N14-AAAA-BBBB";
assert(parseSignalCode(wellFormedBad) != null, "C well-formed parses");
assert(parseSignalCode("TOTALLY-INVALID") == null, "C garbage invalid format");

// D — unknown signal id must not invent reward
const d = resolveRedeemForSignal("not-a-real-signal", "luminous");
assert(d.valid === false, "D unknown signal invalid");

// E — reusable mapping (multiple resolves succeed)
const e1 = resolveRedeemForSignal(SIGNAL_ID, "luminous");
const e2 = resolveRedeemForSignal(SIGNAL_ID, "luminous");
assert(e1.valid && e2.valid, "E redeem reusable");
if (e1.valid && e2.valid) {
  assert(e1.rewardId === e2.rewardId, "E same rewardId");
}

// F — without luminous mapping, no invented reward
assert(
  SIGNAL_REWARDS.some(
    (r) => r.signalId === SIGNAL_ID && r.targetApp === "luminous",
  ),
  "F live catalog has luminous row",
);
assert(
  !SIGNAL_REWARDS.some(
    (r) => r.signalId === SIGNAL_ID && r.targetApp === "binary",
  ),
  "F no binary row for chapter 14",
);
const f = resolveRedeemForSignal(SIGNAL_ID, "binary");
assert(f.valid === false, "F no invented binary reward");

async function checkClientHelper() {
  let capturedBody = "";
  const mockFetch: typeof fetch = async (_input, init) => {
    capturedBody = String(init?.body || "");
    return new Response(
      JSON.stringify({
        valid: true,
        signalId: SIGNAL_ID,
        rewardId: REWARD_ID,
        targetApp: "luminous",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const client = await redeemLuminousSignal("MIAV-N14-TEST-CODE", {
    fetchImpl: mockFetch,
  });
  assert(client.valid === true, "client helper success");
  assert(
    capturedBody.includes('"targetApp":"luminous"'),
    "client sends luminous",
  );
  assert(capturedBody.includes('"code"'), "client sends code");
  assert(!capturedBody.includes("uid"), "client body has no uid");
  assert(!capturedBody.includes("miavId"), "client body has no miavId");
}

void checkClientHelper().then(() => {
  if (process.exitCode) {
    console.error("\nSome Luminous integration checks failed");
    process.exit(1);
  }
  console.log("\nAll Luminous integration checks passed");
});

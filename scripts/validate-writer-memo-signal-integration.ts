/**
 * Phase 6B — Writer Memo Signal redeem + CORS allowlist checks (no deploy).
 *
 * Run: npx tsx scripts/validate-writer-memo-signal-integration.ts
 */
import { parseSignalCode } from "../features/signals/code";
import {
  decideRedeemCors,
  listRedeemCorsAllowedOrigins,
  withRedeemCorsHeaders,
} from "../features/signals/redeemCors";
import { resolveRedeemForSignal } from "../features/signals/redeemResolve";
import { getRewardForSignal } from "../features/signals/rewards";
import { NextResponse } from "next/server";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

const SIGNAL_ID = "novel-chapter-14";
const REWARD_ID = "reflection-theme-novel-14";
const TARGET = "writer-memo";

assert(
  getRewardForSignal(SIGNAL_ID, TARGET)?.rewardId === REWARD_ID,
  "rewards.ts maps chapter 14 → writer-memo",
);

const a = resolveRedeemForSignal(SIGNAL_ID, TARGET);
assert(a.valid === true, "A writer-memo valid");
if (a.valid) {
  assert(a.rewardId === REWARD_ID, "A rewardId");
  assert(a.targetApp === TARGET, "A targetApp");
}

const luminous = resolveRedeemForSignal(SIGNAL_ID, "luminous");
assert(luminous.valid === true, "I luminous still valid");
if (luminous.valid) {
  assert(luminous.rewardId === "light-style-novel-14", "I luminous reward");
}

const wrong = resolveRedeemForSignal(SIGNAL_ID, "binary");
assert(wrong.valid === false, "E binary not for chapter 14");
if (!wrong.valid) {
  assert(wrong.reason === "NOT_AVAILABLE_FOR_TARGET", "E NOT_AVAILABLE_FOR_TARGET");
}

assert(parseSignalCode("MIAV-N14-AAAA-BBBB") != null, "D well-formed parses");
assert(parseSignalCode("TOTALLY-INVALID") == null, "D garbage invalid");

const origins = listRedeemCorsAllowedOrigins();
assert(
  origins.includes("https://writer-memo.vercel.app"),
  "G prod writer-memo origin allowlisted",
);
assert(origins.includes("http://localhost:5173"), "G local vite allowlisted");
assert(!origins.includes("*"), "G no wildcard origin");

const allowedReq = new Request("https://miav-922228.com/api/signals/redeem", {
  method: "OPTIONS",
  headers: { Origin: "https://writer-memo.vercel.app" },
});
assert(decideRedeemCors(allowedReq).kind === "allowed", "G allowed Origin");

const deniedReq = new Request("https://miav-922228.com/api/signals/redeem", {
  method: "OPTIONS",
  headers: { Origin: "https://evil.example" },
});
assert(decideRedeemCors(deniedReq).kind === "denied", "G denied Origin");

const noOrigin = new Request("https://miav-922228.com/api/signals/redeem", {
  method: "POST",
});
assert(decideRedeemCors(noOrigin).kind === "no-origin", "G no Origin ok");

const res = withRedeemCorsHeaders(
  NextResponse.json({ valid: true }),
  "https://writer-memo.vercel.app",
);
assert(
  res.headers.get("Access-Control-Allow-Origin") ===
    "https://writer-memo.vercel.app",
  "G ACAO echoes allowlisted origin",
);
assert(
  res.headers.get("Access-Control-Allow-Methods")?.includes("POST") === true,
  "G methods include POST",
);
assert(
  res.headers.get("Access-Control-Allow-Origin") !== "*",
  "G ACAO not wildcard",
);

if (process.exitCode && process.exitCode !== 0) {
  console.error("\nwriter-memo signal validation FAILED");
  process.exit(1);
}
console.log("\nwriter-memo signal validation OK");

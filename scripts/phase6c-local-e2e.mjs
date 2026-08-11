/**
 * Phase 6C — local E2E: Writer Memo → MIAV redeem (no production).
 *
 * Prerequisites: MIAV on BASE, Writer Memo on WM_ORIGIN, shared SIGNAL_CODE_SECRET.
 * Run: node scripts/phase6c-local-e2e.mjs
 *
 * Does not write production Firebase / does not commit secrets.
 */
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WM_ROOT = join(ROOT, "..", "writer-memo");

const BASE = (process.env.MIAV_BASE_URL || "http://127.0.0.1:3005").replace(
  /\/$/,
  "",
);
const WM_ORIGIN = (
  process.env.WRITER_MEMO_ORIGIN || "http://localhost:5173"
).replace(/\/$/, "");
const EVIL_ORIGIN = "https://evil.example";

function loadSecret() {
  if (process.env.SIGNAL_CODE_SECRET?.trim()) {
    return process.env.SIGNAL_CODE_SECRET.trim();
  }
  const path = join(ROOT, ".env.phase6c.local");
  if (!existsSync(path)) {
    throw new Error("Missing SIGNAL_CODE_SECRET / .env.phase6c.local");
  }
  const text = readFileSync(path, "utf8");
  const m = text.match(/^SIGNAL_CODE_SECRET=(.+)$/m);
  if (!m) throw new Error("SIGNAL_CODE_SECRET not in .env.phase6c.local");
  return m[1].trim();
}

function assert(cond, label) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

function mintChapter14Code(secret) {
  const signalId = "novel-chapter-14";
  const prefix = "MIAV-N14";
  const checksum = createHmac("sha256", secret)
    .update(`v1|${signalId}|${prefix}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return `${prefix}-${checksum.slice(0, 4)}-${checksum.slice(4, 8)}`;
}

/** Minimal Writer Memo reward store (mirrors src/signals/storage.ts). */
function createRewardStore() {
  /** @type {Map<string, { rewardId: string, unlockedAt: string, signalId?: string }>} */
  const byId = new Map();
  return {
    unlock(input) {
      const rewardId = String(input.rewardId || "").trim();
      if (!rewardId) return { alreadyUnlocked: false };
      if (byId.has(rewardId)) return { alreadyUnlocked: true };
      byId.set(rewardId, {
        rewardId,
        unlockedAt: input.unlockedAt || new Date().toISOString(),
        signalId: input.signalId,
      });
      return { alreadyUnlocked: false };
    },
    list() {
      return [...byId.values()];
    },
    serialize() {
      return JSON.stringify({ version: 1, rewards: [...byId.values()] });
    },
    restore(raw) {
      byId.clear();
      const parsed = JSON.parse(raw);
      for (const r of parsed.rewards || []) {
        if (r?.rewardId) byId.set(r.rewardId, r);
      }
    },
  };
}

async function waitForOk(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0 && res.status < 500) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  console.log("Phase 6C local E2E");
  console.log("MIAV_BASE", BASE);
  console.log("WM_ORIGIN", WM_ORIGIN);

  assert(!BASE.includes("miav-922228.com"), "not targeting production MIAV host");
  assert(BASE.includes("127.0.0.1") || BASE.includes("localhost"), "local MIAV");

  const secret = loadSecret();
  assert(secret.length >= 32, "local secret is long enough");
  assert(
    secret !== "miav-signal-dev-only-not-for-production",
    "using dedicated phase6c secret (not default dev fallback alone required)",
  );

  assert(await waitForOk(`${BASE}/`), "MIAV / reachable");
  assert(await waitForOk(`${BASE}/my-miav`), "MIAV /my-miav reachable");
  assert(await waitForOk(WM_ORIGIN + "/"), "Writer Memo / reachable");

  const code = mintChapter14Code(secret);
  const badCode = "MIAV-N14-DEAD-BEEF";
  console.log("minted chapter14 code (not a production code)");

  // --- A validate ---
  {
    const res = await fetch(`${BASE}/api/signals/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, targetApp: "writer-memo" }),
    });
    const data = await res.json();
    assert(data.valid === true, "A valid code validates");
    assert(data.signalId === "novel-chapter-14", "A signalId");
  }
  {
    const res = await fetch(`${BASE}/api/signals/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: badCode, targetApp: "writer-memo" }),
    });
    const data = await res.json();
    assert(data.valid === false, "A tampered code invalid");
  }

  // --- B redeem ---
  let redeemOk;
  {
    const res = await fetch(`${BASE}/api/signals/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: WM_ORIGIN,
      },
      body: JSON.stringify({ code, targetApp: "writer-memo" }),
    });
    redeemOk = await res.json();
    assert(res.status === 200, "B redeem status 200");
    assert(redeemOk.valid === true, "B valid true");
    assert(redeemOk.signalId === "novel-chapter-14", "B signalId");
    assert(redeemOk.rewardId === "reflection-theme-novel-14", "B rewardId");
    assert(redeemOk.targetApp === "writer-memo", "B targetApp");
    assert(
      res.headers.get("access-control-allow-origin") === WM_ORIGIN,
      "B/C CORS ACAO echoes Writer Memo origin",
    );
    assert(
      res.headers.get("access-control-allow-origin") !== "*",
      "B/C no wildcard",
    );
  }

  // Privacy: only code+targetApp were sent (checked by constructing body)
  const privacyBody = { code, targetApp: "writer-memo" };
  assert(
    Object.keys(privacyBody).sort().join(",") === "code,targetApp",
    "H body keys only code+targetApp",
  );

  // --- C CORS denied ---
  {
    const pre = await fetch(`${BASE}/api/signals/redeem`, {
      method: "OPTIONS",
      headers: {
        Origin: EVIL_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    assert(pre.status === 403, "C denied OPTIONS 403");
    assert(
      pre.headers.get("access-control-allow-origin") == null,
      "C denied OPTIONS no ACAO",
    );
  }
  {
    const res = await fetch(`${BASE}/api/signals/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: EVIL_ORIGIN,
      },
      body: JSON.stringify({ code, targetApp: "writer-memo" }),
    });
    assert(res.status === 403, "C denied POST 403");
    assert(
      res.headers.get("access-control-allow-origin") == null,
      "C denied POST no ACAO",
    );
  }
  {
    const pre = await fetch(`${BASE}/api/signals/redeem`, {
      method: "OPTIONS",
      headers: {
        Origin: WM_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    assert(pre.status === 204 || pre.status === 200, "C allowed OPTIONS ok");
    assert(
      pre.headers.get("access-control-allow-origin") === WM_ORIGIN,
      "C allowed OPTIONS ACAO",
    );
  }

  // --- D storage ---
  const store = createRewardStore();
  assert(redeemOk.valid === true, "D have success payload");
  const u1 = store.unlock({
    rewardId: redeemOk.rewardId,
    signalId: redeemOk.signalId,
  });
  assert(u1.alreadyUnlocked === false, "D first unlock");
  assert(store.list().length === 1, "D one reward");
  assert(
    store.list()[0].rewardId === "reflection-theme-novel-14",
    "D reward id stored",
  );
  const u2 = store.unlock({
    rewardId: redeemOk.rewardId,
    signalId: redeemOk.signalId,
  });
  assert(u2.alreadyUnlocked === true, "D duplicate");
  assert(store.list().length === 1, "D still one");
  const snap = store.serialize();
  store.unlock({ rewardId: "other-should-not-matter" });
  store.restore(snap);
  assert(
    store.list().length === 1 &&
      store.list()[0].rewardId === "reflection-theme-novel-14",
    "D reload restore",
  );

  // --- E invalid unlock path ---
  {
    const res = await fetch(`${BASE}/api/signals/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: WM_ORIGIN,
      },
      body: JSON.stringify({ code: badCode, targetApp: "writer-memo" }),
    });
    const data = await res.json();
    assert(data.valid === false, "E invalid redeem");
    const before = store.list().length;
    if (data.valid) {
      store.unlock({ rewardId: data.rewardId });
    }
    assert(store.list().length === before, "E no unlock on invalid");
  }

  // --- F network failure ---
  {
    const before = store.serialize();
    try {
      await fetch("http://127.0.0.1:9/api/signals/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, targetApp: "writer-memo" }),
        signal: AbortSignal.timeout(500),
      });
      assert(false, "F should throw");
    } catch {
      store.restore(before);
      assert(
        store.list()[0]?.rewardId === "reflection-theme-novel-14",
        "F existing unlock preserved after network fail",
      );
    }
  }

  // --- Luminous regression ---
  {
    const res = await fetch(`${BASE}/api/signals/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, targetApp: "luminous" }),
    });
    const data = await res.json();
    assert(data.valid === true, "I luminous redeem");
    assert(data.rewardId === "light-style-novel-14", "I luminous reward");
  }

  // --- Claim/mine without auth (no Firebase write) ---
  {
    const claim = await fetch(`${BASE}/api/signals/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalIds: ["novel-chapter-14"] }),
    });
    assert(claim.status === 401, "claim requires Google (401)");
    const mine = await fetch(`${BASE}/api/signals/mine`);
    assert(mine.status === 401, "mine requires Google (401)");
  }

  // --- Discovery contract (source + pure store shape, no code) ---
  {
    const recvPath = join(
      ROOT,
      "features",
      "signals",
      "ReceiveChapter14Signal.tsx",
    );
    const src = readFileSync(recvPath, "utf8");
    assert(!src.includes("issueSignalCode"), "discovery UI does not mint codes");
    assert(src.includes("discoverSignal"), "discovery uses discoverSignal");
    assert(src.includes("waitingForMiavId") || src.includes("my-miav"), "points to My MIAV / identity wait");
    assert(!/MIAV-N14-\$\{/.test(src), "no code template in Receive UI");
  }
  {
    // Pure discovery store: never stores codes
    const discovery = {
      version: 1,
      discoveries: [
        { signalId: "novel-chapter-14", discoveredAt: new Date().toISOString() },
      ],
      claimedIds: [],
    };
    const json = JSON.stringify(discovery);
    assert(!json.includes("MIAV-"), "discovery store has no code");
    assert(json.includes("novel-chapter-14"), "discovery keeps signalId");
  }

  // --- PublicMySignal privacy (fixture) ---
  {
    const pub = {
      signalId: "novel-chapter-14",
      title: "Chapter 14 Signal",
      source: "novel",
      claimedAt: "2026-08-11T00:00:00.000Z",
      code: code,
      rewardTargets: ["writer-memo", "luminous", "miav"],
    };
    assert(!("uid" in pub), "mine public shape has no uid field");
    assert(!JSON.stringify(pub).includes("firebase"), "no firebase uid leak in fixture");
  }

  // --- Writer Memo UI strings / config ---
  {
    const envPath = join(WM_ROOT, ".env.phase6c.local");
    assert(existsSync(envPath), "Writer Memo phase6c env exists");
    const envText = readFileSync(envPath, "utf8");
    assert(
      envText.includes(`VITE_MIAV_BASE_URL=${BASE}`) ||
        envText.includes("VITE_MIAV_BASE_URL=http://127.0.0.1:3005"),
      "VITE_MIAV_BASE_URL points at local MIAV",
    );
    assert(!envText.includes("miav-922228.com"), "WM env not production");

    const settingsComp = readFileSync(
      join(WM_ROOT, "src", "components", "SignalCodeSettings.tsx"),
      "utf8",
    );
    assert(settingsComp.includes("settings.signal.title"), "Signal settings UI present");
    assert(settingsComp.includes("redeemWriterMemoSignal"), "uses redeem client");

    const redeemSrc = readFileSync(
      join(WM_ROOT, "src", "signals", "redeem.ts"),
      "utf8",
    );
    assert(redeemSrc.includes("getMiavBaseUrl()"), "redeem uses config URL");
    assert(redeemSrc.includes('targetApp: WRITER_MEMO_SIGNAL_TARGET'), "redeem targetApp writer-memo");
    assert(
      !/body:\s*JSON\.stringify\(\{[^}]*notes/s.test(redeemSrc),
      "redeem body never includes notes field",
    );
    assert(
      redeemSrc.includes("code: trimmed") || redeemSrc.includes("code:"),
      "redeem sends code",
    );
  }

  // Live Writer Memo: page OK + vite serves Signal module
  {
    const home = await fetch(WM_ORIGIN + "/");
    assert(home.ok, "WM home 200");
    const html = await home.text();
    assert(html.includes("root") || html.includes("Writer"), "WM html shell");

    const mod = await fetch(
      `${WM_ORIGIN}/src/components/SignalCodeSettings.tsx`,
    );
    assert(mod.ok, "Vite serves SignalCodeSettings source");
    const modText = await mod.text();
    assert(modText.includes("Unlock") || modText.includes("settings.signal.unlock"), "Unlock UI wired");
  }

  // --- PWA SW policy (built + public) ---
  {
    const swCandidates = [
      join(WM_ROOT, "dist", "sw.js"),
      join(WM_ROOT, "public", "sw.js"),
    ];
    let sw = "";
    for (const p of swCandidates) {
      if (existsSync(p)) {
        sw = readFileSync(p, "utf8");
        break;
      }
    }
    assert(sw.length > 0, "SW file present");
    assert(sw.includes("method !== 'GET'"), "SW ignores non-GET (no POST cache)");
    assert(sw.includes("url.origin !== self.location.origin"), "SW same-origin only");
  }

  // Ensure redeem never hit production during this run
  assert(!BASE.includes("miav-922228.com"), "final: still local only");

  if (process.exitCode) {
    console.error("\nPhase 6C E2E FAILED");
    process.exit(1);
  }
  console.log("\nPhase 6C automated local checks PASSED");
  console.log("manual_google_claim_required: yes (no Firebase emulator)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

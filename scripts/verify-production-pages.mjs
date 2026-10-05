/**
 * Production page smoke check after deploy.
 * Uses apex URL; follows 301/302/307/308 to www (or other) — redirect is not a failure.
 *
 * Usage:
 *   node scripts/verify-production-pages.mjs
 *   node scripts/verify-production-pages.mjs --poll --attempts 24 --interval-ms 15000
 */

const APEX_BASE = "https://miav-922228.com";
const PATHS = ["/", "/start-here", "/works", "/flash/after-the-rain"];
const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);
const MAX_REDIRECTS = 12;

function parseArgs(argv) {
  const opts = { poll: false, attempts: 24, intervalMs: 15_000 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--poll") opts.poll = true;
    else if (argv[i] === "--attempts" && argv[i + 1]) opts.attempts = Number(argv[++i]);
    else if (argv[i] === "--interval-ms" && argv[i + 1]) {
      opts.intervalMs = Number(argv[++i]);
    }
  }
  return opts;
}

/** Resolve final URL + status; treat redirect responses as normal. */
async function fetchFinal(url) {
  let current = url;
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const response = await fetch(current, { redirect: "manual" });
    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`${current} returned ${response.status} without Location`);
      }
      current = new URL(location, current).href;
      continue;
    }
    return { status: response.status, url: current, response };
  }
  throw new Error(`Too many redirects from ${url}`);
}

async function checkOnce() {
  const results = [];
  for (const path of PATHS) {
    const { status, url } = await fetchFinal(`${APEX_BASE}${path}`);
    results.push({ path, status, url });
  }

  const homeFinal = await fetchFinal(`${APEX_BASE}/`);
  const homeHtml = await homeFinal.response.text();
  const startHereLink = homeHtml.includes('href="/start-here"');

  return { results, startHereLink, ok: results.every((r) => r.status === 200) && startHereLink };
}

function printReport(report) {
  for (const { path, status, url } of report.results) {
    console.log(`HTTP ${path} ${status} ${url}`);
  }
  console.log("home_has_start_here", report.startHereLink);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const opts = parseArgs(process.argv);

let lastReport = null;
const attempts = opts.poll ? opts.attempts : 1;

for (let attempt = 0; attempt < attempts; attempt++) {
  lastReport = await checkOnce();
  printReport(lastReport);
  if (lastReport.ok) {
    console.log("OK production pages verified");
    process.exit(0);
  }
  if (attempt < attempts - 1) {
    console.log(
      `Waiting deploy (attempt ${attempt + 1}/${attempts})…`,
    );
    await sleep(opts.intervalMs);
  }
}

console.error("FAIL production verification");
process.exit(1);

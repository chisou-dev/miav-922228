/**
 * Verify flash piece bodies in catalog.ts match desktop canonical spec byte-for-byte.
 */
import fs from "node:fs";
import path from "node:path";
const SPEC = path.join(process.cwd(), "scripts/flash-canonical-source.txt");

const spec = fs.readFileSync(SPEC, "utf8");

function canonicalBody(slugMarker) {
  const re = new RegExp(
    `## [^\\n]+— /flash/${slugMarker}[\\s\\S]*?~~~~markdown\\n([\\s\\S]*?)~~~~`,
  );
  const m = spec.match(re);
  if (!m) throw new Error(`missing ${slugMarker}`);
  let text = m[1].trim().replace(/^# .+\n+/m, "");
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.join("\n\n");
}

const slugs = [
  "the-day-i-couldnt-find-anyone",
  "the-silver-thread",
  "lost-property",
  "after-the-rain",
];

// Load catalog by evaluating TS is hard; parse bodies from file
const catalog = fs.readFileSync(
  path.join(process.cwd(), "features/library/catalog.ts"),
  "utf8",
);

function extractCatalogBody(slug) {
  const blockRe = new RegExp(
    `id: "${slug}"[\\s\\S]*?body: \\[([\\s\\S]*?)\\]\\.join\\("\\\\n\\\\n"\\),`,
  );
  const m = catalog.match(blockRe);
  if (!m) throw new Error(`catalog body not found: ${slug}`);
  const inner = m[1];
  const parts = [];
  const strRe = /"((?:\\.|[^"\\])*)"/g;
  let sm;
  while ((sm = strRe.exec(inner))) {
    parts.push(JSON.parse(`"${sm[1]}"`));
  }
  return parts.join("\n\n");
}

const forbidden = [
  "Every second, it grew by exactly one second.",
  "one second at a time",
  "I have not smelled the sea yet",
];

let ok = true;
for (const slug of slugs) {
  const want = canonicalBody(slug);
  const got = extractCatalogBody(slug);
  if (want !== got) {
    ok = false;
    console.error(`MISMATCH ${slug}`);
    console.error("  want len", want.length, "got len", got.length);
    for (let i = 0; i < Math.min(want.length, got.length); i++) {
      if (want[i] !== got[i]) {
        console.error("  first diff at", i, JSON.stringify(want.slice(i, i + 40)));
        console.error("  vs", JSON.stringify(got.slice(i, i + 40)));
        break;
      }
    }
  } else {
    console.log(`OK body match: ${slug}`);
  }
}

for (const phrase of forbidden) {
  if (catalog.includes(phrase)) {
    ok = false;
    console.error(`FORBIDDEN phrase still in catalog: ${phrase}`);
  }
}

if (
  !catalog.includes(
    "A silver thread rises above a mountain as offerings gather and memories begin to disappear.",
  )
) {
  ok = false;
  console.error("Silver Thread blurb not updated");
} else {
  console.log("OK Silver Thread blurb");
}

process.exit(ok ? 0 : 1);

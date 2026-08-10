/**
 * Cosmic Morse Divider verification (MIAV site).
 * Run: node scripts/verify-cosmic-morse.mjs
 *
 * Keep INTERNATIONAL_MORSE in sync with features/shared/cosmic-morse/morse.ts
 */

const INTERNATIONAL_MORSE = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
};

function normalizeForMorse(input) {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textToMorse(input) {
  const normalized = normalizeForMorse(input);
  if (!normalized) return { normalized: "", words: [] };
  const words = [];
  for (const rawWord of normalized.split(" ")) {
    if (!rawWord) continue;
    const letters = [];
    for (const char of rawWord) {
      const code = INTERNATIONAL_MORSE[char];
      if (!code) continue;
      letters.push({ char, marks: code.split("") });
    }
    if (letters.length > 0) words.push({ letters });
  }
  return { normalized, words };
}

function morseToFlatString(message) {
  return message.words
    .map((word) =>
      word.letters.map((letter) => letter.marks.join("")).join(" "),
    )
    .join(" / ");
}

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DOT_GLYPHS = ["star", "orb", "planet", "moon"];
const DASH_GLYPHS = ["saturn", "comet", "orbit", "meteor"];

function pickDotGlyph(seed, globalIndex) {
  return DOT_GLYPHS[(seed + globalIndex * 5) % DOT_GLYPHS.length];
}

function pickDashGlyph(seed, globalIndex) {
  return DASH_GLYPHS[(seed + globalIndex * 7 + 1) % DASH_GLYPHS.length];
}

function glyphSequence(message) {
  const m = textToMorse(message);
  const seed = hashSeed(m.normalized);
  const out = [];
  let i = 0;
  for (const word of m.words) {
    for (const letter of word.letters) {
      for (const mark of letter.marks) {
        out.push(
          mark === "."
            ? pickDotGlyph(seed, i)
            : pickDashGlyph(seed, i),
        );
        i += 1;
      }
    }
  }
  return out.join(",");
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

// A–Z / 0–9 mapping samples
assert(INTERNATIONAL_MORSE.A === ".-", "A = .-");
assert(INTERNATIONAL_MORSE.B === "-...", "B = -...");
assert(INTERNATIONAL_MORSE.C === "-.-.", "C = -.-.");
assert(INTERNATIONAL_MORSE.S === "...", "S = ...");
assert(INTERNATIONAL_MORSE.O === "---", "O = ---");
assert(INTERNATIONAL_MORSE["0"] === "-----", "0 = -----");
assert(INTERNATIONAL_MORSE["9"] === "----.", "9 = ----.");

assert(normalizeForMorse("ÚTIL") === "UTIL", "accent normalize ÚTIL → UTIL");
assert(normalizeForMorse("Mémo") === "MEMO", "accent normalize Mémo → MEMO");

const DIVIDER1 = {
  EN: { top: "WRITER MEMO", bottom: "HANDY" },
  FR: { top: "WRITER MEMO", bottom: "UTILE" },
  ES: { top: "WRITER MEMO", bottom: "ÚTIL" },
};

const DIVIDER2 = {
  EN: { top: "MIAV WORLD", bottom: "LEAVE A TRACE" },
  FR: { top: "MIAV WORLD", bottom: "LAISSER UNE TRACE" },
  ES: { top: "MIAV WORLD", bottom: "DEJAR UN RASTRO" },
};

for (const [locale, msgs] of Object.entries(DIVIDER1)) {
  const top = textToMorse(msgs.top);
  const bottom = textToMorse(msgs.bottom);
  assert(top.normalized === "WRITER MEMO", `D1 ${locale} top normalize`);
  assert(top.words.length === 2, `D1 ${locale} top two words`);
  assert(
    morseToFlatString(top).includes(".--"),
    `D1 ${locale} top contains W (.--)`,
  );
  assert(bottom.words.length >= 1, `D1 ${locale} bottom has letters`);
  const g1 = glyphSequence(msgs.top);
  const g2 = glyphSequence(msgs.top);
  assert(g1 === g2, `D1 ${locale} top glyphs deterministic`);
  assert(
    glyphSequence(msgs.bottom) === glyphSequence(msgs.bottom),
    `D1 ${locale} bottom glyphs deterministic`,
  );
}

for (const [locale, msgs] of Object.entries(DIVIDER2)) {
  const top = textToMorse(msgs.top);
  const bottom = textToMorse(msgs.bottom);
  assert(top.normalized === "MIAV WORLD", `D2 ${locale} top normalize`);
  assert(top.words.length === 2, `D2 ${locale} top two words`);
  assert(bottom.words.length >= 2, `D2 ${locale} bottom multi-word`);
  assert(
    glyphSequence(msgs.top) === glyphSequence(msgs.top),
    `D2 ${locale} top glyphs deterministic`,
  );
  assert(
    glyphSequence(msgs.bottom) === glyphSequence(msgs.bottom),
    `D2 ${locale} bottom glyphs deterministic`,
  );
}

// SOS classic
assert(morseToFlatString(textToMorse("SOS")) === "... --- ...", "SOS");

// Different messages → different seeds (usually different glyph streams)
assert(
  glyphSequence("HANDY") !== glyphSequence("UTILE"),
  "HANDY vs UTILE glyph streams differ",
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll cosmic Morse checks passed.");

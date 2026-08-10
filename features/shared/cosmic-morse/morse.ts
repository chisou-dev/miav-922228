/**
 * International Morse (ITU) for Latin A–Z and digits 0–9.
 * Cosmic Morse Divider — MIAV site only.
 */

export const INTERNATIONAL_MORSE: Readonly<Record<string, string>> = {
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
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
};

export type MorseMark = "." | "-";

export type MorseLetter = {
  char: string;
  marks: MorseMark[];
};

export type MorseWord = {
  letters: MorseLetter[];
};

export type MorseMessage = {
  normalized: string;
  words: MorseWord[];
};

/** Strip accents, uppercase, keep A–Z / 0–9 / spaces. */
export function normalizeForMorse(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert display text → Morse words/letters (skips unknown chars). */
export function textToMorse(input: string): MorseMessage {
  const normalized = normalizeForMorse(input);
  if (!normalized) {
    return { normalized: "", words: [] };
  }

  const words: MorseWord[] = [];
  for (const rawWord of normalized.split(" ")) {
    if (!rawWord) continue;
    const letters: MorseLetter[] = [];
    for (const char of rawWord) {
      const code = INTERNATIONAL_MORSE[char];
      if (!code) continue;
      letters.push({
        char,
        marks: code.split("") as MorseMark[],
      });
    }
    if (letters.length > 0) words.push({ letters });
  }

  return { normalized, words };
}

/** Flat Morse string for tests: ".- / -..." (letter space / word slash). */
export function morseToFlatString(message: MorseMessage): string {
  return message.words
    .map((word) =>
      word.letters.map((letter) => letter.marks.join("")).join(" "),
    )
    .join(" / ");
}

/** Stable 32-bit hash for deterministic glyph cycling. */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const DOT_GLYPHS = ["star", "orb", "planet", "moon"] as const;
export const DASH_GLYPHS = ["saturn", "comet", "orbit", "meteor"] as const;

export type DotGlyph = (typeof DOT_GLYPHS)[number];
export type DashGlyph = (typeof DASH_GLYPHS)[number];

export function pickDotGlyph(seed: number, globalIndex: number): DotGlyph {
  return DOT_GLYPHS[(seed + globalIndex * 5) % DOT_GLYPHS.length];
}

export function pickDashGlyph(seed: number, globalIndex: number): DashGlyph {
  return DASH_GLYPHS[(seed + globalIndex * 7 + 1) % DASH_GLYPHS.length];
}

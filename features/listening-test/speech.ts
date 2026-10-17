/**
 * Spoken text is separate from the story source.
 * Line breaks stay in the original. Speech joins lines that belong together.
 * A short story is one utterance. A long story is split only at paragraph
 * or sentence boundaries, so the browser is not asked to speak every line.
 */
const SINGLE_UTTERANCE_LIMIT = 450;
const PASSAGE_LIMIT = 380;

export function speechWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0 && word !== ".");
}

export function spokenParagraphs(body: string): string[] {
  const paragraphs: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const line = block
      .split(/\n/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== ".")
      .join(" ");
    if (line) paragraphs.push(line);
  }
  return paragraphs;
}

export function speechChunks(body: string): string[] {
  const paragraphs = spokenParagraphs(body);
  if (paragraphs.length === 0) return [];
  const whole = paragraphs.join(" ");
  if (whole.length <= SINGLE_UTTERANCE_LIMIT) return [whole];
  return packPassages(paragraphs);
}

function packPassages(paragraphs: readonly string[]): string[] {
  const pieces = paragraphs.flatMap((paragraph) =>
    paragraph.length <= PASSAGE_LIMIT ? [paragraph] : splitSentences(paragraph),
  );
  const chunks: string[] = [];
  let buffer = "";
  for (const piece of pieces) {
    const next = buffer ? `${buffer} ${piece}` : piece;
    if (buffer && next.length > PASSAGE_LIMIT) {
      chunks.push(buffer);
      buffer = piece;
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.flatMap((chunk) => (chunk.length <= PASSAGE_LIMIT * 2 ? [chunk] : splitLongSentence(chunk)));
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g) ?? [text];
  return parts.map((part) => part.trim()).filter(Boolean);
}

function splitLongSentence(text: string): string[] {
  const clauses = text
    .split(/,\s+/)
    .map((part, index, all) => (index < all.length - 1 ? `${part},` : part))
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";
  for (const clause of clauses) {
    const next = buffer ? `${buffer} ${clause}` : clause;
    if (buffer && next.length > PASSAGE_LIMIT) {
      chunks.push(buffer);
      buffer = clause;
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.length > 0 ? chunks : [text];
}

export type SpeechLanguage = "en" | "es" | "fr";
export const SPOKEN_LOCALES: Record<SpeechLanguage, string> = { en: "en-US", es: "es-ES", fr: "fr-FR" };

function voiceRank(voice: SpeechSynthesisVoice, language: SpeechLanguage): number | null {
  const lang = voice.lang.toLowerCase().replace("_", "-");
  if (!(lang === language || lang.startsWith(`${language}-`))) return null;
  const exact = lang === SPOKEN_LOCALES[language].toLowerCase() ? 0 : 2;
  const local = voice.localService ? 0 : 4;
  const multilingual = voice.name.toLowerCase().includes("multilingual") ? 1 : 0;
  return exact + local + multilingual;
}

/** Never substitute an English voice for Spanish or French. */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], language: SpeechLanguage): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const voice of voices) {
    const rank = voiceRank(voice, language);
    if (rank == null || rank >= bestRank) continue;
    best = voice;
    bestRank = rank;
  }
  return best;
}

/** Wait for the right-language voice before opening an attempt. */
export function waitForVoice(
  synth: SpeechSynthesis,
  language: SpeechLanguage,
  isCancelled: () => boolean,
  timeoutMs = 2500,
): Promise<SpeechSynthesisVoice | null> {
  const pick = () => isCancelled() ? null : pickVoice(synth.getVoices(), language);
  const immediate = pick();
  if (immediate) return Promise.resolve(immediate);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (voice: SpeechSynthesisVoice | null) => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", onVoices);
      window.clearTimeout(timer);
      resolve(voice);
    };
    const onVoices = () => {
      if (isCancelled()) { finish(null); return; }
      const voice = pick();
      if (voice) finish(voice);
    };
    synth.addEventListener("voiceschanged", onVoices);
    const timer = window.setTimeout(() => finish(pick()), timeoutMs);
    synth.getVoices();
  });
}
export function pickEnglishVoice(voices: readonly SpeechSynthesisVoice[]) { return pickVoice(voices, "en"); }
export function waitForEnglishVoice(synth: SpeechSynthesis, cancelled: () => boolean, timeoutMs = 2500) {
  return waitForVoice(synth, "en", cancelled, timeoutMs);
}

export const LISTENING_RATES = [0.75, 1, 1.25, 1.5] as const;

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

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

function englishRank(voice: SpeechSynthesisVoice): number | null {
  const lang = voice.lang.toLowerCase().replace("_", "-");
  const english = lang === "en-us" ? 0 : lang.startsWith("en") ? 2 : null;
  if (english == null) return null;
  const local = voice.localService ? 0 : 4;
  const multilingual = voice.name.toLowerCase().includes("multilingual") ? 1 : 0;
  return english + local + multilingual;
}

/** Prefer an installed en-US voice. Online English voices are used only when no local English voice exists. */
export function pickEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const voice of voices) {
    const rank = englishRank(voice);
    if (rank == null || rank >= bestRank) continue;
    best = voice;
    bestRank = rank;
  }
  return best;
}

/** Voices often arrive after the first getVoices() call. Do not speak before this resolves. */
export function waitForEnglishVoice(
  synth: SpeechSynthesis,
  isCancelled: () => boolean,
  timeoutMs = 2500,
): Promise<SpeechSynthesisVoice | null> {
  const pick = () => (isCancelled() ? null : pickEnglishVoice(synth.getVoices()));
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
      if (isCancelled()) {
        finish(null);
        return;
      }
      const voice = pickEnglishVoice(synth.getVoices());
      if (voice) finish(voice);
    };
    synth.addEventListener("voiceschanged", onVoices);
    const timer = window.setTimeout(() => {
      finish(pick());
    }, timeoutMs);
    synth.getVoices();
  });
}

export const LISTENING_RATES = [0.75, 1, 1.25, 1.5] as const;

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

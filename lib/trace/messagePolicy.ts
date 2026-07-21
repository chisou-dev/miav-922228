/**
 * Memory write/display policy for World Memory.
 * Firestore still stores the field as `message`; UI labels it Memory.
 * No external APIs — free-tier friendly.
 */

import {
  MAX_GUEST_MESSAGE_LENGTH,
  MAX_GOOGLE_MESSAGE_LENGTH,
  MESSAGE_PREVIEW_LENGTH,
} from "@/lib/trace/types";

/**
 * Static denylist (expand in place). Case-insensitive substring match
 * after whitespace normalization.
 */
const NG_WORDS = [
  "buy followers",
  "crypto giveaway",
  "nigerian prince",
  "無料で稼げる",
  "副業で月収",
  "今すぐ登録",
] as const;

const SCRIPT_OR_IFRAME =
  /<\s*(script|iframe|object|embed|link|meta|style)\b|javascript\s*:|data\s*:\s*text\s*\/\s*html|on[a-z]+\s*=/i;

/** External links / URL-like spam — Memories must stay offline text. */
const EXTERNAL_LINK =
  /https?:\/\/|www\.|\/\/[\w.-]+|[\w.-]+\.(com|net|org|io|co|jp|info|biz|xyz|app|dev)(\b|\/|:)/i;

export type MessagePolicyResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Strip markup to plain text; keep newlines. */
export function toPlainTextMemory(raw: string): string {
  let text = normalizeNewlines(raw);
  text = text.replace(/<[^>]*>/g, "");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&");
  return text.replace(/^\s+/, "").replace(/\s+$/, "");
}

function containsNgWord(message: string): boolean {
  const haystack = message.toLowerCase().replace(/\s+/g, " ");
  return NG_WORDS.some((word) => haystack.includes(word.toLowerCase()));
}

/** Cheap spam heuristics — no third-party services. */
function looksLikeSpam(message: string): boolean {
  if (/(.)\1{12,}/u.test(message)) return true;
  const lines = message.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 4) {
    const first = lines[0]!;
    if (lines.every((line) => line === first)) return true;
  }
  const letters = message.replace(/\s/g, "");
  if (letters.length >= 40) {
    const unique = new Set([...letters.toLowerCase()]).size;
    if (unique <= 3) return true;
  }
  return false;
}

/**
 * Validate + plain-text normalize a Memory for write paths.
 * Allows newlines; rejects HTML/script/iframe, external links, NG words, spam.
 */
export function normalizeTraceMessage(
  raw: unknown,
  maxLength = MAX_GOOGLE_MESSAGE_LENGTH,
): MessagePolicyResult {
  if (typeof raw !== "string") {
    return { ok: false, error: "Memory is required." };
  }

  const normalized = normalizeNewlines(raw);
  if (SCRIPT_OR_IFRAME.test(normalized)) {
    return {
      ok: false,
      error: "HTML, scripts, and embeds are not allowed in a Memory.",
    };
  }

  const message = toPlainTextMemory(normalized);
  if (!message) {
    return { ok: false, error: "Memory is required." };
  }
  if (message.length > maxLength) {
    return {
      ok: false,
      error: `Memory must be ${maxLength} characters or fewer.`,
    };
  }
  if (EXTERNAL_LINK.test(message)) {
    return {
      ok: false,
      error: "External links are not allowed in a Memory.",
    };
  }
  if (containsNgWord(message)) {
    return {
      ok: false,
      error: "Memory contains language that is not allowed.",
    };
  }
  if (looksLikeSpam(message)) {
    return { ok: false, error: "Memory looks like spam and was not saved." };
  }

  return { ok: true, message };
}

/** List preview — single line, ~20–50 chars. */
export function formatMessagePreview(
  message: string,
  max = MESSAGE_PREVIEW_LENGTH,
): string {
  const compact = toPlainTextMemory(message).replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trimEnd()}...`;
}

/** Detail card — plain text, newlines kept, capped at max length. */
export function formatMessageFull(
  message: string,
  maxLength = MAX_GOOGLE_MESSAGE_LENGTH,
): string {
  const text = toPlainTextMemory(message);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

export { MAX_GUEST_MESSAGE_LENGTH, MAX_GOOGLE_MESSAGE_LENGTH };

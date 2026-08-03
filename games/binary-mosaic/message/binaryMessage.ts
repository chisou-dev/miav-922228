/**
 * Binary Message — standalone text ↔ 8-bit ASCII binary helpers.
 * Independent of Core / Generator / Solver / Challenge Link / Share Code.
 * Not persisted (no localStorage).
 */

export const BINARY_MESSAGE_MAX_CHARS = 30;

export const BINARY_MESSAGE_ASCII_ERROR =
  "Use English letters, numbers, spaces, and standard symbols." as const;

export const BINARY_MESSAGE_MAX_ERROR = "Maximum 30 characters." as const;

export const BINARY_MESSAGE_INVALID_ERROR = "Invalid binary message." as const;

export const BINARY_MESSAGE_COPIED = "Binary copied." as const;

export const BINARY_MESSAGE_COPY_FAILED =
  "Copy failed. Please select and copy it manually." as const;

export const BINARY_MESSAGE_SHARE_COPIED =
  "Binary message copied.\nPaste it into LINE, X, Reddit, or another app." as const;

export const BINARY_MESSAGE_SHARE_TITLE = "Binary Message" as const;

export const BINARY_MESSAGE_DECODE_URL =
  "https://miav-games.vercel.app/game/binary-mosaic" as const;

/** Printable ASCII: A–Z a–z 0–9 space and common symbols (codes 32–126). */
export function isAllowedMessageChar(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return code >= 32 && code <= 126;
}

export function isAllowedMessageText(text: string): boolean {
  for (const ch of text) {
    if (!isAllowedMessageChar(ch)) return false;
  }
  return true;
}

export function remainingCharacters(text: string): number {
  return Math.max(0, BINARY_MESSAGE_MAX_CHARS - text.length);
}

export function remainingLabel(text: string): string {
  const n = remainingCharacters(text);
  return `${n} character${n === 1 ? "" : "s"} remaining`;
}

export type ValidateTextResult =
  | { ok: true; text: string }
  | { ok: false; error: typeof BINARY_MESSAGE_ASCII_ERROR | typeof BINARY_MESSAGE_MAX_ERROR };

/**
 * Validate proposed text input. Does not encode.
 * Rejects non-printable-ASCII and length over 30.
 */
export function validateMessageText(text: string): ValidateTextResult {
  if (text.length > BINARY_MESSAGE_MAX_CHARS) {
    return { ok: false, error: BINARY_MESSAGE_MAX_ERROR };
  }
  if (!isAllowedMessageText(text)) {
    return { ok: false, error: BINARY_MESSAGE_ASCII_ERROR };
  }
  return { ok: true, text };
}

/**
 * Encode each character to 8-bit ASCII binary, space-separated.
 * Empty input → null (do not convert).
 */
export function encodeMessageToBinary(text: string): string | null {
  if (text.length === 0) return null;
  const validated = validateMessageText(text);
  if (!validated.ok) return null;

  const bytes: string[] = [];
  for (const ch of validated.text) {
    const code = ch.charCodeAt(0);
    bytes.push(code.toString(2).padStart(8, "0"));
  }
  return bytes.join(" ");
}

export type DecodeBinaryResult =
  | { ok: true; text: string }
  | { ok: false; error: typeof BINARY_MESSAGE_INVALID_ERROR };

/**
 * Decode space/newline-separated 8-bit binary groups to printable ASCII (32–126).
 * Input may contain only 0, 1, spaces, and newlines (newlines are separators only).
 * Control characters and codes outside 32–126 are rejected.
 */
export function decodeBinaryToMessage(raw: string): DecodeBinaryResult {
  if (!raw.trim()) {
    return { ok: false, error: BINARY_MESSAGE_INVALID_ERROR };
  }

  for (const ch of raw) {
    if (ch !== "0" && ch !== "1" && ch !== " " && ch !== "\n" && ch !== "\r") {
      return { ok: false, error: BINARY_MESSAGE_INVALID_ERROR };
    }
  }

  const tokens = raw
    .trim()
    .split(/[\s\n\r]+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return { ok: false, error: BINARY_MESSAGE_INVALID_ERROR };
  }
  if (tokens.length > BINARY_MESSAGE_MAX_CHARS) {
    return { ok: false, error: BINARY_MESSAGE_INVALID_ERROR };
  }

  let text = "";
  for (const token of tokens) {
    if (token.length !== 8 || !/^[01]{8}$/.test(token)) {
      return { ok: false, error: BINARY_MESSAGE_INVALID_ERROR };
    }
    const code = Number.parseInt(token, 2);
    if (!Number.isFinite(code) || code < 32 || code > 126) {
      return { ok: false, error: BINARY_MESSAGE_INVALID_ERROR };
    }
    text += String.fromCharCode(code);
  }

  return { ok: true, text };
}

/** Share body for navigator.share / clipboard fallback. */
export function buildBinaryMessageShareText(binaryText: string): string {
  return [
    "Can you decode this message?",
    binaryText,
    "Decode it at:",
    BINARY_MESSAGE_DECODE_URL,
  ].join("\n");
}

export type ShareBinaryMessageOutcome =
  | { status: "shared" }
  | { status: "copied" }
  | { status: "aborted" }
  | { status: "failed" };

function canUseWebShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copyBinaryText(binaryText: string): Promise<boolean> {
  if (!binaryText) return false;
  return copyTextToClipboard(binaryText);
}

/**
 * Share via navigator.share when available; otherwise copy the share body.
 * Abort/cancel → aborted (no error UI).
 */
export async function shareOrCopyBinaryMessage(
  binaryText: string,
): Promise<ShareBinaryMessageOutcome> {
  if (!binaryText) return { status: "failed" };
  const body = buildBinaryMessageShareText(binaryText);

  if (canUseWebShare()) {
    try {
      await navigator.share({
        title: BINARY_MESSAGE_SHARE_TITLE,
        text: body,
      });
      return { status: "shared" };
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name?: string }).name === "AbortError"
      ) {
        return { status: "aborted" };
      }
      // Fall through to clipboard
    }
  }

  const copied = await copyTextToClipboard(body);
  return copied ? { status: "copied" } : { status: "failed" };
}

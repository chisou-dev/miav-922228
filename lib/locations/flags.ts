/**
 * Regional-indicator flag emoji from ISO 3166-1 alpha-2 (best-effort).
 * Unknown / non-2-letter codes return empty string.
 */
export function flagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (cc.charCodeAt(0) - 65),
    base + (cc.charCodeAt(1) - 65),
  );
}

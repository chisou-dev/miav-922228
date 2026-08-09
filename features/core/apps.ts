/**
 * MIAV site app listings (homepage APPS area).
 * Add entries here to show more apps — HomePage maps this list.
 * Set `url` when an app is published — UI switches Coming Soon → Open App.
 *
 * Privacy: outbound launch links only.
 * Never receive or store Writer Memo / だっけ？ personal data on this site.
 */
export type MiavApp = {
  id: string;
  name: string;
  /** English fallback — UI prefers `t(descriptionKey)` when available. */
  description: string;
  /** i18n catalog key for the description (e.g. "apps.writerMemo.description"). */
  descriptionKey?: string;
  /** Public URL when live; `null` keeps Coming Soon with no href. */
  url: string | null;
  accent?: "deep-sea";
};

/**
 * Production alias confirmed via `vercel inspect writer-memo.vercel.app`
 * → Aliases include https://writer-memo.vercel.app
 */
export const WRITER_MEMO_URL = "https://writer-memo.vercel.app";

export const MIAV_APPS: MiavApp[] = [
  {
    id: "writer-memo",
    name: "Writer Memo",
    description: "A simple, private memo app for writers.",
    descriptionKey: "apps.writerMemo.description",
    url: WRITER_MEMO_URL,
    accent: "deep-sea",
  },
];

export function isAppLive(app: MiavApp): boolean {
  return typeof app.url === "string" && app.url.length > 0;
}

export function appActionLabel(app: MiavApp): "Open App" | "Coming Soon" {
  return isAppLive(app) ? "Open App" : "Coming Soon";
}

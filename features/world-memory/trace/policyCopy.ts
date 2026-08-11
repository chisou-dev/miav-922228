/**
 * Shared policy copy helper for Trace Map (Welcome dialog).
 * Text itself lives in the i18n message catalogs (`world.welcome*` keys) —
 * this module only assembles the paragraph/bullet/closing shape from `t()`.
 * (Privacy / Site Policy page copy and the Google dialog now call `t()`
 * directly at their call sites — see `world.*` keys in the catalogs.)
 */
import type { MessageKey, TVars } from "@/features/shared/i18n";

export const WELCOME_STORAGE_KEY = "miav_world_map_welcome_seen";

type Translate = (key: MessageKey | string, vars?: TVars) => string;

export function getWelcomeDialogBody(t: Translate) {
  return {
    paragraphs: [
      t("world.welcomeLeaveTrace"),
      t("world.welcomeNotAnalytics"),
      t("world.welcomeQuietRecord"),
      t("world.welcomeOneTraceOnly"),
      t("world.welcomeMarkThatYouWereHere"),
      t("world.welcomeGoogleIdentify"),
      t("world.privacyBlurbNoInfo"),
      t("world.noEdit"),
      t("world.responsibility"),
      t("world.welcomeRemovalIntro"),
    ],
    bullets: [
      t("world.welcomeBulletLaw"),
      t("world.welcomeBulletSpam"),
      t("world.welcomeBulletPolicy"),
    ],
    closing: [t("world.welcomeClosingNotSocial"), t("world.welcomeClosingQuietPlace")],
  };
}

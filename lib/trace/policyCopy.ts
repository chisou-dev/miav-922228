/**
 * Shared policy copy for Trace Map
 * (Welcome / Google dialog / Privacy / Site Policy).
 */

export const WELCOME_STORAGE_KEY = "miav_world_map_welcome_seen";

export const TRACE_PRIVACY_BLURB = [
  "Google Sign-In is used only to identify your Trace.",
  "No personal information is stored.",
  "Only you can edit your Trace.",
  "The site does not edit user content.",
] as const;

export const WELCOME_DIALOG = {
  title: "Welcome to MIAV World Map",
  body: {
    paragraphs: [
      "Leave a single Trace in the world of MIAV-922228.",
      "This is not analytics.",
      "It is a quiet record of readers who have visited this world.",
      "Each visitor may leave only one Trace.",
      "Temporary Traces disappear after three months.",
      "Permanent Traces remain.",
      "Google Sign-In is used only to identify the owner of a Trace.",
      "No personal information is stored.",
      "The operator does not edit user content.",
      "Users are responsible for the content they submit.",
      "Content may be removed only if it:",
    ],
    bullets: [
      "violates the law",
      "contains spam",
      "violates the Site Policy",
    ],
    closing: [
      "This is not a social network.",
      "It is simply a quiet place where readers leave a Trace.",
    ],
  },
} as const;

export const GOOGLE_SIGNIN_DIALOG = {
  title: "Confirm Google Sign-In",
  intro:
    "Google Sign-In is used only to identify the owner of your Trace.",
  doesNotStoreHeading: "This website does NOT store your:",
  doesNotStore: [
    "Email address",
    "Name",
    "Profile photo",
    "Google account information",
  ] as const,
  uidNote:
    "Only an anonymous Firebase UID is stored so that only you can edit your Trace.",
  neverAccess: "The site never accesses your Google data.",
  responsibility: "Users are responsible for the content they submit.",
  noEdit: "The operator does not edit user content.",
  removal:
    "Content may be removed only if it violates the law, contains spam, or violates the Site Policy.",
} as const;

export const PRIVACY_PAGE_PARAGRAPHS = [
  "Google Sign-In is used only to identify the owner of a Trace.",
  "No personal information is stored.",
  "Email, display name, profile photo, and Google account information are never stored.",
  "Only a Firebase UID is stored so that only you can edit your Trace.",
  "Google account data is never accessed.",
  "Your Trace belongs to you.",
  "The site provides a place for readers to leave a Trace, but does not edit user content.",
  "Users are responsible for the content they submit.",
  "The operator may remove content only when it violates the law, contains spam, or violates the Site Policy.",
  "This is not a social network.",
  "It is a quiet literary space where readers leave a single Trace.",
] as const;

export const SITE_POLICY_PAGE = {
  intro: "MIAV World Map is a place where readers leave a Trace.",
  paragraphs: [
    "Each Trace belongs to its owner.",
    "The operator provides the place but does not edit user content.",
    "Users are responsible for the content they submit.",
  ] as const,
  removeHeading: "The operator may remove content only when:",
  removeReasons: [
    "it violates the law",
    "it contains spam",
    "it violates the Site Policy",
  ] as const,
  googleNote:
    "Google Sign-In is used only to identify the owner of a Trace.",
  noPii: "No personal information is stored.",
  noGoogleProfile:
    "The website does not store your email address, name, profile photo, or any other Google account information.",
  uidOnly:
    "Only a Firebase UID is stored so that only you can edit your Trace.",
  closing: [
    "This is not a social network.",
    "It is a quiet literary space where readers leave a single Trace.",
  ] as const,
} as const;

/**
 * Shared policy copy for Trace Map (Privacy / Site Policy / Google dialog).
 */

export const TRACE_PRIVACY_BLURB = [
  "Google Sign-In is used only to identify your Trace.",
  "No personal information is stored.",
  "Only you can edit your Trace.",
  "The site does not edit user content.",
] as const;

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
  responsibility: "Your Trace is your responsibility.",
  noEdit: "The operator does not edit user content.",
  removal:
    "Content may be removed only if it violates the law or the site's rules.",
  agreeLabel:
    "I have read and agree to the Privacy Policy and Site Policy.",
} as const;

export const PRIVACY_PAGE_PARAGRAPHS = [
  "MIAV World Map uses Google Sign-In only to identify the owner of a Trace.",
  "This website does not store your email address, name, profile photo, or other Google account information.",
  "Only an anonymous Firebase UID is stored so that only you can edit your Trace.",
  "Google account data is never accessed.",
  "Your Trace belongs to you.",
  "The site provides a place for readers to leave a Trace, but does not edit user content.",
  "The operator may remove content only when required by law or when it violates the site's rules.",
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
    "it violates the site rules",
  ] as const,
  googleNote:
    "Google Sign-In is used only to identify the owner of a Trace.",
  noPii: "No personal information is stored.",
} as const;

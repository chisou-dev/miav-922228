/**
 * English UI message catalog — source of truth for meaning and key set.
 * `MessageKey` (see ../types.ts) is derived from this file's keys.
 * Keep keys flat and dotted; add new keys here first, then mirror in fr/es.
 */
export const en = {
  // nav / shell
  "nav.home": "Home",
  "nav.world": "MIAV World",
  "nav.works": "Works",
  "nav.game": "Game",
  "nav.apps": "Apps",
  "nav.about": "About",
  "nav.chapters": "Chapters",
  "nav.books": "Books",
  "nav.contact": "Contact",
  "nav.primaryAria": "Primary",
  "nav.siteAria": "Site",
  "shell.openSidebar": "Open sidebar",
  "shell.closeSidebar": "Close sidebar",
  "shell.collapseSidebar": "Collapse sidebar",
  "footer.privacy": "Privacy",
  "footer.sitePolicy": "Site Policy",

  // language
  "lang.menuAria": "Language",
  "lang.currentLabel": "Language: English",
  "lang.en": "English",
  "lang.fr": "Français",
  "lang.es": "Español",
  "lang.switchTo": "Switch to {language}",

  // home hero
  "home.brand": "MIAV-922228",
  "home.tagline": "READ. PLAY. LEAVE A TRACE.",
  "home.lead":
    "Stories, browser games, and digital experiments from one literary science fiction project—exploring memory, artificial intelligence, technology, loneliness, and human existence.",
  "home.ctaStart": "START HERE",
  "home.ctaStories": "READ STORIES",
  "home.ctaGames": "PLAY GAMES",
  "home.introAria": "Introduction",

  // start here
  "home.startTitle": "START HERE",
  "home.readTitle": "READ",
  "home.readBody":
    "Short speculative fiction about memory, technology, and human existence.",
  "home.readEnter": "Enter Works",
  "home.readChapters": "Chapters",
  "home.readBooks": "Books",
  "home.playTitle": "PLAY",
  "home.playBody":
    "Browser games built around logic, discovery, and strange digital worlds.",
  "home.playEnter": "Enter Games",
  "home.appsTitle": "APPS",
  "home.appsBody": "Quiet tools for catching ideas before they disappear.",
  "home.appsView": "View Apps",
  "home.traceTitle": "LEAVE A TRACE",
  "home.traceBody":
    "Add a small memory to MIAV World and become part of its growing map.",
  "home.traceOpen": "Open MIAV World",

  // featured
  "home.featuredTitle": "FEATURED NOW",
  "home.featured.readEyebrow": "READ",
  "home.featured.afterRainTitle": "After the Rain",
  "home.featured.afterRainBody":
    "A stranger beneath a bookshop awning remembers the hill differently.",
  "home.featured.afterRainMeta": "About 2 minutes",
  "home.featured.readCta": "Read →",
  "home.featured.playEyebrow": "PLAY",
  "home.featured.binaryTitle": "Binary Block",
  "home.featured.binaryBody":
    "A logic puzzle about shape, rotation, and hidden structure.",
  "home.featured.binaryMeta": "Play in your browser",
  "home.featured.playCta": "Play →",
  "home.featured.appsEyebrow": "APPS",
  "home.featured.traceEyebrow": "LEAVE A TRACE",
  "home.featured.worldTitle": "MIAV World",
  "home.featured.worldBody":
    "Add one small memory to a growing map of human traces.",
  "home.featured.worldMeta": "Join the map",
  "home.featured.traceCta": "Enter →",

  // apps
  "apps.openApp": "Open App",
  "apps.comingSoon": "Coming Soon",
  "apps.eyebrow": "APP",
  "apps.writerMemo.description": "A simple, private memo app for writers.",

  // about / contact (home sections)
  "home.aboutTitle": "About MIAV",
  "home.aboutBody":
    "MIAV is an independent literary science fiction project bringing together stories, browser games, and digital experiments. Across fiction and interactive works, it explores memory, artificial intelligence, loneliness, technology, and human existence.",
  "home.contactTitle": "Contact",
  "home.contactBody":
    "For inquiries regarding the project, publications, or press, please get in touch.",
  "home.contactCta": "Write a message",

  // about / contact pages
  "about.pageTitle": "About MIAV",
  "about.worksHeading": "Works",
  "contact.eyebrow": "CONTACT",
  "contact.title": "Contact",
  "contact.intro":
    "For inquiries regarding the project, publications, or press, please get in touch.",
  "contact.name": "Name",
  "contact.email": "Email",
  "contact.message": "Message",
  "contact.send": "Send message",
  "contact.sending": "Sending…",
  "contact.success": "Your message has been received. Thank you for writing.",
  "contact.errorGeneric": "Unable to send the message.",
  "contact.errorRateLimit":
    "Too many messages were sent. Please wait a moment and try again.",
  "contact.disabled": "Contact is temporarily unavailable.",
  "contact.website": "Website",

  // reader memory
  "reader.greetingFirst": "Hello.\nWelcome to {title}.",
  "reader.greetingBack": "Welcome back.",
  "reader.greetingRecent": "It's good to see you again.",
  "reader.greetingLongAgo": "It's been a while.\nWelcome back.",
  "reader.firstVisit.one": "You first visited\n{days} day ago.",
  "reader.firstVisit.other": "You first visited\n{days} days ago.",
  "reader.chaptersRead.one": "You've read\n{count} chapter.",
  "reader.chaptersRead.other": "You've read\n{count} chapters.",
  "reader.traceLeft": "Your trace is still there.",
  "reader.traceInvite": "One day,\nleave your trace on the map.",

  // world-map / MIAV World
  "world.title": "MIAV World",
  "world.subtitle": "Reader footprints left around the world — city by city.",
  "world.leaveMemory": "Leave a Memory",
  "world.writeMemory": "Write a Memory",
  "world.signIn": "Sign in",
  "world.signOut": "Sign out",
  "world.privacy": "Privacy",
  "world.sitePolicy": "Site Policy",
  "world.returnToWorld": "Return to MIAV World",
  "world.permanentMemory": "Permanent Memory",
  "world.temporaryMemory": "Temporary Memory",
  "world.verifiedGoogle": "Verified with Google",
  "world.mapHelp":
    "Stars mark places where readers left a Memory. Click a star to read them — no GPS, no address.",
  "world.loadingMap": "Unfolding the map…",
  "world.gathering": "Gathering…",
  "world.archive": "Trace archive",
  "world.latestMemory": "Latest Memory",
  "world.noMemories": "No Memories yet.",
  "world.saving": "Saving…",
  "world.cancel": "Cancel",
  "world.close": "Close",
  "world.welcomeUnderstand": "I Understand",
  "world.selectMemory": "Selected: {city}, {country}",
  "world.previousMemory": "Previous memory",
  "world.nextMemory": "Next memory",
  "world.place": "Place",
  "world.placeContinent": "Continent",
  "world.placeCountry": "Country",
  "world.placeRegion": "Region",
  "world.placeCity": "City",
  "world.chooseContinent": "Choose a continent",
  "world.chooseCountry": "Choose a country",
  "world.chooseRegion": "Choose a region",
  "world.loadingRegions": "Loading…",
  "world.noRegions": "No regions",
  "world.choosePlaceFirst":
    "Choose a continent, country, region, and city first.",
  "world.writeMemoryFirst": "Write a short Memory before saving.",
  "world.saveError": "Unable to save Memory.",
  "world.memoryLabel": "Memory ({current}/{max})",
  "world.guestLabel": "· Guest · up to {max}",
  "world.googleLabel": "· Permanent · up to {max}",
  "world.memoryPlaceholder": "A quiet note that you read here…",
  "world.continueToPermanent": "Continue to Permanent Memory",
  "world.temporaryMemorySaved": "Your Temporary Memory has been saved.",
  "world.temporaryCannotEdit": "Temporary Memories cannot be edited.",
  "world.permanentMemorySaved": "Your Permanent Memory has been saved.",
  "world.editingUnavailable": "Editing is not available.",
  "world.charactersAvailable": "{count} characters available",
  "world.memoryKindHint":
    "Temporary Memories are anonymous.\nPermanent Memories stay with your account.",
  "world.miavId": "MIAV ID",
  "world.copyId": "Copy {id}",
  "world.copied": "Copied!",
  "world.presenceTitle": "Presence",
  "world.presenceBody":
    "Quiet footprints on the map. City-level only — never your exact location.",
  "world.placesWithMemories": "Places with Memories",
  "world.totalMemories": "Total Memories",
  "world.permanentMemories": "Permanent Memories",
  "world.guestMemories": "Guest Memories",
  "world.traceDisabled": "Trace registration is temporarily unavailable.",
  "world.privacyBlurbSignIn":
    "Google Sign-In is used only to identify your Trace.",
  "world.privacyBlurbNoInfo": "No personal information is stored.",
  "world.privacyBlurbEditOnlyYou": "Only you can edit your Trace.",
  "world.privacyBlurbNoEditContent": "The site does not edit user content.",
  "world.welcomeTitle": "Welcome to MIAV World",
  "world.welcomeEyebrow": "Entrance",
  "world.welcomeAgreePrefix": "I have read and understand the",
  "world.privacyPolicyLabel": "Privacy Policy",
  "world.agreeAnd": "and",
  "world.agreePrivacyPrefix": "I have read and agree to the",
  "world.googleDialogTitle": "Continue to Permanent Memory",
  "world.googleDialogEyebrow": "Authentication",
  "world.googleDialogIntro":
    "Verification is used only to identify the owner of your Permanent Memory. Google account details are never shown or stored.",
  "world.googleDoesNotStoreHeading": "This website does NOT store your:",
  "world.googleDoesNotStoreEmail": "Email address",
  "world.googleDoesNotStoreName": "Name",
  "world.googleDoesNotStorePhoto": "Profile photo",
  "world.googleDoesNotStoreAccount": "Google account information",
  "world.googleUidNote":
    "Only an anonymous Firebase UID is stored so that only you can keep your Memory.",
  "world.googleNeverAccess": "The site never accesses your Google data.",
  "world.responsibility": "Users are responsible for the content they leave.",
  "world.noEdit": "The operator does not edit user content.",
  "world.removal":
    "Content may be removed only if it violates the law, contains spam, or violates the Site Policy.",
  "world.continuing": "Continuing…",
  "world.navAria": "MIAV World links",
  "world.memoryFieldLabel": "Memory",
  "world.leftAt": "Left",
  "world.yourStatus": "Your Status",
  "world.composerHelpGoogle":
    "Choose a continent, then a country, then a city. Permanent Memory — up to {max} characters.",
  "world.composerHelpGuest":
    "Choose a continent, then a country, then a city. No login required — up to {max} characters.",
  "world.welcomeLeaveTrace": "Leave a single Trace in the world of MIAV-922228.",
  "world.welcomeNotAnalytics": "This is not analytics.",
  "world.welcomeQuietRecord":
    "It is a quiet record of readers who have visited this world.",
  "world.welcomeOneTraceOnly": "Each visitor may leave only one Trace.",
  "world.welcomeMarkThatYouWereHere":
    "A Trace is simply a mark that you were here.",
  "world.welcomeTemporaryExpiry": "Temporary Traces disappear after three months.",
  "world.welcomePermanentRemain": "Permanent Traces remain.",
  "world.welcomeGoogleIdentify":
    "Google Sign-In is used only to identify the owner of a Trace.",
  "world.welcomeRemovalIntro": "Content may be removed only if it:",
  "world.welcomeBulletLaw": "violates the law",
  "world.welcomeBulletSpam": "contains spam",
  "world.welcomeBulletPolicy": "violates the Site Policy",
  "world.welcomeClosingNotSocial": "This is not a social network.",
  "world.welcomeClosingQuietPlace":
    "It is simply a quiet place where readers leave a Trace.",
  "world.privacyNoProfileFields":
    "Email, display name, profile photo, and Google account information are never stored.",
  "world.privacyUidOnlyEdit":
    "Only a Firebase UID is stored so that only you can edit your Trace.",
  "world.privacyTraceBelongsToYou": "Your Trace belongs to you.",
  "world.privacySiteProvidesPlace":
    "The site provides a place for readers to leave a Trace, but does not edit user content.",
  "world.privacyQuietLiterarySpace":
    "It is a quiet literary space where readers leave a single Trace.",
  "world.privacyStoresOnly":
    "MIAV World stores only: Firebase UID, MIAV ID, auth type, location, message, and timestamps. Temporary (anonymous) traces also carry an expiry time.",
  "world.sitePolicyIntro": "MIAV World is a place where readers leave a Trace.",
  "world.sitePolicyTraceBelongsToOwner": "Each Trace belongs to its owner.",
  "world.sitePolicyProvidesPlace":
    "The operator provides the place but does not edit user content.",
  "world.sitePolicyRemoveHeading": "The operator may remove content only when:",
  "world.sitePolicyReasonLaw": "it violates the law",
  "world.sitePolicyReasonSpam": "it contains spam",
  "world.sitePolicyReasonPolicy": "it violates the Site Policy",
  "world.sitePolicyNoGoogleProfile":
    "The website does not store your email address, name, profile photo, or any other Google account information.",

  // common
  "common.loading": "Loading…",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.unknown": "Unknown",
  "common.error": "Something went wrong.",
  "common.retry": "Try again",
} as const;

export default en;

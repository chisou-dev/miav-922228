import type { MessageCatalog } from "../types";

/**
 * French UI message catalog. Mirrors the key set of `en.ts` exactly.
 * Native French web copy — not a literal translation of the English.
 */
export const fr: MessageCatalog = {
  // nav / shell
  "nav.home": "Accueil",
  "nav.world": "MIAV World",
  "nav.works": "Œuvres",
  "nav.game": "Jeu",
  "nav.apps": "Applications",
  "nav.about": "À propos",
  "nav.chapters": "Chapitres",
  "nav.books": "Livres",
  "nav.contact": "Contact",
  "nav.signals": "Mes Signals",
  "nav.myMiav": "My MIAV",
  "nav.primaryAria": "Principal",
  "nav.siteAria": "Site",
  "shell.openSidebar": "Ouvrir le menu",
  "shell.closeSidebar": "Fermer le menu",
  "shell.collapseSidebar": "Réduire le menu",
  "footer.privacy": "Confidentialité",
  "footer.sitePolicy": "Règles du site",

  // language
  "lang.menuAria": "Langue",
  "lang.currentLabel": "Langue : français",
  "lang.en": "English",
  "lang.fr": "Français",
  "lang.es": "Español",
  "lang.switchTo": "Passer à {language}",

  // home hero
  "home.brand": "MIAV-922228",
  "home.tagline": "LIRE. JOUER. LAISSER UNE TRACE.",
  "home.lead":
    "Des histoires, des jeux dans le navigateur et des expériences numériques issus d'un même projet de science-fiction littéraire—explorant la mémoire, l'intelligence artificielle, la technologie, la solitude et l'existence humaine.",
  "home.ctaStart": "COMMENCER ICI",
  "home.ctaStories": "LIRE LES HISTOIRES",
  "home.ctaGames": "JOUER AUX JEUX",
  "home.introAria": "Introduction",

  // start here
  "home.startTitle": "COMMENCER ICI",
  "home.readTitle": "LIRE",
  "home.readBody":
    "De courtes fictions spéculatives sur la mémoire, la technologie et l'existence humaine.",
  "home.readEnter": "Entrer dans les œuvres",
  "home.readChapters": "Chapitres",
  "home.readBooks": "Livres",
  "home.playTitle": "JOUER",
  "home.playBody":
    "Des jeux de navigateur construits autour de la logique, de la découverte et de mondes numériques étranges.",
  "home.playEnter": "Entrer dans les jeux",
  "home.appsTitle": "APPLICATIONS",
  "home.appsBody":
    "Des outils discrets pour saisir les idées avant qu'elles ne disparaissent.",
  "home.appsView": "Voir les applications",
  "home.traceTitle": "LAISSER UNE TRACE",
  "home.traceBody":
    "Ajoutez un petit souvenir à MIAV World et devenez partie de sa carte grandissante.",
  "home.traceOpen": "Ouvrir MIAV World",

  // featured
  "home.featuredTitle": "EN VEDETTE",
  "home.featured.readEyebrow": "LIRE",
  "home.featured.afterRainTitle": "After the Rain",
  "home.featured.afterRainBody":
    "Un inconnu sous l'auvent d'une librairie se souvient de la colline autrement.",
  "home.featured.afterRainMeta": "Environ 2 minutes",
  "home.featured.readCta": "Lire →",
  "home.featured.playEyebrow": "JOUER",
  "home.featured.binaryTitle": "Binary Block",
  "home.featured.binaryBody":
    "Un casse-tête logique autour des formes, de la rotation et d'une structure cachée.",
  "home.featured.binaryMeta": "Jouez dans votre navigateur",
  "home.featured.playCta": "Jouer →",
  "home.featured.appsEyebrow": "APPLICATIONS",
  "home.featured.traceEyebrow": "LAISSER UNE TRACE",
  "home.featured.worldTitle": "MIAV World",
  "home.featured.worldBody":
    "Ajoutez un seul petit souvenir à une carte grandissante de traces humaines.",
  "home.featured.worldMeta": "Rejoindre la carte",
  "home.featured.traceCta": "Entrer →",

  "home.cosmic.writerMemo": "WRITER MEMO",
  "home.cosmic.handy": "UTILE",
  "home.cosmic.miavWorld": "MIAV WORLD",

  // apps
  "apps.openApp": "Ouvrir l'application",
  "apps.comingSoon": "Bientôt disponible",
  "apps.eyebrow": "APPLICATION",
  "apps.writerMemo.description":
    "Une application de notes simple et privée pour les écrivains.",

  // about / contact (home sections)
  "home.aboutTitle": "À propos de MIAV",
  "home.aboutBody":
    "MIAV est un projet indépendant de science-fiction littéraire qui réunit histoires, jeux de navigateur et expériences numériques. À travers la fiction et les œuvres interactives, il explore la mémoire, l'intelligence artificielle, la solitude, la technologie et l'existence humaine.",
  "home.contactTitle": "Contact",
  "home.contactBody":
    "Pour toute question sur le projet, les publications ou la presse, n'hésitez pas à nous écrire.",
  "home.contactCta": "Écrire un message",

  // about / contact pages
  "about.pageTitle": "À propos de MIAV",
  "about.worksHeading": "Œuvres",
  "contact.eyebrow": "CONTACT",
  "contact.title": "Contact",
  "contact.intro":
    "Pour toute question sur le projet, les publications ou la presse, n'hésitez pas à nous écrire.",
  "contact.name": "Nom",
  "contact.email": "E-mail",
  "contact.message": "Message",
  "contact.send": "Envoyer le message",
  "contact.sending": "Envoi…",
  "contact.success": "Votre message a bien été reçu. Merci de nous avoir écrit.",
  "contact.errorGeneric": "Impossible d'envoyer le message.",
  "contact.errorRateLimit":
    "Trop de messages ont été envoyés. Merci de patienter un instant avant de réessayer.",
  "contact.disabled": "Le contact est temporairement indisponible.",
  "contact.website": "Site web",

  // reader memory
  "reader.greetingFirst": "Bonjour.\nBienvenue dans {title}.",
  "reader.greetingBack": "Bon retour.",
  "reader.greetingRecent": "C'est bon de vous revoir.",
  "reader.greetingLongAgo": "Cela faisait longtemps.\nBon retour.",
  "reader.firstVisit.one": "Votre première visite\nremonte à {days} jour.",
  "reader.firstVisit.other": "Votre première visite\nremonte à {days} jours.",
  "reader.chaptersRead.one": "Vous avez lu\n{count} chapitre.",
  "reader.chaptersRead.other": "Vous avez lu\n{count} chapitres.",
  "reader.traceLeft": "Votre trace est toujours là.",
  "reader.traceInvite": "Un jour,\nlaissez votre trace sur la carte.",

  // world-map / MIAV World
  "world.title": "MIAV World",
  "world.subtitle":
    "Des empreintes de lecteurs laissées à travers le monde — ville par ville.",
  "world.leaveMemory": "Laisser un souvenir",
  "world.writeMemory": "Écrire un souvenir",
  "world.signIn": "Se connecter",
  "world.signOut": "Se déconnecter",
  "world.privacy": "Confidentialité",
  "world.sitePolicy": "Règles du site",
  "world.returnToWorld": "Retour à MIAV World",
  "world.yourMemory": "Votre souvenir",
  "world.verifiedGoogle": "Vérifié avec Google",
  "world.mapHelp":
    "Les étoiles marquent les lieux où des lecteurs ont laissé un souvenir. Cliquez sur une étoile pour les lire — pas de GPS, pas d'adresse.",
  "world.mapHelpGeo":
    "Pays, régions et villes rassemblent les Memories par READ, PLAY et APPS. Touchez un groupe pour le détail — pas de GPS, pas d'adresse.",
  "world.earlierOnMapNote":
    "Les Earlier Memories sans catégorie restent dans les archives — elles ne sont pas mêlées à READ / PLAY / APPS.",
  "world.filterCategoriesAria": "Filtrer la carte par catégorie",
  "world.legendAria": "Couleurs des catégories",
  "world.filterEmpty": "Sélectionnez au moins READ, PLAY ou APPS pour afficher la carte.",
  "world.backToWorld": "← Monde",
  "world.backToCountry": "← {country}",
  "world.scopeWorld": "Monde",
  "world.mapScope": "Portée de la carte",
  "world.openCountry": "Ouvrir le pays",
  "world.openRegion": "Ouvrir la région",
  "world.viewMemories": "Voir les Memories",
  "world.personCount": "{count} personne",
  "world.peopleCount": "{count} personnes",
  "world.activityCountOne": "{count} activité",
  "world.activityCountMany": "{count} activités",
  "world.geoMarkerAria":
    "{label} : {people} personnes, {activities} activités. Catégories : {categories}",
  "world.loadingMap": "Déploiement de la carte…",
  "world.gathering": "Rassemblement…",
  "world.archive": "Archives des traces",
  "world.latestMemory": "Dernier souvenir",
  "world.noMemories": "Pas encore de souvenirs.",
  "world.saving": "Enregistrement…",
  "world.cancel": "Annuler",
  "world.close": "Fermer",
  "world.welcomeUnderstand": "J'ai compris",
  "world.selectMemory": "Sélection : {city}, {country}",
  "world.previousMemory": "Souvenir précédent",
  "world.nextMemory": "Souvenir suivant",
  "world.place": "Lieu",
  "world.placeContinent": "Continent",
  "world.placeCountry": "Pays",
  "world.placeRegion": "Région",
  "world.placeCity": "Ville",
  "world.chooseContinent": "Choisissez un continent",
  "world.chooseCountry": "Choisissez un pays",
  "world.chooseRegion": "Choisissez une région",
  "world.loadingRegions": "Chargement…",
  "world.noRegions": "Aucune région",
  "world.choosePlaceFirst":
    "Choisissez d'abord un continent, un pays, une région et une ville.",
  "world.writeMemoryFirst": "Écrivez un court souvenir avant d'enregistrer.",
  "world.saveError": "Impossible d'enregistrer le souvenir.",
  "world.memoryLabel": "Souvenir ({current}/{max})",
  "world.memoryPlaceholder": "Un mot discret pour dire que vous êtes passé ici…",
  "world.signInWithGoogle": "Se connecter avec Google",
  "world.signInRequired":
    "La connexion Google est requise pour laisser un souvenir.",
  "world.signInToLeave": "Connectez-vous pour laisser un souvenir",
  "world.signInToLeaveHelp":
    "Vous pouvez choisir un lieu et écrire d'abord. La connexion Google n'est demandée qu'au moment d'enregistrer.",
  "world.readyToLeave": "Prêt à laisser un souvenir",
  "world.memorySaved": "Votre souvenir a été enregistré.",
  "world.writeMemorySignIn": "Se connecter et écrire",
  "world.editingUnavailable": "La modification n'est pas disponible.",
  "world.charactersAvailable": "{count} caractères disponibles",
  "world.miavId": "MIAV ID",
  "world.miavIdHint":
    "L'identifiant public attribué à votre Trace dans MIAV World.",
  "world.copyId": "Copier {id}",
  "world.copied": "Copié !",
  "world.presenceTitle": "Présence",
  "world.presenceBody":
    "De discrètes empreintes sur la carte. À l'échelle de la ville seulement — jamais votre position exacte.",
  "world.placesWithMemories": "Lieux avec des souvenirs",
  "world.totalMemories": "Total des souvenirs",
  "world.permanentMemories": "Souvenirs de compte",
  "world.earlierMemories": "Souvenirs antérieurs",
  "world.traceDisabled":
    "L'enregistrement des traces est temporairement indisponible.",
  "world.privacyBlurbSignIn":
    "La connexion Google sert uniquement à identifier votre trace.",
  "world.privacyBlurbNoInfo": "Aucune information personnelle n'est conservée.",
  "world.privacyBlurbNoEditContent":
    "Le site ne modifie pas le contenu des utilisateurs.",
  "world.welcomeTitle": "Bienvenue dans MIAV World",
  "world.welcomeEyebrow": "Entrée",
  "world.welcomeAgreePrefix": "J'ai lu et je comprends la",
  "world.privacyPolicyLabel": "Politique de confidentialité",
  "world.agreeAnd": "et les",
  "world.agreePrivacyPrefix": "J'ai lu et j'accepte la",
  "world.googleDialogTitle": "Se connecter pour laisser un souvenir",
  "world.googleDialogEyebrow": "Authentification",
  "world.googleDialogIntro":
    "La vérification sert uniquement à identifier le propriétaire de votre souvenir. Les informations de votre compte Google ne sont jamais affichées ni conservées.",
  "world.googleDoesNotStoreHeading": "Ce site ne conserve PAS vos :",
  "world.googleDoesNotStoreEmail": "Adresse e-mail",
  "world.googleDoesNotStoreName": "Nom",
  "world.googleDoesNotStorePhoto": "Photo de profil",
  "world.googleDoesNotStoreAccount": "Informations de compte Google",
  "world.googleUidNote":
    "Un identifiant de compte privé est conservé afin que vous seul puissiez garder votre souvenir.",
  "world.googleNeverAccess": "Le site n'accède jamais à vos données Google.",
  "world.responsibility":
    "Les utilisateurs sont responsables du contenu qu'ils publient.",
  "world.noEdit": "L'exploitant ne modifie pas le contenu des utilisateurs.",
  "world.removal":
    "Le contenu ne peut être retiré que s'il viole la loi, contient du spam, ou viole les règles du site.",
  "world.continuing": "Continuation…",
  "world.navAria": "Liens de MIAV World",
  "world.memoryFieldLabel": "Souvenir",
  "world.leftAt": "Laissé",
  "world.yourStatus": "Votre statut",
  "world.composerHelp":
    "Choisissez ce qui vous a amené ici, puis un lieu et un court souvenir. Jusqu'à {max} caractères. La connexion Google est requise pour enregistrer.",
  "world.whatBroughtYou": "Qu'est-ce qui vous a amené ici ?",
  "world.chooseWork": "Choisissez une œuvre",
  "world.chooseCategoryFirst": "Choisissez d'abord READ, PLAY ou APPS.",
  "world.alreadyLeftForWork": "Vous avez déjà laissé un souvenir pour cette œuvre.",
  "world.alreadyLeftShort": "déjà laissé",
  "world.worksAlreadyLeft":
    "{count} œuvre(s) déjà enregistrée(s) sous votre MIAV ID.",
  "world.moreWorksAvailable":
    "Vous pouvez laisser un autre souvenir pour une œuvre différente.",
  "world.allWorksLeft":
    "Vous avez déjà laissé un souvenir pour chaque œuvre disponible.",
  "world.origin": "Origine",
  "world.category.read": "READ",
  "world.category.play": "PLAY",
  "world.category.apps": "APPS",
  "world.welcomeLeaveTrace": "Laissez une seule trace dans le monde de MIAV-922228.",
  "world.welcomeNotAnalytics": "Ceci n'est pas de l'analytique.",
  "world.welcomeQuietRecord":
    "C'est un registre discret des lecteurs qui ont visité ce monde.",
  "world.welcomeOneTraceOnly": "Chaque visiteur ne peut laisser qu'une seule trace.",
  "world.welcomeMarkThatYouWereHere":
    "Une trace est simplement une marque de votre passage.",
  "world.welcomeGoogleIdentify":
    "La connexion Google sert uniquement à identifier le propriétaire d'une trace. Consulter la carte ne nécessite pas de connexion.",
  "world.welcomeRemovalIntro": "Le contenu peut être retiré uniquement s'il :",
  "world.welcomeBulletLaw": "viole la loi",
  "world.welcomeBulletSpam": "contient du spam",
  "world.welcomeBulletPolicy": "viole les règles du site",
  "world.welcomeClosingNotSocial": "Ceci n'est pas un réseau social.",
  "world.welcomeClosingQuietPlace":
    "C'est simplement un lieu discret où les lecteurs laissent une trace.",
  "world.privacyNoProfileFields":
    "L'e-mail, le nom affiché, la photo de profil et les informations de compte Google ne sont jamais conservés.",
  "world.privacyUidOnlyEdit":
    "Un identifiant de compte privé est conservé afin que vous seul puissiez garder votre trace.",
  "world.privacyTraceBelongsToYou": "Votre trace vous appartient.",
  "world.privacySiteProvidesPlace":
    "Le site offre un espace où les lecteurs peuvent laisser une trace, mais ne modifie pas le contenu des utilisateurs.",
  "world.privacyQuietLiterarySpace":
    "C'est un espace littéraire discret où les lecteurs laissent une seule trace.",
  "world.privacyStoresOnly":
    "MIAV World conserve uniquement : un identifiant de compte privé, l'identifiant MIAV, le type de connexion, le lieu, le message et les horodatages.",
  "world.sitePolicyIntro": "MIAV World est un lieu où les lecteurs laissent une trace.",
  "world.sitePolicyTraceBelongsToOwner": "Chaque trace appartient à son propriétaire.",
  "world.sitePolicyProvidesPlace":
    "L'exploitant fournit le lieu mais ne modifie pas le contenu des utilisateurs.",
  "world.sitePolicyRemoveHeading":
    "L'exploitant peut retirer un contenu uniquement lorsque :",
  "world.sitePolicyReasonLaw": "il viole la loi",
  "world.sitePolicyReasonSpam": "il contient du spam",
  "world.sitePolicyReasonPolicy": "il viole les règles du site",
  "world.sitePolicyNoGoogleProfile":
    "Le site ne conserve pas votre adresse e-mail, votre nom, votre photo de profil, ni aucune autre information de compte Google.",

  // signals
  "signals.eyebrow": "Signal",
  "signals.title": "Mes Signals",
  "signals.summary":
    "Signals découverts à travers le monde MIAV.\nEmportez un Signal Code dans une autre œuvre pour libérer une récompense discrète.",
  "signals.discovered": "{found} / {total} Signals découverts",
  "signals.unknown": "Signal inconnu",
  "signals.copy": "Copier le Signal",
  "signals.copied": "Copié",
  "signals.receivedTitle": "Signal reçu",
  "signals.addedToMySignals": "Ajouté à Mes Signals.",
  "signals.alreadyInCollection": "Déjà dans Mes Signals.",
  "signals.viewSignal": "Voir le Signal",
  "signals.receive": "Recevoir le Signal",
  "signals.chapter14Title": "Signal du Chapitre 14",
  "signals.chapter14Prompt":
    "Un signal discret attend à la fin de ce chapitre.",
  "signals.enter": "Entrer un Signal",
  "signals.enterHeading": "Entrer un Signal",
  "signals.enterHint":
    "Collez un Signal Code pour déverrouiller une récompense sur ce site.",
  "signals.submit": "Déverrouiller",
  "signals.accepted": "Signal accepté",
  "signals.invalid": "Signal invalide",
  "signals.alreadyRedeemed": "Déjà utilisé",
  "signals.rewardUnlocked": "Récompense déverrouillée",
  "signals.notAvailable": "Indisponible pour cette application",
  "signals.source.novel": "Roman",
  "signals.source.binary": "Binary Block",
  "signals.source.luminous": "Luminous Structure",
  "signals.source.writerMemo": "Writer Memo",
  "signals.source.miavWorld": "MIAV World",
  "signals.source.other": "Autre",

  "myMiav.title": "My MIAV",
  "myMiav.subtitle": "Votre MIAV ID et votre activité dans MIAV World.",
  "myMiav.signInPrompt":
    "Connectez-vous avec Google pour voir votre MIAV ID et votre activité.",
  "myMiav.loading": "Chargement…",
  "myMiav.loadError": "Impossible de charger My MIAV.",
  "myMiav.tryAgain": "Réessayer",
  "myMiav.noIdYet": "Pas encore de MIAV ID.",
  "myMiav.noIdHelp":
    "Laissez votre premier Memory dans MIAV World pour recevoir votre MIAV ID.",
  "myMiav.goToWorld": "Aller à MIAV World",
  "myMiav.leaveAnother": "Laisser un autre Memory",
  "myMiav.activity": "Activité",
  "myMiav.activityCountOne": "{count} activité",
  "myMiav.activityCountMany": "{count} activités",
  "myMiav.noActivities": "Aucune activité enregistrée pour le moment.",

  "signals.sectionTitle": "Signals",
  "signals.discoveredTitle": "Signal découvert",
  "signals.waitingForMiavId":
    "Ce Signal vous attend. Laissez un Memory dans MIAV World pour recevoir votre MIAV ID et le révéler.",
  "signals.noneYet": "Aucun Signal découvert pour le moment.",
  "signals.copySignal": "Copier le Signal",
  "signals.copySignalAria": "Copier le code du Signal {title}",
  "signals.addedCount": "{count} Signals ajoutés à My MIAV.",
  "signals.claimError": "Impossible d'ajouter le Signal.",
  "signals.pendingWaiting":
    "Un Signal vous attend — laissez un Memory pour le révéler dans My MIAV.",
  "signals.deviceNote":
    "Les Signals trouvés avant votre MIAV ID restent sur cet appareil jusqu'à l'ouverture de My MIAV.",
  "signals.movedTitle": "Les Signals font partie de My MIAV",
  "signals.movedBody":
    "Vos Signals vivent désormais avec votre MIAV ID. Ouvrez My MIAV pour les voir.",
  "signals.openMyMiav": "Ouvrir My MIAV",

  // common
  "common.loading": "Chargement…",
  "common.close": "Fermer",
  "common.cancel": "Annuler",
  "common.unknown": "Inconnu",
  "common.error": "Une erreur est survenue.",
  "common.retry": "Réessayer",
};

export default fr;

import type { MessageCatalog } from "../types";

/**
 * Spanish UI message catalog. Mirrors the key set of `en.ts` exactly.
 * Neutral Latin American–friendly Spanish — not a literal translation.
 */
export const es: MessageCatalog = {
  // nav / shell
  "nav.home": "Inicio",
  "nav.world": "MIAV World",
  "nav.works": "Obras",
  "nav.game": "Juego",
  "nav.apps": "Aplicaciones",
  "nav.about": "Acerca de",
  "nav.chapters": "Capítulos",
  "nav.books": "Libros",
  "nav.contact": "Contacto",
  "nav.signals": "Mis Signals",
  "nav.myMiav": "My MIAV",
  "nav.primaryAria": "Principal",
  "nav.siteAria": "Sitio",
  "shell.openSidebar": "Abrir el menú",
  "shell.closeSidebar": "Cerrar el menú",
  "shell.collapseSidebar": "Contraer el menú",
  "footer.privacy": "Privacidad",
  "footer.sitePolicy": "Normas del sitio",

  // language
  "lang.menuAria": "Idioma",
  "lang.currentLabel": "Idioma: español",
  "lang.en": "English",
  "lang.fr": "Français",
  "lang.es": "Español",
  "lang.switchTo": "Cambiar a {language}",

  // home hero
  "home.brand": "MIAV-922228",
  "home.tagline": "LEER. JUGAR. DEJAR UN RASTRO.",
  "home.lead":
    "Relatos, juegos de navegador y experimentos digitales de un mismo proyecto de ciencia ficción literaria—explorando la memoria, la inteligencia artificial, la tecnología, la soledad y la existencia humana.",
  "home.ctaStart": "EMPEZAR AQUÍ",
  "home.ctaStories": "LEER LOS RELATOS",
  "home.ctaGames": "JUGAR",
  "home.introAria": "Introducción",

  // start here
  "home.startTitle": "EMPEZAR AQUÍ",
  "home.readTitle": "LEER",
  "home.readBody":
    "Relatos breves de ficción especulativa sobre la memoria, la tecnología y la existencia humana.",
  "home.readEnter": "Entrar a las obras",
  "home.readChapters": "Capítulos",
  "home.readBooks": "Libros",
  "home.playTitle": "JUGAR",
  "home.playBody":
    "Juegos de navegador construidos alrededor de la lógica, el descubrimiento y mundos digitales extraños.",
  "home.playEnter": "Entrar a los juegos",
  "home.appsTitle": "APLICACIONES",
  "home.appsBody":
    "Herramientas silenciosas para atrapar las ideas antes de que desaparezcan.",
  "home.appsView": "Ver las aplicaciones",
  "home.traceTitle": "DEJAR UN RASTRO",
  "home.traceBody":
    "Añade un pequeño recuerdo a MIAV World y forma parte de su mapa en crecimiento.",
  "home.traceOpen": "Abrir MIAV World",

  // featured
  "home.featuredTitle": "DESTACADO AHORA",
  "home.featured.readEyebrow": "LEER",
  "home.featured.afterRainTitle": "After the Rain",
  "home.featured.afterRainBody":
    "Un desconocido bajo el toldo de una librería recuerda la colina de otra manera.",
  "home.featured.afterRainMeta": "Unos 2 minutos",
  "home.featured.readCta": "Leer →",
  "home.featured.playEyebrow": "JUGAR",
  "home.featured.binaryTitle": "Binary Block",
  "home.featured.binaryBody":
    "Un rompecabezas de lógica sobre formas, rotación y una estructura oculta.",
  "home.featured.binaryMeta": "Juega en tu navegador",
  "home.featured.playCta": "Jugar →",
  "home.featured.appsEyebrow": "APLICACIONES",
  "home.featured.traceEyebrow": "DEJAR UN RASTRO",
  "home.featured.worldTitle": "MIAV World",
  "home.featured.worldBody":
    "Añade un pequeño recuerdo a un mapa en crecimiento de huellas humanas.",
  "home.featured.worldMeta": "Únete al mapa",
  "home.featured.traceCta": "Entrar →",

  "home.cosmic.writerMemo": "WRITER MEMO",
  "home.cosmic.handy": "ÚTIL",
  "home.cosmic.miavWorld": "MIAV WORLD",

  // apps
  "apps.openApp": "Abrir la app",
  "apps.comingSoon": "Próximamente",
  "apps.eyebrow": "APLICACIÓN",
  "apps.writerMemo.description":
    "Una app de notas simple y privada para escritores.",

  // about / contact (home sections)
  "home.aboutTitle": "Acerca de MIAV",
  "home.aboutBody":
    "MIAV es un proyecto independiente de ciencia ficción literaria que reúne relatos, juegos de navegador y experimentos digitales. A través de la ficción y las obras interactivas, explora la memoria, la inteligencia artificial, la soledad, la tecnología y la existencia humana.",
  "home.contactTitle": "Contacto",
  "home.contactBody":
    "Si tienes preguntas sobre el proyecto, publicaciones o prensa, escríbenos.",
  "home.contactCta": "Escribir un mensaje",

  // about / contact pages
  "about.pageTitle": "Acerca de MIAV",
  "about.worksHeading": "Obras",
  "contact.eyebrow": "CONTACTO",
  "contact.title": "Contacto",
  "contact.intro":
    "Si tienes preguntas sobre el proyecto, publicaciones o prensa, escríbenos.",
  "contact.name": "Nombre",
  "contact.email": "Correo electrónico",
  "contact.message": "Mensaje",
  "contact.send": "Enviar mensaje",
  "contact.sending": "Enviando…",
  "contact.success": "Tu mensaje fue recibido. Gracias por escribirnos.",
  "contact.errorGeneric": "No se pudo enviar el mensaje.",
  "contact.errorRateLimit":
    "Se enviaron demasiados mensajes. Espera un momento e inténtalo de nuevo.",
  "contact.disabled": "El contacto no está disponible temporalmente.",
  "contact.website": "Sitio web",

  // reader memory
  "reader.greetingFirst": "Hola.\nTe damos la bienvenida a {title}.",
  "reader.greetingBack": "Has vuelto.",
  "reader.greetingRecent": "Qué bueno verte de nuevo.",
  "reader.greetingLongAgo": "Ha pasado tiempo.\nBienvenido de nuevo.",
  "reader.firstVisit.one": "Tu primera visita\nfue hace {days} día.",
  "reader.firstVisit.other": "Tu primera visita\nfue hace {days} días.",
  "reader.chaptersRead.one": "Has leído\n{count} capítulo.",
  "reader.chaptersRead.other": "Has leído\n{count} capítulos.",
  "reader.traceLeft": "Tu rastro sigue ahí.",
  "reader.traceInvite": "Algún día,\ndeja tu rastro en el mapa.",

  // world-map / MIAV World
  "world.title": "MIAV World",
  "world.subtitle":
    "Huellas de lectores dejadas alrededor del mundo, ciudad por ciudad.",
  "world.leaveMemory": "Deja un recuerdo",
  "world.writeMemory": "Escribe un recuerdo",
  "world.signIn": "Iniciar sesión",
  "world.signOut": "Cerrar sesión",
  "world.privacy": "Privacidad",
  "world.sitePolicy": "Normas del sitio",
  "world.returnToWorld": "Volver a MIAV World",
  "world.yourMemory": "Tu recuerdo",
  "world.verifiedGoogle": "Verificado con Google",
  "world.mapHelp":
    "Las estrellas marcan los lugares donde los lectores dejaron un recuerdo. Haz clic en una estrella para leerlos: sin GPS, sin dirección.",
  "world.mapHelpGeo":
    "Países, regiones y ciudades reúnen Memories por obra. Filtra por READ / PLAY / APPS y por obra — toca un grupo para ver el detalle — sin GPS, sin dirección.",
  "world.earlierOnMapNote":
    "Los Earlier Memories sin categoría permanecen en el archivo — no se mezclan con READ / PLAY / APPS.",
  "world.filterCategoriesAria": "Filtrar el mapa por categoría",
  "world.filterWorksAria": "Filtrar el mapa por obra",
  "world.filterWorksGroupAria": "Obras en {category}",
  "world.filterWorkToggleAria": "{work} — {state}",
  "world.filterOn": "seleccionado",
  "world.filterOff": "no seleccionado",
  "world.filterWorksEmpty":
    "Selecciona al menos una obra en las categorías activas para mostrar el mapa.",
  "world.workLegendAria": "Colores de obra en el mapa",
  "world.legendAria": "Colores de categoría",
  "world.filterEmpty": "Selecciona al menos READ, PLAY o APPS para mostrar el mapa.",
  "world.backToWorld": "← Mundo",
  "world.backToCountry": "← {country}",
  "world.scopeWorld": "Mundo",
  "world.mapScope": "Alcance del mapa",
  "world.openCountry": "Abrir país",
  "world.openRegion": "Abrir región",
  "world.viewMemories": "Ver Memories",
  "world.personCount": "{count} persona",
  "world.peopleCount": "{count} personas",
  "world.activityCountOne": "{count} actividad",
  "world.activityCountMany": "{count} actividades",
  "world.geoMarkerAria":
    "{label}: {people} personas, {activities} actividades. Categorías: {categories}",
  "world.geoMarkerAriaWorks":
    "{label}: {people} personas, {activities} actividades. Obras: {works}",
  "world.loadingMap": "Desplegando el mapa…",
  "world.gathering": "Reuniendo…",
  "world.archive": "Archivo de huellas",
  "world.latestMemory": "Último recuerdo",
  "world.noMemories": "Aún no hay recuerdos.",
  "world.saving": "Guardando…",
  "world.cancel": "Cancelar",
  "world.close": "Cerrar",
  "world.welcomeUnderstand": "Entendido",
  "world.selectMemory": "Seleccionado: {city}, {country}",
  "world.previousMemory": "Recuerdo anterior",
  "world.nextMemory": "Siguiente recuerdo",
  "world.place": "Lugar",
  "world.placeContinent": "Continente",
  "world.placeCountry": "País",
  "world.placeRegion": "Región",
  "world.placeCity": "Ciudad",
  "world.chooseContinent": "Elige un continente",
  "world.chooseCountry": "Elige un país",
  "world.chooseRegion": "Elige una región",
  "world.loadingRegions": "Cargando…",
  "world.noRegions": "Sin regiones",
  "world.choosePlaceFirst":
    "Elige primero un continente, un país, una región y una ciudad.",
  "world.writeMemoryFirst": "Escribe un recuerdo breve antes de guardar.",
  "world.saveError": "No se pudo guardar el recuerdo.",
  "world.memoryLabel": "Recuerdo ({current}/{max})",
  "world.memoryPlaceholder": "Una nota breve para decir que estuviste aquí…",
  "world.signInWithGoogle": "Iniciar sesión con Google",
  "world.signInRequired":
    "Se requiere iniciar sesión con Google para dejar un recuerdo.",
  "world.signInToLeave": "Inicia sesión para dejar un recuerdo",
  "world.signInToLeaveHelp":
    "Puedes elegir un lugar y escribir primero. El inicio de sesión con Google solo se pide al guardar.",
  "world.readyToLeave": "Listo para dejar un recuerdo",
  "world.memorySaved": "Tu recuerdo ha sido guardado.",
  "world.writeMemorySignIn": "Iniciar sesión y escribir",
  "world.editingUnavailable": "La edición no está disponible.",
  "world.charactersAvailable": "{count} caracteres disponibles",
  "world.miavId": "MIAV ID",
  "world.miavIdHint":
    "El ID público asignado a tu Trace en MIAV World.",
  "world.copyId": "Copiar {id}",
  "world.copied": "¡Copiado!",
  "world.presenceTitle": "Presencia",
  "world.presenceBody":
    "Huellas discretas en el mapa. Solo a nivel de ciudad, nunca tu ubicación exacta.",
  "world.placesWithMemories": "Lugares con recuerdos",
  "world.totalMemories": "Total de recuerdos",
  "world.permanentMemories": "Recuerdos de cuenta",
  "world.earlierMemories": "Recuerdos anteriores",
  "world.traceDisabled": "El registro de huellas no está disponible temporalmente.",
  "world.privacyBlurbSignIn":
    "El inicio de sesión con Google se usa solo para identificar tu huella.",
  "world.privacyBlurbNoInfo": "No se guarda ninguna información personal.",
  "world.privacyBlurbNoEditContent":
    "El sitio no edita el contenido de los usuarios.",
  "world.welcomeTitle": "Bienvenido a MIAV World",
  "world.welcomeEyebrow": "Entrada",
  "world.welcomeAgreePrefix": "He leído y entiendo la",
  "world.privacyPolicyLabel": "Política de Privacidad",
  "world.agreeAnd": "y las",
  "world.agreePrivacyPrefix": "He leído y acepto la",
  "world.googleDialogTitle": "Inicia sesión para dejar un recuerdo",
  "world.googleDialogEyebrow": "Autenticación",
  "world.googleDialogIntro":
    "La verificación se usa solo para identificar al propietario de tu recuerdo. Los datos de tu cuenta de Google nunca se muestran ni se almacenan.",
  "world.googleDoesNotStoreHeading": "Este sitio NO guarda tu:",
  "world.googleDoesNotStoreEmail": "Correo electrónico",
  "world.googleDoesNotStoreName": "Nombre",
  "world.googleDoesNotStorePhoto": "Foto de perfil",
  "world.googleDoesNotStoreAccount": "Información de la cuenta de Google",
  "world.googleUidNote":
    "Se guarda un identificador de cuenta privado para que solo tú puedas conservar tu recuerdo.",
  "world.googleNeverAccess": "El sitio nunca accede a tus datos de Google.",
  "world.responsibility": "Los usuarios son responsables del contenido que dejan.",
  "world.noEdit": "El operador no edita el contenido de los usuarios.",
  "world.removal":
    "El contenido solo puede eliminarse si infringe la ley, contiene spam o infringe las normas del sitio.",
  "world.continuing": "Continuando…",
  "world.navAria": "Enlaces de MIAV World",
  "world.memoryFieldLabel": "Recuerdo",
  "world.leftAt": "Dejado",
  "world.yourStatus": "Tu estado",
  "world.composerHelp":
    "Elige qué te trajo aquí, luego un lugar y un recuerdo breve. Hasta {max} caracteres. Se requiere iniciar sesión con Google para guardar.",
  "world.whatBroughtYou": "¿Qué te trajo aquí?",
  "world.chooseWork": "Elige una obra",
  "world.chooseCategoryFirst": "Elige primero READ, PLAY o APPS.",
  "world.alreadyLeftForWork": "Ya dejaste un recuerdo para esta obra.",
  "world.alreadyLeftShort": "ya dejado",
  "world.worksAlreadyLeft":
    "{count} obra(s) ya registradas bajo tu MIAV ID.",
  "world.moreWorksAvailable":
    "Puedes dejar otro recuerdo para una obra diferente.",
  "world.allWorksLeft":
    "Ya dejaste un recuerdo para todas las obras disponibles.",
  "world.origin": "Origen",
  "world.category.read": "READ",
  "world.category.play": "PLAY",
  "world.category.apps": "APPS",
  "world.welcomeLeaveTrace": "Deja un único rastro en el mundo de MIAV-922228.",
  "world.welcomeNotAnalytics": "Esto no es analítica.",
  "world.welcomeQuietRecord":
    "Es un registro discreto de los lectores que han visitado este mundo.",
  "world.welcomeOneTraceOnly": "Cada visitante puede dejar solo un rastro.",
  "world.welcomeMarkThatYouWereHere":
    "Un rastro es simplemente una marca de que estuviste aquí.",
  "world.welcomeGoogleIdentify":
    "El inicio de sesión con Google se usa solo para identificar al propietario de un rastro. Ver el mapa no requiere iniciar sesión.",
  "world.welcomeRemovalIntro": "El contenido solo puede eliminarse si:",
  "world.welcomeBulletLaw": "infringe la ley",
  "world.welcomeBulletSpam": "contiene spam",
  "world.welcomeBulletPolicy": "infringe las normas del sitio",
  "world.welcomeClosingNotSocial": "Esto no es una red social.",
  "world.welcomeClosingQuietPlace":
    "Es simplemente un lugar discreto donde los lectores dejan un rastro.",
  "world.privacyNoProfileFields":
    "El correo electrónico, el nombre, la foto de perfil y la información de la cuenta de Google nunca se guardan.",
  "world.privacyUidOnlyEdit":
    "Se guarda un identificador de cuenta privado para que solo tú puedas conservar tu rastro.",
  "world.privacyTraceBelongsToYou": "Tu rastro te pertenece.",
  "world.privacySiteProvidesPlace":
    "El sitio ofrece un espacio para que los lectores dejen un rastro, pero no edita el contenido de los usuarios.",
  "world.privacyQuietLiterarySpace":
    "Es un espacio literario discreto donde los lectores dejan un único rastro.",
  "world.privacyStoresOnly":
    "MIAV World guarda únicamente: un identificador de cuenta privado, el ID de MIAV, el tipo de sesión, el lugar, el mensaje y las marcas de tiempo.",
  "world.sitePolicyIntro": "MIAV World es un lugar donde los lectores dejan un rastro.",
  "world.sitePolicyTraceBelongsToOwner": "Cada rastro pertenece a su propietario.",
  "world.sitePolicyProvidesPlace":
    "El operador ofrece el lugar, pero no edita el contenido de los usuarios.",
  "world.sitePolicyRemoveHeading":
    "El operador solo puede eliminar contenido cuando:",
  "world.sitePolicyReasonLaw": "infringe la ley",
  "world.sitePolicyReasonSpam": "contiene spam",
  "world.sitePolicyReasonPolicy": "infringe las normas del sitio",
  "world.sitePolicyNoGoogleProfile":
    "El sitio no guarda tu dirección de correo electrónico, nombre, foto de perfil, ni ninguna otra información de la cuenta de Google.",

  // signals
  "signals.eyebrow": "Signal",
  "signals.title": "Mis Signals",
  "signals.summary":
    "Signals descubiertos en el mundo MIAV.\nLleva un Signal Code a otra obra para liberar una recompensa discreta.",
  "signals.discovered": "{found} / {total} Signals descubiertos",
  "signals.unknown": "Signal desconocido",
  "signals.copy": "Copiar Signal",
  "signals.copied": "Copiado",
  "signals.receivedTitle": "Signal recibido",
  "signals.addedToMySignals": "Añadido a Mis Signals.",
  "signals.alreadyInCollection": "Ya está en Mis Signals.",
  "signals.viewSignal": "Ver Signal",
  "signals.receive": "Recibir Signal",
  "signals.chapter14Title": "Signal del Capítulo 14",
  "signals.chapter14Prompt":
    "Un signal discreto espera al final de este capítulo.",
  "signals.enter": "Introducir Signal",
  "signals.enterHeading": "Introducir Signal",
  "signals.enterHint":
    "Pega un Signal Code para desbloquear una recompensa en este sitio.",
  "signals.submit": "Desbloquear",
  "signals.accepted": "Signal aceptado",
  "signals.invalid": "Signal inválido",
  "signals.alreadyRedeemed": "Ya canjeado",
  "signals.rewardUnlocked": "Recompensa desbloqueada",
  "signals.notAvailable": "No disponible para esta app",
  "signals.source.novel": "Novela",
  "signals.source.binary": "Binary Block",
  "signals.source.luminous": "Luminous Structure",
  "signals.source.writerMemo": "Writer Memo",
  "signals.source.miavWorld": "MIAV World",
  "signals.source.other": "Otro",

  "myMiav.title": "My MIAV",
  "myMiav.subtitle": "Tu MIAV ID y tu actividad en MIAV World.",
  "myMiav.signInPrompt":
    "Inicia sesión con Google para ver tu MIAV ID y tu actividad.",
  "myMiav.loading": "Cargando…",
  "myMiav.loadError": "No se pudo cargar My MIAV.",
  "myMiav.tryAgain": "Intentar de nuevo",
  "myMiav.noIdYet": "Aún no tienes MIAV ID.",
  "myMiav.noIdHelp":
    "Deja tu primer Memory en MIAV World para recibir tu MIAV ID.",
  "myMiav.goToWorld": "Ir a MIAV World",
  "myMiav.leaveAnother": "Dejar otro Memory",
  "myMiav.activity": "Actividad",
  "myMiav.activityCountOne": "{count} actividad",
  "myMiav.activityCountMany": "{count} actividades",
  "myMiav.noActivities": "Aún no hay actividad registrada.",

  "signals.sectionTitle": "Signals",
  "signals.discoveredTitle": "Signal descubierto",
  "signals.waitingForMiavId":
    "Este Signal te espera. Deja un Memory en MIAV World para recibir tu MIAV ID y revelarlo.",
  "signals.noneYet": "Aún no has descubierto Signals.",
  "signals.copySignal": "Copiar Signal",
  "signals.copySignalAria": "Copiar el código del Signal {title}",
  "signals.addedCount": "{count} Signals añadidos a My MIAV.",
  "signals.claimError": "No se pudo añadir el Signal.",
  "signals.pendingWaiting":
    "Un Signal te espera — deja un Memory para revelarlo en My MIAV.",
  "signals.deviceNote":
    "Los Signals encontrados antes de tu MIAV ID permanecen en este dispositivo hasta que abras My MIAV.",
  "signals.movedTitle": "Los Signals forman parte de My MIAV",
  "signals.movedBody":
    "Tus Signals ahora viven junto a tu MIAV ID. Abre My MIAV para verlos.",
  "signals.openMyMiav": "Abrir My MIAV",

  // common
  "common.loading": "Cargando…",
  "common.close": "Cerrar",
  "common.cancel": "Cancelar",
  "common.unknown": "Desconocido",
  "common.error": "Algo salió mal.",
  "common.retry": "Intentar de nuevo",
};

export default es;

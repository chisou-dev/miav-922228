import type { SantaLevel } from "@/features/santas-shelf/catalog";
import type { SantaLanguage } from "@/features/santas-shelf/localized";

/**
 * Search/social introductions describe the approved fiction, not just the quiz.
 * Metadata only: not displayed in the reading interface. No hidden body text.
 */
export const SANTA_SITE_DESCRIPTION =
  "Read Santa's Shelf, six connected stories about Santa, the toys he finds and repairs, and a shelf where staying is a choice. Free reading in English, European Spanish and French, at three levels.";

export const SANTA_LANGUAGE_SEO: Record<SantaLanguage, { title: string; description: string }> = {
  en: {
    title: "Santa's Shelf — Free English Stories in Three Levels | MIAV LEARN",
    description:
      "A worn toy cat hopes to be held again, while an old train chooses to stay on Santa's shelf. Read six connected stories for free in beginner, intermediate or advanced English.",
  },
  es: {
    title: "La estantería de Papá Noel — Relatos gratis en español | MIAV LEARN",
    description:
      "Un gato de peluche quiere volver a estar en brazos de un niño y un tren prefiere quedarse en la estantería. Lee gratis seis relatos de Papá Noel en español de España, con tres niveles de lectura.",
  },
  fr: {
    title: "L’étagère du Père Noël — Histoires gratuites en français | MIAV LEARN",
    description:
      "Un vieux chat en peluche rêve d’être à nouveau pris dans les bras, tandis qu’un petit train choisit de rester. Lisez gratuitement six histoires du Père Noël en français, à trois niveaux.",
  },
};

const chapterStories: Record<SantaLanguage, readonly [string, string, string, string, string, string]> = {
  en: [
    "Santa asks which toys want to travel. A blue-stitched cat hopes a child will hold him again, while an old toy train chooses to stay on the shelf.",
    "A robot keeps falling over, and Santa discovers a yellow toy car missing a wheel and a piano with missing keys. Both still remember children.",
    "Santa enjoys the beach and an amusement park, then recognizes a one-legged doll he delivered to a little girl three years earlier.",
    "Santa rests in a grassy field and imagines which children might enjoy his toys. The reindeer carry him home to prepare for Christmas.",
    "A child hears bells on Christmas Eve. At the children's home, the girl with the old blue-stitched cat receives a new black cat with a ribbon.",
    "After Christmas, Santa repairs the found toys. A doll recalls everyday life with a little girl before joining the old train on the shelf.",
  ],
  es: [
    "Papá Noel pregunta a los juguetes quién quiere viajar. Un gato con la oreja cosida de azul desea que lo abracen; un viejo tren prefiere quedarse.",
    "Un robot no deja de caerse. Papá Noel encuentra un coche amarillo al que le falta una rueda y un piano sin dos teclas; ambos recuerdan a los niños.",
    "Papá Noel disfruta de la playa y del parque de atracciones hasta que reconoce a una muñeca sin una pierna que entregó a una niña tres años antes.",
    "Papá Noel descansa en una pradera y piensa qué niños disfrutarán con cada juguete. Después regresa con los renos para preparar la Navidad.",
    "Una niña oye cascabeles en Nochebuena. En el centro infantil, la pequeña que tiene el gato de la oreja cosida recibe un gato negro con un lazo.",
    "Después de Navidad, Papá Noel arregla los juguetes encontrados. Una muñeca recuerda su vida cotidiana con una niña antes de llegar a la estantería.",
  ],
  fr: [
    "Le Père Noël demande quels jouets veulent partir. Un vieux chat à l'oreille recousue de bleu veut être pris dans les bras ; un petit train préfère rester.",
    "Un robot tombe sans cesse. Le Père Noël découvre une voiture jaune à laquelle il manque une roue et un piano privé de deux touches.",
    "Le Père Noël profite de la plage et d'un parc d'attractions, puis reconnaît une poupée à qui il manque une jambe, offerte trois ans plus tôt.",
    "Dans une prairie, le Père Noël imagine quels enfants aimeraient chaque jouet. Il rentre ensuite avec les rennes pour préparer Noël.",
    "Une petite fille entend des grelots la veille de Noël. Au foyer, la fillette au vieux chat recousu reçoit un nouveau chat noir orné d'un ruban.",
    "Après Noël, le Père Noël répare les jouets trouvés. Une poupée raconte ses souvenirs d'une petite fille avant de rejoindre le vieux train sur l'étagère.",
  ],
};

const levelMeta: Record<SantaLanguage, Record<SantaLevel, string>> = {
  en: { beginner: "beginner", intermediate: "intermediate", advanced: "advanced" },
  es: { beginner: "inicial", intermediate: "intermedio", advanced: "avanzado" },
  fr: { beginner: "débutant", intermediate: "intermédiaire", advanced: "avancé" },
};

export function santaChapterSeo(
  language: SantaLanguage,
  level: SantaLevel,
  episode: number,
  title: string
): { title: string; description: string } {
  const summary = chapterStories[language][episode - 1];
  if (!summary) throw new Error("Santa's Shelf: no SEO synopsis for chapter " + episode);
  if (language === "es") {
    return {
      title: title + " — La estantería de Papá Noel · Capítulo " + episode + " | MIAV LEARN",
      description:
        summary + " Lectura gratuita en español de España, nivel " + levelMeta.es[level] + ", con cinco preguntas de comprensión.",
    };
  }
  if (language === "fr") {
    return {
      title: title + " — L’étagère du Père Noël · Chapitre " + episode + " | MIAV LEARN",
      description:
        summary + " Lecture gratuite en français, niveau " + levelMeta.fr[level] + ", avec cinq questions de compréhension.",
    };
  }
  return {
    title: title + " — Santa's Shelf · Chapter " + episode + " | MIAV LEARN",
    description:
      summary + " Free " + levelMeta.en[level] + " English reading with five comprehension questions.",
  };
}

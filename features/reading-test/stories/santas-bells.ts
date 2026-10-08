import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = "# Santa's Bells\nChristmas was over.\nSanta had finished his work.\n“Now I can travel,” he said.\nHe got into his sleigh.\nThe reindeer started to walk.\nShara-shara.\nThe bells rang.\nThen they flew into the sky.\n## Spring\nSanta came to a green mountain.\nThe reindeer ate grass.\nSanta found a small shop.\nHe bought a little wooden bird.\n“It is a present,” he said.\nA girl walked past the sleigh.\nShara-shara.\nShe stopped.\n“What is that sound?”\nHer brother listened.\n“I don’t know.”\n“It is nice.”\nThey walked away.\n## Summer\nSanta went to the sea.\nHe wore shorts and sandals.\nThe reindeer ate grass near the beach.\nSanta walked into the water.\n“Cold!”\nA little boy laughed.\nSanta laughed too.\nLater, Santa went back to his sleigh.\nShara-shara.\nA girl looked up.\n“What a pretty sound.”\nShe did not think about Santa.\nIt was summer.\n## Fall\nThe days became colder.\nSanta came to a town.\nThere was a red star in a shop window.\nA boy heard the bells.\nShara-shara.\nHe stopped.\n“Mom?”\n“Yes?”\n“That sound…”\nThe boy looked at the red star.\nThen he looked at Santa.\nHe said nothing.\nSanta smiled.\n## Winter\nChristmas was coming.\nNow there were lights in the streets.\nChildren saw Christmas trees in the shops.\nSanta walked past two girls.\nShara-shara.\nOne girl stopped.\n“Santa!”\n“Where?”\n“I heard him!”\nThe girls ran toward the sound.\nSanta watched them go.\nOn December 23, Santa came home.\nHis big red bag was full of presents.\nHe gave the reindeer food and water.\nThen Santa went to bed.\nHe thought about the children he had seen that year.\nTomorrow, many children would smile.\nSanta smiled too.\nOutside, the bells moved in the cold wind.\nShara-shara.\nSanta closed his eyes.\nTomorrow was Christmas Eve.";

export const santasBells = {
  slug: "santas-bells",
  title: "Santa's Bells",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 5,
  body,
  questions: [
    {
      id: "q1",
      question: "What did Santa buy in the small shop?",
      choices: ["A little wooden bird", "A red hat", "A toy car"],
      correctAnswer: "A little wooden bird",
    },
    {
      id: "q2",
      question: "Where did Santa go in summer?",
      choices: ["To the sea", "To a mountain", "To a big city"],
      correctAnswer: "To the sea",
    },
    {
      id: "q3",
      question: "What did the reindeer eat in spring?",
      choices: ["Bread", "Grass", "Apples"],
      correctAnswer: "Grass",
    },
    {
      id: "q4",
      question: "What did a girl say about the bells in summer?",
      choices: [
        "“What a pretty sound.”",
        "“Santa is here!”",
        "“The bells are too loud.”",
      ],
      correctAnswer: "“What a pretty sound.”",
    },
    {
      id: "q5",
      question: "What happened on December 23?",
      choices: [
        "Santa went to the sea.",
        "Santa bought a wooden bird.",
        "Santa came home.",
      ],
      correctAnswer: "Santa came home.",
    },
  ],
} satisfies ReadingStoryInput;

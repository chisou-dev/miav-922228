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
      question: "How does the girl's reaction to the bells in summer differ from the girls' reaction in winter?",
      choices: ["In summer she likes the sound without thinking of Santa; in winter they recognize Santa","In summer she runs toward Santa; in winter they ignore the sound","In both seasons everyone believes the bells come from a bicycle","No child hears the bells in either season"],
      correctAnswer: "In summer she likes the sound without thinking of Santa; in winter they recognize Santa",
    },
    {
      id: "q4",
      question: "What does the boy do when he hears the bells in fall?",
      choices: ["He looks at a red star and then at Santa without speaking","He buys the sleigh from Santa","He asks Santa for a snow shovel","He runs away before he sees the shop"],
      correctAnswer: "He looks at a red star and then at Santa without speaking",
    },
    {
      id: "q5",
      question: "What do the girls do when they hear the bells in winter?",
      choices: ["They recognize Santa and run toward the sound","They ask someone to turn off the music","They walk away without looking","They hide their presents in the shop"],
      correctAnswer: "They recognize Santa and run toward the sound",
    },
    {
      id: "q6",
      question: "What does Santa decide to do after Christmas is over?",
      choices: ["Travel","Begin wrapping gifts immediately","Go to school","Sell his sleigh"],
      correctAnswer: "Travel",
    },
    {
      id: "q7",
      question: "Where does Santa visit during spring?",
      choices: ["A green mountain","A crowded train station","A desert","An indoor shopping mall"],
      correctAnswer: "A green mountain",
    },
    {
      id: "q8",
      question: "What do the reindeer eat at the spring stop?",
      choices: ["Grass","Cake","Fish","Snow"],
      correctAnswer: "Grass",
    },
    {
      id: "q9",
      question: "How do two children respond to the sound during spring?",
      choices: ["They like it without identifying its source","They call for Santa at once","They run to buy presents","They cover their ears"],
      correctAnswer: "They like it without identifying its source",
    },
    {
      id: "q10",
      question: "What is Santa wearing when he visits the sea?",
      choices: ["Shorts and sandals","A heavy winter coat","A school uniform","A business suit"],
      correctAnswer: "Shorts and sandals",
    },
    {
      id: "q11",
      question: "How does Santa respond when he steps into the summer water?",
      choices: ["He says it is cold","He falls asleep","He rings a school bell","He starts crying"],
      correctAnswer: "He says it is cold",
    },
    {
      id: "q12",
      question: "Which detail does a boy notice near a shop in fall?",
      choices: ["A red star","A silver thread","A blue train","A golden axe"],
      correctAnswer: "A red star",
    },
    {
      id: "q13",
      question: "What changes in the children's response to the bells by winter?",
      choices: ["They connect the sound with Santa","They no longer hear it","They ask Santa to leave","They think the bells are part of a piano"],
      correctAnswer: "They connect the sound with Santa",
    },
    {
      id: "q14",
      question: "When does Santa arrive home before Christmas Eve?",
      choices: ["December 23","December 31","January 1","July 16"],
      correctAnswer: "December 23",
    },
    {
      id: "q15",
      question: "What does Santa do for the reindeer after returning home?",
      choices: ["Gives them food and water","Sends them to the beach","Asks them to deliver newspapers","Leaves them outside without food"],
      correctAnswer: "Gives them food and water",
    },
  ],
} satisfies ReadingStoryInput;

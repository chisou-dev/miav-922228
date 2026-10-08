import type { ReadingQuestion } from "@/features/reading-test/types";

/**
 * Questions for published chapter openings.
 * The English text stays in the original chapter files.
 */
export const seriesOpenings: readonly {
  slug: string;
  title: string;
  seriesTitle: string;
  /** Path under the project root. The chapter file is the only copy of the text. */
  sourcePath: string;
  contentType: "series-opening" | "series-chapter";
  /** Omitted when the next catalog entry has no free chapter body. */
  continueUrl?: string;
  questions: readonly ReadingQuestion[];
}[] = [
  {
    slug: "mia",
    title: "Mia",
    seriesTitle: "MIAV-922228",
    contentType: "series-opening",
    sourcePath: "content/chapters/en/conversation.md",
    continueUrl: "/chapters/accumulation",
    questions: [
      {
        id: "q1",
        question: "Where does this chapter take place?",
        choices: [
          "On a train",
          "In a university lounge",
          "In a classroom",
          "At a piano studio",
        ],
        correctAnswer: "In a university lounge",
      },
      {
        id: "q2",
        question: "What does the friend say his AI has been lately?",
        choices: ["Jealous", "Helpful", "Quiet", "Broken"],
        correctAnswer: "Jealous",
      },
      {
        id: "q3",
        question: "What does the narrator say he does not have yet?",
        choices: ["A phone", "Piano lessons", "A girlfriend", "RIS"],
        correctAnswer: "RIS",
      },
      {
        id: "q4",
        question: "What name does he enter?",
        choices: ["MIAV", "Relation", "Mia", "Friend"],
        correctAnswer: "Mia",
      },
      {
        id: "q5",
        question: "What remains on the screen at the end?",
        choices: [
          "His search history",
          "Only Mia",
          "The settings page",
          "A list of friends",
        ],
        correctAnswer: "Only Mia",
      },
    ],
  },
  {
    slug: "wednesday",
    title: "Wednesday",
    seriesTitle: "Next Time I See You",
    contentType: "series-opening",
    sourcePath: "content/stories/next-time-i-see-you/en/chapter-1.md",
    continueUrl: "/stories/next-time-i-see-you/chapter-2",
    questions: [
      {
        id: "q1",
        question: "What day is it?",
        choices: ["Monday", "Friday", "Wednesday", "Sunday"],
        correctAnswer: "Wednesday",
      },
      {
        id: "q2",
        question: "How long until the last class ends?",
        choices: ["Five minutes", "One hour", "Until five o’clock", "Fifteen minutes"],
        correctAnswer: "Fifteen minutes",
      },
      {
        id: "q3",
        question: "What does he want to ask her?",
        choices: [
          "Do you like piano?",
          "What are you playing at the recital?",
          "Can I walk with you?",
          "Will you be here next week?",
        ],
        correctAnswer: "What are you playing at the recital?",
      },
      {
        id: "q4",
        question: "Where did his friend see the photo of her?",
        choices: [
          "On the classroom wall",
          "At the piano studio",
          "In his wallet",
          "In a textbook",
        ],
        correctAnswer: "In his wallet",
      },
      {
        id: "q5",
        question: "What does he look at before he plays the first key?",
        choices: ["The closed door", "Her face", "The clock", "His friend"],
        correctAnswer: "The closed door",
      },
    ],
  },
  {
    slug: "the-tortoise-and-the-hare",
    title: "The Tortoise and the Hare",
    seriesTitle: "Fourth Period",
    contentType: "series-opening",
    sourcePath: "content/stories/fourth-period/en/the-tortoise-and-the-hare.md",
    continueUrl: "/stories/fourth-period/chapter-2",
    questions: [
      {
        id: "q1",
        question: "How old is he in the classroom?",
        choices: ["Ten", "Forty", "Eighteen", "Thirty"],
        correctAnswer: "Ten",
      },
      {
        id: "q2",
        question: "Where are the hare and the tortoise racing?",
        choices: [
          "Across a field",
          "To the top of a mountain",
          "Around the classroom",
          "To the station",
        ],
        correctAnswer: "To the top of a mountain",
      },
      {
        id: "q3",
        question: "What does the boy say about the hare?",
        choices: [
          "The tortoise cheated.",
          "The race was not fair.",
          "If the hare hadn't gone to sleep, he would've won.",
          "The hare was faster, so he won.",
        ],
        correctAnswer: "If the hare hadn't gone to sleep, he would've won.",
      },
      {
        id: "q4",
        question: "Thirty years later, where does he work?",
        choices: [
          "A school",
          "A railway company",
          "A piano studio",
          "A sales office in Tokyo",
        ],
        correctAnswer: "A sales office in Tokyo",
      },
      {
        id: "q5",
        question: "Who is promoted to manager?",
        choices: ["His coworker", "The teacher", "His manager", "His wife"],
        correctAnswer: "His coworker",
      },
    ],
  },
  {
    slug: "quitting",
    title: "Quitting",
    seriesTitle: "After ¥50 Million",
    sourcePath: "content/stories/after-50-million/en/chapter-1.md",
    contentType: "series-opening",
    continueUrl: "/stories/after-50-million/chapter-2",
    questions: [
      {
        id: "q1",
        question: "What time did he wake up the morning after he quit?",
        choices: ["At eight", "At six", "At noon", "At nine"],
        correctAnswer: "At eight",
      },
      {
        id: "q2",
        question: "That morning, what was the combined total in his account?",
        choices: [
          "About 140,000 yen",
          "Over fifty million yen",
          "His monthly rent",
          "One million yen",
        ],
        correctAnswer: "Over fifty million yen",
      },
      {
        id: "q3",
        question: "How old was he?",
        choices: ["Eighteen", "Forty", "Thirty-eight", "Thirty"],
        correctAnswer: "Thirty-eight",
      },
      {
        id: "q4",
        question: "What had he written in the book he bought at eighteen?",
        choices: [
          "Retire at thirty",
          "Buy a house",
          "Travel the world",
          "40 years old — ¥50,000,000",
        ],
        correctAnswer: "40 years old — ¥50,000,000",
      },
      {
        id: "q5",
        question: "When he lost track of the day, what day did his phone say?",
        choices: ["Wednesday", "Monday", "Sunday", "Friday"],
        correctAnswer: "Wednesday",
      },
    ],
  },
  {
    slug: "estimated-time-of-resumption",
    title: "Estimated Time of Resumption",
    seriesTitle: "JAPAN 8000Hz",
    sourcePath: "content/stories/japan-8000hz/en/estimated-time-of-resumption.md",
    contentType: "series-opening",
    questions: [
      {
        id: "q1",
        question: "What was named on the job offer?",
        choices: ["A bank", "Railway Company", "A school", "A hospital"],
        correctAnswer: "Railway Company",
      },
      {
        id: "q2",
        question: "What did his senior say when they reached the station?",
        choices: [
          "You are late.",
          "Go home.",
          "From today, you’re on-site",
          "Take a break.",
        ],
        correctAnswer: "From today, you’re on-site",
      },
      {
        id: "q3",
        question: "In the break room, how long was left when he first checked the time?",
        choices: ["Five minutes", "An hour", "Thirty minutes", "Fourteen minutes"],
        correctAnswer: "Fourteen minutes",
      },
      {
        id: "q4",
        question: "What announcement was repeated while the train stayed stopped?",
        choices: [
          "No estimated time of resumption",
          "The train is canceled",
          "Please change trains",
          "Service has ended",
        ],
        correctAnswer: "No estimated time of resumption",
      },
      {
        id: "q5",
        question: "What did his senior say the allowance might be?",
        choices: [
          "Nothing",
          "Maybe around three thousand yen",
          "A full day’s pay",
          "Ten thousand yen",
        ],
        correctAnswer: "Maybe around three thousand yen",
      },
    ],
  },
  {
    slug: "the-honest-woodcutter",
    title: "The Honest Woodcutter",
    seriesTitle: "Fourth Period",
    sourcePath: "content/stories/fourth-period/en/the-honest-woodcutter.md",
    contentType: "series-chapter",
    continueUrl: "/stories/fourth-period/chapter-3",
    questions: [
      {
        id: "q1",
        question: "What kind of axe did the woodcutter say was his?",
        choices: [
          "A golden axe",
          "A silver axe",
          "An ordinary iron axe",
          "A new steel axe",
        ],
        correctAnswer: "An ordinary iron axe",
      },
      {
        id: "q2",
        question: "What did the boy ask about the god?",
        choices: [
          "Why was the woodcutter poor?",
          "Where was the lake?",
          "Who was the god?",
          "If the god already knew whose axe it was, why didn't he just give it back?",
        ],
        correctAnswer:
          "If the god already knew whose axe it was, why didn't he just give it back?",
      },
      {
        id: "q3",
        question: "How many employees did his company have?",
        choices: ["Eight", "Forty", "Two", "Twenty"],
        correctAnswer: "Eight",
      },
      {
        id: "q4",
        question: "What did everyone tell him about hiring his old friend?",
        choices: ["Hire him today.", "Don't do it.", "Call the police.", "Give him money."],
        correctAnswer: "Don't do it.",
      },
      {
        id: "q5",
        question: "How much was missing from the envelope?",
        choices: [
          "One thousand yen",
          "One million yen",
          "Twenty thousand yen",
          "Fifty thousand yen",
        ],
        correctAnswer: "Twenty thousand yen",
      },
    ],
  },
  {
    slug: "the-ant-and-the-grasshopper",
    title: "The Ant and the Grasshopper",
    seriesTitle: "Fourth Period",
    sourcePath: "content/stories/fourth-period/en/the-ant-and-the-grasshopper.md",
    contentType: "series-chapter",
    continueUrl: "/stories/fourth-period/chapter-4",
    questions: [
      {
        id: "q1",
        question: "What did the grasshopper do while the ant worked?",
        choices: [
          "It stored food",
          "It slept all winter",
          "It built a house",
          "It sang songs and played",
        ],
        correctAnswer: "It sang songs and played",
      },
      {
        id: "q2",
        question: "What did the girl ask?",
        choices: [
          "Was the ant happy, working all the time?",
          "Did the grasshopper die?",
          "Where did the ant live?",
          "Who wrote the story?",
        ],
        correctAnswer: "Was the ant happy, working all the time?",
      },
      {
        id: "q3",
        question: "How old was she thirty years later?",
        choices: ["Ten", "Forty", "Twenty-five", "Twenty"],
        correctAnswer: "Forty",
      },
      {
        id: "q4",
        question: "How long had her coworker worked at that company?",
        choices: ["One year", "Six months", "Twenty-five years", "Forty years"],
        correctAnswer: "Twenty-five years",
      },
      {
        id: "q5",
        question: "Who was in the photograph that slipped from the wallet?",
        choices: ["The teacher", "A friend from school", "The ant", "Her coworker’s son"],
        correctAnswer: "Her coworker’s son",
      },
    ],
  },
  {
    slug: "milk",
    title: "Milk",
    seriesTitle: "Fourth Period",
    sourcePath: "content/stories/fourth-period/en/milk.md",
    contentType: "series-chapter",
    questions: [
      {
        id: "q1",
        question: "What did the teacher say she would not talk about?",
        choices: ["The textbook", "The cows", "The cooperative", "The loans"],
        correctAnswer: "The textbook",
      },
      {
        id: "q2",
        question: "What animals did the man raise?",
        choices: ["Chickens", "Cows", "Horses", "Sheep"],
        correctAnswer: "Cows",
      },
      {
        id: "q3",
        question: "What stayed almost the same while other costs rose?",
        choices: [
          "The price of feed",
          "The price of fuel",
          "The milk payments",
          "The price of electricity",
        ],
        correctAnswer: "The milk payments",
      },
      {
        id: "q4",
        question: "What happened two years later?",
        choices: [
          "He sold the cows",
          "The children left",
          "Feed became free",
          "The cooperative acquired that feed company",
        ],
        correctAnswer: "The cooperative acquired that feed company",
      },
      {
        id: "q5",
        question: "What did he do the next morning?",
        choices: [
          "He quit",
          "He still fed the cows",
          "He closed the farm",
          "He sold the milk",
        ],
        correctAnswer: "He still fed the cows",
      },
    ],
  },
];

import type { ReadingQuestion } from "@/features/reading-test/types";

/** Questions only. The published English text stays in the library catalog. */
export const flashTests: readonly {
  slug: string;
  questions: readonly ReadingQuestion[];
}[] = [
  {
    slug: "the-day-i-couldnt-find-anyone",
    questions: [
      {
        id: "q1",
        question: "What did the narrator lose?",
        choices: ["A phone", "A wallet", "A house key", "A paper map"],
        correctAnswer: "A phone",
      },
      {
        id: "q2",
        question: "Where had the suburb been built?",
        choices: [
          "Along a river",
          "On flat farmland",
          "Into a hillside",
          "Beside a station",
        ],
        correctAnswer: "Into a hillside",
      },
      {
        id: "q3",
        question: "Which way to the friend’s house did the narrator still remember?",
        choices: [
          "Second left, then the blue gate",
          "Straight past the supermarket",
          "Down to the sea road",
          "Third right, left at the park, white house",
        ],
        correctAnswer: "Third right, left at the park, white house",
      },
      {
        id: "q4",
        question: "What did the woman at the bus company say about the phone?",
        choices: [
          "It was on the next bus",
          "Nothing's been turned in",
          "A driver would bring it",
          "It had been mailed",
        ],
        correctAnswer: "Nothing's been turned in",
      },
      {
        id: "q5",
        question: "Where was the phone at the end?",
        choices: [
          "On the park bench",
          "Inside a mailbox",
          "Partly submerged in muddy water",
          "Under a car",
        ],
        correctAnswer: "Partly submerged in muddy water",
      },
    ],
  },
  {
    slug: "lost-property",
    questions: [
      {
        id: "q1",
        question: "When did the man say he lost something?",
        choices: ["This morning", "Last week", "One year ago", "Thirty years ago"],
        correctAnswer: "Thirty years ago",
      },
      {
        id: "q2",
        question: "What did he call the lost item?",
        choices: ["A gray coat", "Weight", "A name", "A key"],
        correctAnswer: "Weight",
      },
      {
        id: "q3",
        question: "Where did the woman say the item was?",
        choices: ["Over there", "On the desk", "Outside the window", "In his pocket"],
        correctAnswer: "Over there",
      },
      {
        id: "q4",
        question: "What happened when the man pushed the gray object?",
        choices: ["It rolled away", "It broke", "It did not move", "It became warm"],
        correctAnswer: "It did not move",
      },
      {
        id: "q5",
        question: "What was inside his right pocket at the end?",
        choices: ["A coin", "A folded note", "The registry key", "Nothing"],
        correctAnswer: "Nothing",
      },
    ],
  },
  {
    slug: "after-the-rain",
    questions: [
      {
        id: "q1",
        question: "Where did the narrator shelter from the rain?",
        choices: [
          "Inside the station",
          "Under a tree",
          "Beneath a secondhand bookshop awning",
          "In a bus",
        ],
        correctAnswer: "Beneath a secondhand bookshop awning",
      },
      {
        id: "q2",
        question: "What did the old man say the hill used to be, the first time?",
        choices: ["Under the sea", "A forest", "A town", "A bridge"],
        correctAnswer: "Under the sea",
      },
      {
        id: "q3",
        question: "What did he say it was, the second time?",
        choices: ["Still the sea", "A desert", "A lake", "A road"],
        correctAnswer: "A desert",
      },
      {
        id: "q4",
        question: "What did the old man drag over the ground?",
        choices: [
          "His shoe",
          "A closed book",
          "A wet newspaper",
          "The tip of his umbrella",
        ],
        correctAnswer: "The tip of his umbrella",
      },
      {
        id: "q5",
        question: "At the end, what did the narrator tell the two men?",
        choices: [
          "No, this hill used to be under the sea.",
          "It was a desert.",
          "This used to be the top of a mountain.",
          "I have not smelled the sea yet.",
        ],
        correctAnswer: "No, this hill used to be under the sea.",
      },
    ],
  },
  {
    slug: "the-silver-thread",
    questions: [
      {
        id: "q1",
        question: "Where did the silver thread rise?",
        choices: [
          "From a harbor wall",
          "From a seam in the exposed rock at a mountain summit",
          "From the floor of a school",
          "Across a field",
        ],
        correctAnswer: "From a seam in the exposed rock at a mountain summit",
      },
      {
        id: "q2",
        question: "What happened when they tried to cut the thread?",
        choices: [
          "A diamond blade cut it in half",
          "It fell to the ground",
          "Fire burned it away",
          "Diamond blades and a laser left no mark",
        ],
        correctAnswer: "Diamond blades and a laser left no mark",
      },
      {
        id: "q3",
        question: "What did the young girl tie to the thread first?",
        choices: ["A red ribbon", "A gold ring", "A train ticket", "A glass bottle"],
        correctAnswer: "A red ribbon",
      },
      {
        id: "q4",
        question: "What was under the mountain, at the center of the chamber?",
        choices: [
          "A buried train",
          "A locked library",
          "A spiral staircase",
          "A row of houses",
        ],
        correctAnswer: "A spiral staircase",
      },
      {
        id: "q5",
        question: "What could the girl no longer remember when she returned to the surface?",
        choices: [
          "The color of the ribbon",
          "Her own name",
          "The way down the stairs",
          "The survey team’s report",
        ],
        correctAnswer: "Her own name",
      },
    ],
  },
];

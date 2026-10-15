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
        question: "What does RIS use to build the narrator's profile before asking for his choices?",
        choices: ["His search, call and writing history","Only his favorite music","A questionnaire filled out by his friends","A photo taken at the university"],
        correctAnswer: "His search, call and writing history",
      },
      {
        id: "q4",
        question: "How does the narrator handle the personality setup after naming Mia?",
        choices: ["He adjusts every option carefully","He chooses a voice and skips the other settings","He asks a friend to choose for him","He removes RIS from the device"],
        correctAnswer: "He chooses a voice and skips the other settings",
      },
      {
        id: "q5",
        question: "What is left on the screen when his friends ask what personality he picked?",
        choices: ["The settings page","A blank confirmation form","Only Mia","A list of his friends"],
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
        question: "Which question does the boy keep rehearsing before he sees the girl?",
        choices: ["What are you playing at the recital?","Do you want to leave the studio?","Did you read the newspaper?","Can you lend me your book?"],
        correctAnswer: "What are you playing at the recital?",
      },
      {
        id: "q4",
        question: "How did the boy's friend first learn about the girl?",
        choices: ["He met her after a lesson","He saw a recital group photo in the boy's wallet","He read a letter from her","He heard her speaking on the phone"],
        correctAnswer: "He saw a recital group photo in the boy's wallet",
      },
      {
        id: "q5",
        question: "What do the boy and the girl actually say when they pass each other?",
        choices: ["They discuss the recital","They arrange to meet after class","They exchange only a greeting","He asks the question he has rehearsed"],
        correctAnswer: "They exchange only a greeting",
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
        question: "How does the boy's remark differ from his classmates' answers about the race?",
        choices: ["He says the tortoise cheated","He points out that the hare would have won without sleeping","He says the race was imaginary","He asks why the mountain is so high"],
        correctAnswer: "He points out that the hare would have won without sleeping",
      },
      {
        id: "q4",
        question: "How does the adult worker respond to his own mistakes?",
        choices: ["He forgets them as soon as work ends","He blames his coworker","He keeps thinking about them after work","He refuses to correct the reports"],
        correctAnswer: "He keeps thinking about them after work",
      },
      {
        id: "q5",
        question: "What does he do at his desk after his coworker's promotion?",
        choices: ["He starts tomorrow's report again from the first page","He throws away his certificates","He writes a resignation letter","He calls a client to complain"],
        correctAnswer: "He starts tomorrow's report again from the first page",
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
        question: "Why does the narrator erase a message proposing a reunion with his old friends?",
        choices: ["He expects he would ask about the cost and decline","He has lost all their phone numbers","He wants to invite only his manager","The group chat has already closed"],
        correctAnswer: "He expects he would ask about the cost and decline",
      },
      {
        id: "q4",
        question: "Which everyday habit continues even as his investments grow?",
        choices: ["Buying drinks at the supermarket to save a little","Buying a new watch after each raise","Taking expensive holidays every month","Eating dinner at a luxury restaurant"],
        correctAnswer: "Buying drinks at the supermarket to save a little",
      },
      {
        id: "q5",
        question: "What happens to his sense of the days after he leaves work?",
        choices: ["He follows the old shift schedule exactly","He eventually cannot remember what day it is","He starts working nights instead","He checks the calendar every hour"],
        correctAnswer: "He eventually cannot remember what day it is",
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
        question: "What does the narrator do before taking a sip of coffee on his break?",
        choices: ["He checks how much break time remains","He calls his family","He leaves the station","He changes into ordinary clothes"],
        correctAnswer: "He checks how much break time remains",
      },
      {
        id: "q4",
        question: "Which announcement repeats while the train remains stopped?",
        choices: ["The train has arrived early","No estimated time of resumption","All passengers must leave the station","The final train has departed"],
        correctAnswer: "No estimated time of resumption",
      },
      {
        id: "q5",
        question: "What do people do after the stopped train finally starts moving again?",
        choices: ["They begin to flow forward again","They stay completely still until night","They all go home on foot","They stop using their phones forever"],
        correctAnswer: "They begin to flow forward again",
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
        question: "How does the owner win business despite not being good at selling himself?",
        choices: ["Clients recommend him to other clients","He buys an expensive advertisement","He hires an advertising agency","He offers free gold axes"],
        correctAnswer: "Clients recommend him to other clients",
      },
      {
        id: "q4",
        question: "What does the owner do after learning the client's envelope is short?",
        choices: ["He ignores the complaint","He replaces the missing money from his own wallet","He asks his staff to divide the loss","He reports that the envelope was never delivered"],
        correctAnswer: "He replaces the missing money from his own wallet",
      },
      {
        id: "q5",
        question: "What does the old friend admit about taking the money?",
        choices: ["He thought carefully about how not to get caught","He wanted to repay a bank loan","He had accidentally dropped it","He had asked the client for permission"],
        correctAnswer: "He thought carefully about how not to get caught",
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
        question: "Which routine is repeated in the passages describing prison life?",
        choices: ["Roll call, work, noon, work, lights out","Music lessons, lunch, a train ride","School, a recital, dinner, homework","Shopping, driving, watching television"],
        correctAnswer: "Roll call, work, noon, work, lights out",
      },
      {
        id: "q4",
        question: "What does the coworker reveal when a photograph falls from her wallet?",
        choices: ["It shows her son, now in high school","It shows a former boss","It shows a childhood teacher","It shows the two women at school"],
        correctAnswer: "It shows her son, now in high school",
      },
      {
        id: "q5",
        question: "What does the woman see in the rearview mirror as she drives away?",
        choices: ["Her coworker riding a bicycle","Her old prison building","A train entering a station","The photograph on the road"],
        correctAnswer: "Her coworker riding a bicycle",
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
        question: "Why does the farmer begin buying feed from another company?",
        choices: ["The cooperative stops trading with him after a delayed payment","His cows refuse the original feed","He decides to stop raising cattle","The local farmers vote to move away"],
        correctAnswer: "The cooperative stops trading with him after a delayed payment",
      },
      {
        id: "q4",
        question: "What changes two years after he finds another feed supplier?",
        choices: ["The cooperative buys that supplier","Feed becomes free","He receives a government award","The farm is sold"],
        correctAnswer: "The cooperative buys that supplier",
      },
      {
        id: "q5",
        question: "What does the farmer still do the next morning despite his anger?",
        choices: ["He feeds the cows","He moves all the cattle to a new farm","He closes the cooperative","He refuses to get out of bed"],
        correctAnswer: "He feeds the cows",
      },
    ],
  },
];

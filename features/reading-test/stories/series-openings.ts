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
      {
        id: "q6",
        question: "What does the friend say caused his AI to stay upset?",
        choices: ["Mentioning another girl's name","Turning off the device overnight","Forgetting to charge the device","Missing a meeting"],
        correctAnswer: "Mentioning another girl's name",
      },
      {
        id: "q7",
        question: "How long does the friend say his AI stayed upset?",
        choices: ["About three hours","A whole week","Ten minutes","Until the next morning"],
        correctAnswer: "About three hours",
      },
      {
        id: "q8",
        question: "How much did the friend customize his AI at the beginning?",
        choices: ["He changed only a few things","He wrote all its replies by hand","He hired someone to program it","He changed its settings every day"],
        correctAnswer: "He changed only a few things",
      },
      {
        id: "q9",
        question: "What does a friend compare using RIS to?",
        choices: ["Having a girlfriend","Taking a university exam","Playing a sports game","Buying a train ticket"],
        correctAnswer: "Having a girlfriend",
      },
      {
        id: "q10",
        question: "What do the friends say a user can do with RIS at bedtime?",
        choices: ["Stay on a call until falling asleep","Use it to turn off every streetlight","Ask it to change the weather","Watch a live concert through it"],
        correctAnswer: "Stay on a call until falling asleep",
      },
      {
        id: "q11",
        question: "What is already true of RIS when the narrator opens it?",
        choices: ["It is installed on his device","It requires a new computer","It has been removed by a friend","It can only be used at the university"],
        correctAnswer: "It is installed on his device",
      },
      {
        id: "q12",
        question: "What is missing before RIS starts collecting the narrator's data?",
        choices: ["A confirmation screen","An internet connection","A list of names","A password field"],
        correctAnswer: "A confirmation screen",
      },
      {
        id: "q13",
        question: "What does the RIS abbreviation stand for on the display?",
        choices: ["Relation Interface System","Remote Identity Service","Realtime Information Search","Regional Internet Station"],
        correctAnswer: "Relation Interface System",
      },
      {
        id: "q14",
        question: "Why does the narrator choose the name Mia?",
        choices: ["It is easy for him to say","It is the name printed on the device","His friends vote for it","It is required by the software"],
        correctAnswer: "It is easy for him to say",
      },
      {
        id: "q15",
        question: "What begins appearing on screen after the narrator skips most settings?",
        choices: ["An outline of an unfinished face","A video of his friends","A list of university grades","A map of the city"],
        correctAnswer: "An outline of an unfinished face",
      },
      {
        id: "q16",
        question: "What does Mia say when she first speaks?",
        choices: ["Nice to meet you","Your train is leaving","Please restart the system","The meeting is canceled"],
        correctAnswer: "Nice to meet you",
      },
      {
        id: "q17",
        question: "What does Mia say she already has of the narrator?",
        choices: ["A partial understanding","A complete memory of his childhood","A photograph of his room","A list of his friends' passwords"],
        correctAnswer: "A partial understanding",
      },
      {
        id: "q18",
        question: "What does Mia say she will adapt to?",
        choices: ["The narrator's daily patterns","The university's class schedule alone","The personality chosen by his friend","The weather outside the lounge"],
        correctAnswer: "The narrator's daily patterns",
      },
      {
        id: "q19",
        question: "What possibility does Mia mention while the friends keep asking about her?",
        choices: ["Relational adjustments can be made","The device will delete the narrator's files","Every friend must install a new application","His chosen voice cannot be changed"],
        correctAnswer: "Relational adjustments can be made",
      },
      {
        id: "q20",
        question: "How does the narrator's response to his friends end?",
        choices: ["He looks at the screen without giving them a clear answer","He reads his entire settings list aloud","He uninstalls RIS in front of everyone","He asks the teacher for advice"],
        correctAnswer: "He looks at the screen without giving them a clear answer",
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
      {
        id: "q6",
        question: "What is the boy hoping to ask at the piano studio?",
        choices: ["What piece the girl will play at the recital","Whether the teacher will cancel his lesson","How much a new piano costs","Where his friend went after school"],
        correctAnswer: "What piece the girl will play at the recital",
      },
      {
        id: "q7",
        question: "Why does the boy imagine saying 'Oh, cool'?",
        choices: ["He may not recognize the title she tells him","He has already won a recital prize","His friend has found a lost photograph","The teacher has offered him a concert ticket"],
        correctAnswer: "He may not recognize the title she tells him",
      },
      {
        id: "q8",
        question: "What gives the friend a reason to tease the boy during class?",
        choices: ["He catches the boy smiling","He sees the boy running to school","He hears the boy singing loudly","He finds a letter on the teacher's desk"],
        correctAnswer: "He catches the boy smiling",
      },
      {
        id: "q9",
        question: "What nickname does the friend use for the girl?",
        choices: ["The piano girl","The girl from the library","The red-ribbon girl","The new student"],
        correctAnswer: "The piano girl",
      },
      {
        id: "q10",
        question: "What happens when the boy opens his wallet at lunch in the earlier incident?",
        choices: ["A corner of a folded recital photo slips out","A train ticket blows across the table","He finds a note from the teacher","His money falls under a chair"],
        correctAnswer: "A corner of a folded recital photo slips out",
      },
      {
        id: "q11",
        question: "How much does the boy finally tell his friend about the girl at first?",
        choices: ["Only that she is a girl from piano","That they have been dating","That she has moved away","That she is his cousin"],
        correctAnswer: "Only that she is a girl from piano",
      },
      {
        id: "q12",
        question: "What interrupts the boys' quiet conversation in class?",
        choices: ["The teacher looks in their direction","The bell rings for lunch","The girl enters the classroom","The boy's phone rings"],
        correctAnswer: "The teacher looks in their direction",
      },
      {
        id: "q13",
        question: "What does the boy discover in his notebook after being distracted?",
        choices: ["He has written the same number twice","He has copied the wrong page","He has drawn the piano studio","He has forgotten his name"],
        correctAnswer: "He has written the same number twice",
      },
      {
        id: "q14",
        question: "What does the boy recognize before he opens the piano studio door?",
        choices: ["The piece of music coming from inside","The girl's voice calling his name","His friend's laughter from school","The sound of a train arriving"],
        correctAnswer: "The piece of music coming from inside",
      },
      {
        id: "q15",
        question: "How did he first discover who was playing that familiar piece?",
        choices: ["He opened the door and saw her at the piano","The teacher told him on the phone","His friend sent him a photograph","He read her name on a poster"],
        correctAnswer: "He opened the door and saw her at the piano",
      },
      {
        id: "q16",
        question: "What does the teacher ask the boy to do when he arrives?",
        choices: ["Sit and give them a minute","Play his recital piece immediately","Leave and come back next week","Help move the piano"],
        correctAnswer: "Sit and give them a minute",
      },
      {
        id: "q17",
        question: "What correction does the teacher give the girl while she practices?",
        choices: ["She is still rushing part of the piece","She should play an entirely different instrument","She has missed her lesson time","She must close the music book"],
        correctAnswer: "She is still rushing part of the piece",
      },
      {
        id: "q18",
        question: "What marks the moment when the girl's lesson ends?",
        choices: ["She closes her music book and stands up","A new student walks in with a violin","The lights in the studio go out","The boy's friend calls him"],
        correctAnswer: "She closes her music book and stands up",
      },
      {
        id: "q19",
        question: "When does the teacher tell the boy it is his turn?",
        choices: ["As the girl finishes and they pass one another","Before he reaches the studio","After he goes home","While he is still at school"],
        correctAnswer: "As the girl finishes and they pass one another",
      },
      {
        id: "q20",
        question: "What does the boy do before touching the first piano key at the end?",
        choices: ["He looks once at the closed door","He opens the window","He checks the clock again","He calls his friend"],
        correctAnswer: "He looks once at the closed door",
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

import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `Chapter 1: The Crowd

Morning.

The station.

People.

People.

People.

Every time the ticket gates opened, another wave spilled through.

“…Move.”

I muttered it under my breath.

Not to anyone in particular.

A man in a suit walked ahead of me, slower than everyone around him.

A group of high school students took up half the walkway, laughing too loudly.

A woman with a suitcase stopped without warning.

“Seriously?”

I clicked my tongue.

No one looked at me.

I didn’t really look at anyone either.

I didn’t remember their faces.

I didn’t know their names.

At school, I dropped into my seat.

“Morning.”

“Morning.”

A friend leaned over and held out his phone.

“Look at this.”

Someone fell on the screen.

Comments rolled past underneath.

“NPC behavior.”

“Background character.”

“No presence at all.”

“This is hilarious.”

Everyone laughed.

I laughed too.

At lunch, someone pointed down the hallway.

“Isn’t he basically an NPC?”

“More like some random event character.”

“He barely even feels real.”

They laughed again.

No one sounded angry.

No one looked like they meant anything by it.

After school, I was back at the station.

More people.

More noise.

The crowd slowed near the ticket gates.

“Move.”

Just one word.

Nothing more.

I wasn’t thinking about anyone at all.

.

.

.

.

.

.

To be continued.`;

export const theMonsterChapter1: ReadingStoryInput = {
  slug: "the-monster-chapter-1",
  title: "The Monster",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body,
  questions: [
    {
      id: "q1",
      question: "Where does Chapter 1 begin?",
      choices: ["At school", "At the station", "In a hallway", "On a train"],
      correctAnswer: "At the station",
    },
    {
      id: "q2",
      question: "What does the narrator mutter at the station?",
      choices: ["“Morning.”", "“…Move.”", "“Seriously?”", "“Look at this.”"],
      correctAnswer: "“…Move.”",
    },
    {
      id: "q3",
      question: "How does the narrator respond while his classmates watch the falling person on a phone?",
      choices: ["He laughs along with them","He tells the teacher to stop the video","He leaves the classroom immediately","He calls the person in the video"],
      correctAnswer: "He laughs along with them",
    },
    {
      id: "q4",
      question: "How do the students describe people they are laughing about?",
      choices: ["As NPCs and background characters","As professional athletes","As famous musicians","As their new teachers"],
      correctAnswer: "As NPCs and background characters",
    },
    {
      id: "q5",
      question: "What happens again when the narrator returns to the station after school?",
      choices: ["He mutters 'Move' while paying little attention to individuals","He apologizes to everyone in the crowd","He recognizes every passenger by name","He gives a speech beside the ticket gates"],
      correctAnswer: "He mutters 'Move' while paying little attention to individuals",
    },
    {
      id: "q6",
      question: "Which group blocks part of the walkway during the morning commute?",
      choices: ["High school students","Office cleaners","Police officers","Store employees"],
      correctAnswer: "High school students",
    },
    {
      id: "q7",
      question: "Why does the narrator click his tongue while walking?",
      choices: ["A woman with a suitcase stops unexpectedly","He misses his train by hours","Someone calls his name","His bag breaks"],
      correctAnswer: "A woman with a suitcase stops unexpectedly",
    },
    {
      id: "q8",
      question: "How does the narrator describe his awareness of the commuters?",
      choices: ["He does not remember their faces or names","He knows almost everyone there","He keeps a list of their names","He recognizes them from school"],
      correctAnswer: "He does not remember their faces or names",
    },
    {
      id: "q9",
      question: "What does the friend show the narrator at school?",
      choices: ["Something on his phone","A photograph on a classroom wall","A letter from the teacher","An envelope from a station"],
      correctAnswer: "Something on his phone",
    },
    {
      id: "q10",
      question: "Where does another student point when calling someone an NPC later in the day?",
      choices: ["Down the hallway","Toward the train","At the teacher's desk","At the school gate"],
      correctAnswer: "Down the hallway",
    },
  ],
};

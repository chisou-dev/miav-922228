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
        question: "What is one of the comments that rolled past underneath?",
      choices: [
        "“NPC behavior.”",
        "“Call the teacher.”",
        "“He knows everyone.”",
        "“Turn it off.”",
      ],
      correctAnswer: "“NPC behavior.”",
    },
    {
      id: "q4",
      question: "What does someone say at lunch?",
      choices: [
        "“Isn’t he basically an NPC?”",
        "“He just arrived.”",
        "“Don’t look at the phone.”",
        "“The gates are closed.”",
      ],
      correctAnswer: "“Isn’t he basically an NPC?”",
    },
    {
      id: "q5",
      question: "What does the narrator say he was not doing at the end?",
      choices: [
        "Walking to school",
        "Thinking about anyone at all",
        "Holding a suitcase",
        "Laughing at the screen",
      ],
      correctAnswer: "Thinking about anyone at all",
    },
  ],
};

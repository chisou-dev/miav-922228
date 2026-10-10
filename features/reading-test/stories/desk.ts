import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `The bottom drawer on the right side of the desk.

The metal handle is slightly tarnished.

When I pull it, the wood whispers with a low, scraping sound.

The back is dark.

Not even daylight reaches it.

Inside is an envelope.

White paper.

In the corner, today’s date, written small.

It hasn’t been sealed yet.

Only the crease runs perfectly straight.

You still can’t reach this drawer.

You stretch up on your toes, resting your chin on the edge of the desk.

“What’s inside?” you ask.

I correct myself: “Something important.”

The envelope holds the present me.

The doubts I carry.

The fears I keep.

Even so, the things I hide when I’m with you.

On nights when my breathing carries down the hall,
I sit at the desk and write this.

I close the drawer.

The sound is brief, sinking into the room.

By the time you open it,
I will have grown a little older.

Even then, on this page,
I will still be looking up at you.`;

export const desk: ReadingStoryInput = {
  slug: "desk",
  title: "Desk",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body,
  questions: [
    {
      id: "q1",
      question: "Which drawer does the narrator open?",
      choices: [
        "The top drawer",
        "The bottom drawer on the right",
        "A drawer in the kitchen",
        "The left-hand drawer",
      ],
      correctAnswer: "The bottom drawer on the right",
    },
    {
      id: "q2",
      question: "What is inside the drawer?",
      choices: ["A key", "A photograph", "An envelope", "A coin"],
      correctAnswer: "An envelope",
    },
    {
      id: "q3",
      question: "What is written in the corner of the paper?",
      choices: ["A name", "Today’s date", "An address", "Nothing"],
      correctAnswer: "Today’s date",
    },
    {
      id: "q4",
      question: "What does the narrator say is inside?",
      choices: [
        "Nothing at all",
        "A map",
        "A ticket",
        "Something important",
      ],
      correctAnswer: "Something important",
    },
    {
      id: "q5",
      question: "What will the narrator still be doing on the page?",
      choices: [
        "Closing the drawer",
        "Looking up at you",
        "Sealing the envelope",
        "Leaving the room",
      ],
      correctAnswer: "Looking up at you",
    },
  ],
};

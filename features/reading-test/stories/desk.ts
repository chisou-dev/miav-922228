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
      question: "Why does the child stretch up on tiptoe by the desk?",
      choices: ["The drawer is still too high to reach","The child is looking out of a window","There is a toy on the ceiling","The child is opening a cupboard"],
      correctAnswer: "The drawer is still too high to reach",
    },
    {
      id: "q4",
      question: "What does the narrator say the envelope holds?",
      choices: ["The present self, including doubts and fears","A train ticket and an address","A photograph of an unknown person","The key to the drawer"],
      correctAnswer: "The present self, including doubts and fears",
    },
    {
      id: "q5",
      question: "What will be different by the time the addressee can open the envelope?",
      choices: ["The narrator will have grown older","The desk will have been moved outside","The drawer will no longer exist","The date will have disappeared"],
      correctAnswer: "The narrator will have grown older",
    },
    {
      id: "q6",
      question: "What detail shows the envelope is not yet ready to be sent?",
      choices: ["It has not been sealed","It has no paper inside","It has been torn in half","It has no date"],
      correctAnswer: "It has not been sealed",
    },
    {
      id: "q7",
      question: "Where is the date written on the envelope?",
      choices: ["Small, in a corner","Across the whole desk","On the outside of the drawer","On a calendar hanging above"],
      correctAnswer: "Small, in a corner",
    },
    {
      id: "q8",
      question: "What sound accompanies the narrator pulling the drawer?",
      choices: ["A low scraping sound","A loud chime","A bell ringing","Water flowing"],
      correctAnswer: "A low scraping sound",
    },
    {
      id: "q9",
      question: "What does the child rest against the edge of the desk?",
      choices: ["Their chin","Their feet","A school bag","An open book"],
      correctAnswer: "Their chin",
    },
    {
      id: "q10",
      question: "What does the narrator do after writing on nights when their breathing carries down the hall?",
      choices: ["Closes the drawer","Posts the letter immediately","Throws the envelope away","Leaves the house"],
      correctAnswer: "Closes the drawer",
    },
  ],
};

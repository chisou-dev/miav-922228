import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `Inside the box.

A white edge
slightly exposed.

Inside,
they rest quietly
in a line.

Front
and back.

The box
does not move.

A finger arrives.

One sheet
is pulled.

A faint
sliding sound.

The next white edge.

A clean triangle
appears.

Slightly higher
than before.

The paper opens.

At the mouth of the box
another white edge
waits.

Just a little
farther out
than before.`;

export const tissue: ReadingStoryInput = {
  slug: "tissue",
  title: "Tissue",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body,
  questions: [
    {
      id: "q1",
      question: "Where does the poem begin?",
      choices: ["On a table", "Inside the box", "In a pocket", "On the floor"],
      correctAnswer: "Inside the box",
    },
    {
      id: "q2",
      question: "What arrives?",
      choices: ["A finger", "A window", "A cup", "A door"],
      correctAnswer: "A finger",
    },
    {
      id: "q3",
      question: "After a finger appears, what happens next?",
      choices: ["One sheet is pulled out","The box falls over","A lid slams shut","Water spills into the box"],
      correctAnswer: "One sheet is pulled out",
    },
    {
      id: "q4",
      question: "Which sound accompanies the movement of the tissue?",
      choices: ["A loud crack","A faint sliding sound","A telephone ringing","Footsteps at the door"],
      correctAnswer: "A faint sliding sound",
    },
    {
      id: "q5",
      question: "How does the final image return to an earlier detail?",
      choices: ["Another white edge is visible at the opening","The box has been thrown away","The tissue turns brown","The drawer is locked"],
      correctAnswer: "Another white edge is visible at the opening",
    },
  ],
};

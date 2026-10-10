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
      question: "What is pulled?",
      choices: ["The box", "A thread", "One sheet", "A triangle of glass"],
      correctAnswer: "One sheet",
    },
    {
      id: "q4",
      question: "What sound does the poem name?",
      choices: [
        "A loud tear",
        "A bell",
        "Rain on the lid",
        "A faint sliding sound",
      ],
      correctAnswer: "A faint sliding sound",
    },
    {
      id: "q5",
      question: "What waits at the mouth of the box?",
      choices: ["Another white edge", "An empty space", "A closed lid", "A wet sheet"],
      correctAnswer: "Another white edge",
    },
  ],
};

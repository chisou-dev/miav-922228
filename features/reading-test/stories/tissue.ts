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
    {
      id: "q6",
      question: "How are the tissues arranged inside the box?",
      choices: ["In a line","In a circle","On a shelf","In separate envelopes"],
      correctAnswer: "In a line",
    },
    {
      id: "q7",
      question: "What shape becomes visible after one sheet is pulled?",
      choices: ["A clean triangle","A rough circle","A square window","A narrow spiral"],
      correctAnswer: "A clean triangle",
    },
    {
      id: "q8",
      question: "Compared with the first edge, where does the next one appear?",
      choices: ["Slightly higher","Beneath the box","On the floor","At the back of a drawer"],
      correctAnswer: "Slightly higher",
    },
    {
      id: "q9",
      question: "What follows the faint sliding sound?",
      choices: ["The next white edge appears","The box is closed","The hand drops a coin","The paper changes color"],
      correctAnswer: "The next white edge appears",
    },
    {
      id: "q10",
      question: "What is different about the final visible white edge?",
      choices: ["It sticks out a little farther than before","It has turned brown","It has been folded inside","It is hidden beneath a book"],
      correctAnswer: "It sticks out a little farther than before",
    },
  ],
};

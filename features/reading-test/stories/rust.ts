import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `It appears
at the corner of the balcony rail.

From a tear in the paint
brown begins to seep,
raising a rough, granular skin.

Dry fragments fall.
Powder drifts away with the wind.
Even beneath the white coat
thin lines begin to surface.

With each rain
the lines grow thicker.
The corner breaks first.

Still holding its shape,
it turns to dust
and returns to earth.`;

export const rust: ReadingStoryInput = {
  slug: "rust",
  title: "Rust",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body,
  questions: [
    {
      id: "q1",
      question: "Where does it appear?",
      choices: [
        "On a window frame",
        "Under the floor",
        "At the corner of the balcony rail",
        "Along a drain",
      ],
      correctAnswer: "At the corner of the balcony rail",
    },
    {
      id: "q2",
      question: "What begins to seep from a tear in the paint?",
      choices: ["Water", "Brown", "White paint", "Dust"],
      correctAnswer: "Brown",
    },
    {
      id: "q3",
      question: "What drifts away with the wind?",
      choices: ["The rail", "A coat", "Powder", "The corner"],
      correctAnswer: "Powder",
    },
    {
      id: "q4",
      question: "What happens with each rain?",
      choices: [
        "The lines grow thicker",
        "The paint turns white",
        "The rail is replaced",
        "The powder returns",
      ],
      correctAnswer: "The lines grow thicker",
    },
    {
      id: "q5",
      question: "What does it become at the end?",
      choices: ["Paint", "A rail", "Dust", "Rain"],
      correctAnswer: "Dust",
    },
  ],
};

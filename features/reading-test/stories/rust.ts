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
      question: "How does the damage spread beyond the first tear in the paint?",
      choices: ["Thin lines appear beneath the white coat","The railing becomes completely new","A shadow covers the wall","The paint repairs itself"],
      correctAnswer: "Thin lines appear beneath the white coat",
    },
    {
      id: "q4",
      question: "What happens as the rain returns?",
      choices: ["The lines thicken and the corner begins to break","The powder becomes fresh paint","The rust stops spreading","The rail is removed at once"],
      correctAnswer: "The lines thicken and the corner begins to break",
    },
    {
      id: "q5",
      question: "What happens to the damaged part while it still holds its shape?",
      choices: ["It turns to dust and returns to earth","It grows into a new railing","It floats away whole","It turns back into white paint"],
      correctAnswer: "It turns to dust and returns to earth",
    },
  ],
};

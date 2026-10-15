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
    {
      id: "q6",
      question: "What changes the smooth surface into something rough?",
      choices: ["Brown rust seeping through damaged paint","Sand blowing onto the rail","A new coat of varnish","Wet leaves piling up"],
      correctAnswer: "Brown rust seeping through damaged paint",
    },
    {
      id: "q7",
      question: "What happens to some of the dry fragments?",
      choices: ["They fall and powder drifts away in the wind","They turn into fresh paint","They become attached to a new rail","They float inside the house"],
      correctAnswer: "They fall and powder drifts away in the wind",
    },
    {
      id: "q8",
      question: "Where do new fine lines appear even though paint remains?",
      choices: ["Beneath the white coat","On the window glass","In the soil far away","On the ceiling"],
      correctAnswer: "Beneath the white coat",
    },
    {
      id: "q9",
      question: "Which part of the railing breaks first?",
      choices: ["The corner","The center of the long bar","The lowest support","The handle of the door"],
      correctAnswer: "The corner",
    },
    {
      id: "q10",
      question: "What does the closing image keep together?",
      choices: ["The object still has its shape while becoming dust","The railing becomes stronger with each rain","The rust is washed off entirely","The corner is repaired with new metal"],
      correctAnswer: "The object still has its shape while becoming dust",
    },
  ],
};

import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `Soil is made of grains.
Dry, it is light.
Wet, it grows heavy.

The same ground
has been opened
again and again.

Flags were raised
and later fell.

Iron rusts.
Cloth tears.
Bones grow light.

What grows light
mixes with the soil.

Lines were drawn.
Maps were made.

Rain
does not read maps.

The wind
knows no countries, either.

Footsteps overlap.
Layers overlap.

Every layer
was once
“now.”

And if someday
you stand here,

something beneath your feet
may give way.

That is
the weight
of what was here.

And if someone
begins to dig again,

to the soil
it is all the same.

The soil receives.

Slowly,
it settles flat.`;

export const layers: ReadingStoryInput = {
  slug: "layers",
  title: "Layers",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body,
  questions: [
    {
      id: "q1",
      question: "What does the poem say soil is made of?",
      choices: ["Flags", "Grains", "Maps", "Cloth"],
      correctAnswer: "Grains",
    },
    {
      id: "q2",
      question: "What does the poem say happens to soil when it is wet?",
      choices: ["It grows light", "It tears", "It grows heavy", "It draws a line"],
      correctAnswer: "It grows heavy",
    },
    {
      id: "q3",
      question: "How do rain and wind relate to the maps and borders mentioned earlier?",
      choices: ["Neither follows the lines humans have drawn","Both preserve every national border","The wind carries the maps away","Rain draws a new flag on the soil"],
      correctAnswer: "Neither follows the lines humans have drawn",
    },
    {
      id: "q4",
      question: "What does the poem say about the layers left by earlier times?",
      choices: ["Every layer was once 'now'","The oldest layers are all empty","Maps prevent new layers from forming","No layer changes after rain"],
      correctAnswer: "Every layer was once 'now'",
    },
    {
      id: "q5",
      question: "After the ground is dug into again, how is the soil described?",
      choices: ["It receives what comes and slowly settles flat","It refuses to be moved","It turns into cloth","It keeps the flags standing"],
      correctAnswer: "It receives what comes and slowly settles flat",
    },
    {
      id: "q6",
      question: "What happens to iron, cloth and bones in the poem?",
      choices: ["They rust, tear or grow light","They become new flags","They remain unchanged forever","They turn into glass"],
      correctAnswer: "They rust, tear or grow light",
    },
    {
      id: "q7",
      question: "Which two things does the poem say overlap?",
      choices: ["Footsteps and layers","Stars and windows","Shadows and letters","Clocks and doors"],
      correctAnswer: "Footsteps and layers",
    },
    {
      id: "q8",
      question: "What once existed in each layer, according to the poem?",
      choices: ["A present moment","A country without borders","A photograph of a family","An empty map"],
      correctAnswer: "A present moment",
    },
    {
      id: "q9",
      question: "What might happen beneath the feet of someone who stands there someday?",
      choices: ["Something may give way","A new flag rises","A river freezes","The ground becomes transparent"],
      correctAnswer: "Something may give way",
    },
    {
      id: "q10",
      question: "How does the poem end after the soil receives what comes?",
      choices: ["It slowly settles flat","It begins to speak","It turns into iron","It becomes a map"],
      correctAnswer: "It slowly settles flat",
    },
  ],
};

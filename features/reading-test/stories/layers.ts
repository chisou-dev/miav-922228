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
      question: "What does the poem say rain does not do?",
      choices: ["Fall", "Settle", "Overlap", "Read maps"],
      correctAnswer: "Read maps",
    },
    {
      id: "q4",
      question: "What does the poem say the wind knows?",
      choices: ["No countries", "Every flag", "The maps", "Your name"],
      correctAnswer: "No countries",
    },
    {
      id: "q5",
      question: "What does the soil do in the last lines?",
      choices: [
        "It raises a flag",
        "It receives, then settles flat",
        "It draws new lines",
        "It refuses the digging",
      ],
      correctAnswer: "It receives, then settles flat",
    },
  ],
};

import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `He walked down the street at his usual pace.

The person ahead of him stayed at roughly the same distance, neither pulling away nor slowing down.

Near the end of the block, a glass-fronted building caught the afternoon light. People moved in and out through a set of automatic doors.

As he approached, each person slowed slightly before crossing the sensor.

The doors opened.

One person entered, followed by another.

A gap appeared between them.

He reached the entrance and stopped.

The doors remained closed.

Footsteps came up behind him.

He stepped aside.

A man passed, and the doors opened at once.

They closed again after the man went inside.

He stayed where he was.

Through the glass, people crossed the lobby carrying bags, folders, cups of coffee. Someone inside turned toward him, looked for a second, then continued walking.

The doors opened for a woman leaving the building.

For an instant, there was nothing between him and the lobby.

He did not enter.

The doors closed.

The next morning, he came down the same street with the same bag over his shoulder.

He stopped in front of the entrance.

The doors opened.

His weight shifted forward.

He stayed outside.

A woman approaching from behind slowed when she saw him. She changed direction before reaching the sensor and passed on his left.

Another person did the same.

By the end of the week, no one needed to stop.

People altered their paths several steps before they reached him.

The movement was small. A shoulder turned. A foot crossed slightly ahead of the other. A bag shifted from one hand to the next.

Soon the entrance had two streams.

One passed through the doors.

The other passed around him.

No one seemed to notice when that happened.

One afternoon, a man stopped.

He stood close enough that they were almost facing each other.

For several seconds, he looked at the man with the bag.

His mouth opened.

Nothing came out.

Someone behind them stepped around both men and entered the building.

The doors opened.

The man who had stopped glanced toward them.

Then he lowered his eyes and went inside as well.

That evening, he came out of the building with two other people.

They were talking.

As they passed the entrance, his eyes moved across the man with the bag.

He did not break his sentence.

The next morning, he walked around him without looking.

The man with the bag returned each day.

He stood in nearly the same place.

Rain darkened the pavement around his shoes.

On sunny days, his shadow reached the glass before he did.

People walked around both.

After a while, someone placed a freestanding sign near the entrance.

Visitors adjusted their paths to avoid the sign and the man at the same time.

For several days, the two occupied the same part of the pavement.

Then the sign was moved.

The paths remained.

One morning, the man with the bag did not come.

A woman approaching the entrance drifted to the left at the usual point.

Halfway through the movement, she looked toward the empty space.

Then she straightened and entered.

The next day, several people still made the same small turn.

By the end of the week, most were walking straight again.

A man slowed near the glass.

“He hasn’t been here lately, has he?”

The person beside him looked toward the place where the man had stood.

“Who?”

The first man hesitated.

Then the doors opened.

They went inside.

For a few more mornings, someone would glance toward the empty patch of pavement.

After that, no one did.

The doors kept opening.`;

export const entrance: ReadingStoryInput = {
  slug: "entrance",
  title: "Entrance",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body,
  questions: [
    {
      id: "q1",
      question: "What happened when he first reached the entrance?",
      choices: [
        "The doors remained closed",
        "A guard stopped him",
        "The doors opened at once",
        "He went into the lobby",
      ],
      correctAnswer: "The doors remained closed",
    },
    {
      id: "q2",
      question: "What opened the doors immediately afterward?",
      choices: [
        "He stepped closer",
        "A woman leaving",
        "A man who passed him",
        "The freestanding sign",
      ],
      correctAnswer: "A man who passed him",
    },
    {
      id: "q3",
      question: "What did the entrance have after people changed their paths?",
      choices: ["Two streams", "A locked gate", "One empty lobby", "A new sensor"],
      correctAnswer: "Two streams",
    },
    {
      id: "q4",
      question: "What was placed near the entrance?",
      choices: ["A bench", "A freestanding sign", "A rope", "A suitcase"],
      correctAnswer: "A freestanding sign",
    },
    {
      id: "q5",
      question: "What does the person beside the first man answer?",
      choices: ["“Not lately.”", "“Who?”", "“He moved.”", "“The doors are closed.”"],
      correctAnswer: "“Who?”",
    },
  ],
};

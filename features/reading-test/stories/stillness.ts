import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `Stillness

“Hobby: stillness.”

The interviewer stopped at that line on the résumé.

“What does that mean?”

“Not moving.”

The man sat across from him with both hands resting on his thighs.

His back did not touch the chair. There was no tension in his shoulders. Even his breathing was hard to notice unless you watched closely.

The interviewer looked at him for a few seconds.

“How long can you stay like that?”

“I don’t know.”

The interviewer shifted the résumé slightly on the desk.

“Any examples?”

“A bird flew over.”

“And?”

“It landed on my head.”

The interviewer looked at him.

“And?”

“Something warm fell on my shoulder.”

The interviewer swallowed.

He kept looking at the man.

“You didn’t move?”

The man said nothing.

A few seconds passed.

The interviewer swallowed again.

The man’s gaze rested somewhere around his neck.

The interviewer picked up the résumé.

The work history was ordinary.

He dropped the paper into the wastebasket beside the desk.

It slid down over the other documents.

The man did not move.

The interviewer cleared his throat.

He took a sip of water and returned the glass to its place.

A few seconds later, he swallowed again.

The man’s gaze had not moved.

The interviewer looked down at the next document.

One corner of the paper had lifted.

He pressed it flat with his fingertips.

He looked up.

The man was sitting in exactly the same position.

The interviewer cleared his throat.

He looked back at the résumé.

The printed lines seemed slightly crooked.

He straightened the page.

He looked up again.

The man was still watching him.

Stillness II

“Hobby: stillness.”

The interviewer stopped at the line.

A shadow passed across the narrow window in the door behind the man.

The interviewer looked down at the documents in his hands.

He looked up.

The man was sitting in the same position.

The interviewer watched him.

A drop of condensation slid down the outside of the glass and fell onto the desk.

He looked down at another résumé.

The work history was the same.

He turned the paper over.

There was nothing on the back.

He looked up.

The man was still there.

The interviewer kept looking at him.

A shadow moved across the narrow window in the door.

A sheet of paper on the desk stirred in the air-conditioning.

Someone stopped outside the door.

There was a knock.

No one answered.

The interviewer kept looking at the man.

Footsteps moved away down the hall.`;

export const stillness: ReadingStoryInput = {
  slug: "stillness",
  title: "Stillness",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body,
  questions: [
    {
      id: "q1",
      question: "What hobby is printed on the résumé?",
      choices: ["Reading", "stillness", "Walking", "Waiting"],
      correctAnswer: "stillness",
    },
    {
      id: "q2",
      question: "What does the man say the word means?",
      choices: ["Not moving", "Sitting quietly at work", "Holding his breath", "Watching birds"],
      correctAnswer: "Not moving",
    },
    {
      id: "q3",
      question: "What landed on his head?",
      choices: ["Rain", "A bird", "A leaf", "A sheet of paper"],
      correctAnswer: "A bird",
    },
    {
      id: "q4",
      question: "Where does the interviewer put that résumé?",
      choices: [
        "Into a folder",
        "Back on the desk",
        "Into his pocket",
        "Into the wastebasket beside the desk",
      ],
      correctAnswer: "Into the wastebasket beside the desk",
    },
    {
      id: "q5",
      question: "In Stillness II, what follows the knock at the door?",
      choices: [
        "No one answered",
        "The man stood up",
        "The interviewer opened the door",
        "Someone came in",
      ],
      correctAnswer: "No one answered",
    },
  ],
};

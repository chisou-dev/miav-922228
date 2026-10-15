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
      question: "How do people begin to respond after repeatedly passing the man at the entrance?",
      choices: ["They turn aside before they reach him","They ask him to open the doors","They wait behind him in one line","They stop visiting the building"],
      correctAnswer: "They turn aside before they reach him",
    },
    {
      id: "q4",
      question: "After someone moves the freestanding sign, what remains?",
      choices: ["The paths people have begun taking","A second set of automatic doors","A permanent wall around the entrance","A guard posted beside the sign"],
      correctAnswer: "The paths people have begun taking",
    },
    {
      id: "q5",
      question: "What happens to people's movements after the man stops coming?",
      choices: ["Some still turn toward the empty space before the habit fades","Everyone immediately forgets how to enter","The building closes for a week","No one notices the empty space at any point"],
      correctAnswer: "Some still turn toward the empty space before the habit fades",
    },
    {
      id: "q6",
      question: "When the doors open for a woman leaving the building, what does the man with the bag do?",
      choices: ["He remains outside instead of entering","He follows her into the lobby","He asks her to hold the doors","He moves his bag inside"],
      correctAnswer: "He remains outside instead of entering",
    },
    {
      id: "q7",
      question: "What happens when the doors open for him the following morning?",
      choices: ["His weight shifts forward, but he stays outside","He immediately enters and takes the stairs","A worker asks him to return later","He turns and walks home"],
      correctAnswer: "His weight shifts forward, but he stays outside",
    },
    {
      id: "q8",
      question: "How does a woman approaching from behind avoid him?",
      choices: ["She changes direction before the sensor and passes on his left","She waits until he goes inside","She moves his bag out of the way","She tells him to stand closer to the sensor"],
      correctAnswer: "She changes direction before the sensor and passes on his left",
    },
    {
      id: "q9",
      question: "By the end of the first week, when do people begin changing their paths?",
      choices: ["Several steps before reaching him","Only after bumping into him","After they have entered the lobby","Only when he speaks to them"],
      correctAnswer: "Several steps before reaching him",
    },
    {
      id: "q10",
      question: "Which small actions show the crowd adjusting its path around him?",
      choices: ["A shoulder turns and a bag changes hands","People stop and take photographs","Visitors sit down on the pavement","People open umbrellas inside the lobby"],
      correctAnswer: "A shoulder turns and a bag changes hands",
    },
    {
      id: "q11",
      question: "What does the man who stops directly in front of him manage to say?",
      choices: ["Nothing, although his mouth opens","He asks for directions","He tells him to leave","He asks about the sign"],
      correctAnswer: "Nothing, although his mouth opens",
    },
    {
      id: "q12",
      question: "What causes the doors to open while the two men stand facing each other?",
      choices: ["Someone steps around both men and enters","A security guard presses a button","The man with the bag waves his hand","A delivery vehicle approaches"],
      correctAnswer: "Someone steps around both men and enters",
    },
    {
      id: "q13",
      question: "How does the man who had stopped behave the next morning?",
      choices: ["He walks around the man with the bag without looking","He stops and introduces himself","He waits for the man to enter","He brings him a cup of coffee"],
      correctAnswer: "He walks around the man with the bag without looking",
    },
    {
      id: "q14",
      question: "What detail marks the rainy days when the man continues to stand there?",
      choices: ["The pavement darkens around his shoes","The glass entrance turns opaque","His bag becomes covered in flowers","The sign is carried indoors"],
      correctAnswer: "The pavement darkens around his shoes",
    },
    {
      id: "q15",
      question: "Where does the man's shadow reach on sunny days?",
      choices: ["The glass before he does","The roof of the building","The middle of the lobby","The sign across the street"],
      correctAnswer: "The glass before he does",
    },
    {
      id: "q16",
      question: "How do visitors behave while both the sign and the man stand near the entrance?",
      choices: ["They adjust their paths to avoid both","They move the man behind the sign","They form a line between them","They take turns carrying the sign"],
      correctAnswer: "They adjust their paths to avoid both",
    },
    {
      id: "q17",
      question: "On the first morning the man does not appear, what does one woman notice?",
      choices: ["The empty space where he usually stood","A new entrance on the right","A note attached to the glass","The sign blocking the sensor"],
      correctAnswer: "The empty space where he usually stood",
    },
    {
      id: "q18",
      question: "What happens to most people's routes by the end of the week after his absence?",
      choices: ["They return to walking straight toward the entrance","They continue to take the long way around forever","They stop using the automatic doors","They follow the man to another building"],
      correctAnswer: "They return to walking straight toward the entrance",
    },
    {
      id: "q19",
      question: "How does the second person respond when asked about the absent man?",
      choices: ["By asking 'Who?'","By saying the man is on holiday","By pointing toward the stairs","By showing a photograph"],
      correctAnswer: "By asking 'Who?'",
    },
    {
      id: "q20",
      question: "What eventually happens to the occasional glances toward the empty pavement?",
      choices: ["They stop, while the doors continue opening","They turn into a daily memorial","They cause the building to close","They lead to a new sign being installed"],
      correctAnswer: "They stop, while the doors continue opening",
    },
  ],
};

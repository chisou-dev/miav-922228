import type { ReadingQuestion } from "@/features/reading-test/types";

/** Questions only. The published English text stays in the library catalog. */
export const flashTests: readonly {
  slug: string;
  questions: readonly ReadingQuestion[];
}[] = [
  {
    slug: "the-day-i-couldnt-find-anyone",
    questions: [
      {
        id: "q1",
        question: "What did the narrator lose?",
        choices: ["A phone", "A wallet", "A house key", "A paper map"],
        correctAnswer: "A phone",
      },
      {
        id: "q2",
        question: "Where had the suburb been built?",
        choices: [
          "Along a river",
          "On flat farmland",
          "Into a hillside",
          "Beside a station",
        ],
        correctAnswer: "Into a hillside",
      },
      {
        id: "q3",
        question: "Why can't the narrator simply follow the directions his friend sent?",
        choices: ["The directions were on his missing phone","The bus driver erased the street names","His friend never sent an address","The train station was closed"],
        correctAnswer: "The directions were on his missing phone",
      },
      {
        id: "q4",
        question: "What happens when the narrator checks with the bus company?",
        choices: ["The phone is brought to him","Nothing has been turned in","The driver offers a new map","His friend answers the call"],
        correctAnswer: "Nothing has been turned in",
      },
      {
        id: "q5",
        question: "Where does the narrator's search finally lead?",
        choices: ["To a phone partly submerged in muddy water","To a phone on a park bench","To a phone in his friend's kitchen","To a phone under a bus seat"],
        correctAnswer: "To a phone partly submerged in muddy water",
      },
      {
        id: "q6",
        question: "When does the narrator first notice that the phone is missing?",
        choices: ["Just after the bus pulls away","While sitting in his friend's house","When buying a train ticket","During a school lesson"],
        correctAnswer: "Just after the bus pulls away",
      },
      {
        id: "q7",
        question: "What color are most of the houses in the neighborhood?",
        choices: ["White","Bright red","Dark green","Purple"],
        correctAnswer: "White",
      },
      {
        id: "q8",
        question: "Which part of the directions is uncertain at the first corner?",
        choices: ["Whether the bus stop counts as the starting point","Whether the park is closed","Which line runs to the airport","Whether the friend owns a car"],
        correctAnswer: "Whether the bus stop counts as the starting point",
      },
      {
        id: "q9",
        question: "What does the man watering his garden say when asked about the friend?",
        choices: ["He does not think he knows him","He lives next door","He has just seen him at the station","He owns the whole neighborhood"],
        correctAnswer: "He does not think he knows him",
      },
      {
        id: "q10",
        question: "Whom does the narrator meet after the man with the garden hose?",
        choices: ["A woman with a dog","A police officer on horseback","A taxi driver","A school principal"],
        correctAnswer: "A woman with a dog",
      },
      {
        id: "q11",
        question: "What does the park help the narrator realize?",
        choices: ["He has returned to the bus stop in a circle","He has reached his friend's house","He has crossed into another city","He has found a new train station"],
        correctAnswer: "He has returned to the bus stop in a circle",
      },
      {
        id: "q12",
        question: "Why can't the bus company simply call him with news?",
        choices: ["He has no working phone number to give","Its phones are disconnected","The office closes at noon","He refuses to say his name"],
        correctAnswer: "He has no working phone number to give",
      },
      {
        id: "q13",
        question: "What does he notice in the drainage ditch near the end?",
        choices: ["A square of light beneath the water","A red ribbon","A lost train pass","A wallet with money"],
        correctAnswer: "A square of light beneath the water",
      },
      {
        id: "q14",
        question: "Which condition prevents him from reading his friend's waiting messages?",
        choices: ["The cracked screen will not respond to touch","The messages are written in another language","The phone has no notifications","He has forgotten how to unlock a door"],
        correctAnswer: "The cracked screen will not respond to touch",
      },
      {
        id: "q15",
        question: "What do the notifications indicate about his friend?",
        choices: ["Someone has been checking whether he arrived","His friend has canceled the visit","The house has been sold","The bus company has called back"],
        correctAnswer: "Someone has been checking whether he arrived",
      },
    ],
  },
  {
    slug: "lost-property",
    questions: [
      {
        id: "q1",
        question: "When did the man say he lost something?",
        choices: ["This morning", "Last week", "One year ago", "Thirty years ago"],
        correctAnswer: "Thirty years ago",
      },
      {
        id: "q2",
        question: "What did he call the lost item?",
        choices: ["A gray coat", "Weight", "A name", "A key"],
        correctAnswer: "Weight",
      },
      {
        id: "q3",
        question: "What happens when the man tries to move the gray object?",
        choices: ["It rolls toward the wall","It refuses to move","It crumbles in his hands","It rises from the floor"],
        correctAnswer: "It refuses to move",
      },
      {
        id: "q4",
        question: "What happens when he pulls his hand away from the object?",
        choices: ["His fingertips seem to return later than his hand","His fingers turn gray","The object follows his hand","The clerk takes his hand"],
        correctAnswer: "His fingertips seem to return later than his hand",
      },
      {
        id: "q5",
        question: "After the clerk calls the next person, what can the man no longer tell?",
        choices: ["Whether he is still touching the object","Which year he lost his wallet","Where the exit door is","Whether his shoes are wet"],
        correctAnswer: "Whether he is still touching the object",
      },
      {
        id: "q6",
        question: "What is unusual about how the receptionist reacts to the thirty-year delay?",
        choices: ["She continues her routine and says they have the item","She laughs and sends him away","She calls the police at once","She closes the counter"],
        correctAnswer: "She continues her routine and says they have the item",
      },
      {
        id: "q7",
        question: "Why does the man say he thinks he has lost something?",
        choices: ["His body seems to lag behind his feet","He cannot find his car","His jacket feels too heavy","He has misplaced a receipt"],
        correctAnswer: "His body seems to lag behind his feet",
      },
      {
        id: "q8",
        question: "Where does the receptionist direct him?",
        choices: ["Toward the back of the room","Outside to the parking lot","To a second office upstairs","Toward the station entrance"],
        correctAnswer: "Toward the back of the room",
      },
      {
        id: "q9",
        question: "What does the gray object resemble from the counter?",
        choices: ["A large stone","A folded umbrella","A wooden chair","A pile of clothing"],
        correctAnswer: "A large stone",
      },
      {
        id: "q10",
        question: "What happens to the man's right shoulder after he sits near the object?",
        choices: ["It sinks slightly","It rises above his head","It becomes covered in dust","It presses against the window"],
        correctAnswer: "It sinks slightly",
      },
    ],
  },
  {
    slug: "after-the-rain",
    questions: [
      {
        id: "q1",
        question: "Where did the narrator shelter from the rain?",
        choices: [
          "Inside the station",
          "Under a tree",
          "Beneath a secondhand bookshop awning",
          "In a bus",
        ],
        correctAnswer: "Beneath a secondhand bookshop awning",
      },
      {
        id: "q2",
        question: "What did the old man say the hill used to be, the first time?",
        choices: ["Under the sea", "A forest", "A town", "A bridge"],
        correctAnswer: "Under the sea",
      },
      {
        id: "q3",
        question: "What makes the narrator begin to doubt the pavement under him?",
        choices: ["Fine sand appears to be caught in its cracks","He sees a road sign fall over","The pavement turns into water","The bookshop owner digs a hole"],
        correctAnswer: "Fine sand appears to be caught in its cracks",
      },
      {
        id: "q4",
        question: "After leaving the awning, how does the narrator check the ground?",
        choices: ["He taps it with a cane","He tests it with the sole of his shoe","He scoops up a handful of sand","He asks the station guard"],
        correctAnswer: "He tests it with the sole of his shoe",
      },
      {
        id: "q5",
        question: "When two other men discuss the hill, which claim does the narrator repeat?",
        choices: ["It used to be a desert","It was once beneath the sea","It was built last year","It used to be a bridge"],
        correctAnswer: "It was once beneath the sea",
      },
    ],
  },
  {
    slug: "the-silver-thread",
    questions: [
      {
        id: "q1",
        question: "Where did the silver thread rise?",
        choices: [
          "From a harbor wall",
          "From a seam in the exposed rock at a mountain summit",
          "From the floor of a school",
          "Across a field",
        ],
        correctAnswer: "From a seam in the exposed rock at a mountain summit",
      },
      {
        id: "q2",
        question: "What happened when they tried to cut the thread?",
        choices: [
          "A diamond blade cut it in half",
          "It fell to the ground",
          "Fire burned it away",
          "Diamond blades and a laser left no mark",
        ],
        correctAnswer: "Diamond blades and a laser left no mark",
      },
      {
        id: "q3",
        question: "After the girl ties on a red ribbon, what do visitors begin adding?",
        choices: ["Letters, photographs and coins","Small mirrors and clocks","Train tickets only","Branches and stones only"],
        correctAnswer: "Letters, photographs and coins",
      },
      {
        id: "q4",
        question: "Which disagreement disrupts the investigators' understanding of the thread?",
        choices: ["Two teams get conflicting results from the same instruments","Everyone agrees it has stopped moving","The laser cuts through it at last","The staircase is found to be painted"],
        correctAnswer: "Two teams get conflicting results from the same instruments",
      },
      {
        id: "q5",
        question: "As the girl descends the staircase, what happens to her own name?",
        choices: ["She writes it on a wall","She can no longer say it","She gives it to a researcher","She hears it announced above"],
        correctAnswer: "She can no longer say it",
      },
    ],
  },
];

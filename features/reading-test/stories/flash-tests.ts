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
      {
        id: "q6",
        question: "What is the old man holding beneath the shop awning?",
        choices: ["A closed umbrella","A map of the town","A new book","A bag of sand"],
        correctAnswer: "A closed umbrella",
      },
      {
        id: "q7",
        question: "How does the old man's explanation of the hill change when they meet again?",
        choices: ["He changes it from seabed to desert","He changes it from forest to river","He insists it was always a bridge","He says it was a school"],
        correctAnswer: "He changes it from seabed to desert",
      },
      {
        id: "q8",
        question: "What does the old man use to draw across the pavement?",
        choices: ["The tip of his umbrella","A chalk stick","His shoe","A wooden ruler"],
        correctAnswer: "The tip of his umbrella",
      },
      {
        id: "q9",
        question: "What sensation does the narrator experience while looking at the sand?",
        choices: ["Dryness catching at the back of his throat","Sudden warmth in his hands","A ringing in both ears","His shoes becoming wet inside"],
        correctAnswer: "Dryness catching at the back of his throat",
      },
      {
        id: "q10",
        question: "By the time the narrator reaches the station, what has happened to the sand?",
        choices: ["He can no longer see it","It covers the station floor","It has become a pile of shells","The old man is carrying it in a bag"],
        correctAnswer: "He can no longer see it",
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
      {
        id: "q6",
        question: "What do instruments fail to establish during the first survey?",
        choices: ["The thread's temperature","Its silver color","The mountain's name","The survey team's location"],
        correctAnswer: "The thread's temperature",
      },
      {
        id: "q7",
        question: "How does the marked part of the thread change overnight?",
        choices: ["The mark has risen several meters","The mark stays at the rock surface","The mark splits in two","The mark sinks beneath the lake"],
        correctAnswer: "The mark has risen several meters",
      },
      {
        id: "q8",
        question: "How do people's visits change before the girl ties her ribbon?",
        choices: ["They gradually stop coming to watch the instruments","They all begin building houses at the summit","They leave offerings of clocks","They remove the thread"],
        correctAnswer: "They gradually stop coming to watch the instruments",
      },
      {
        id: "q9",
        question: "What happens to the girl's first ribbon after she ties it on?",
        choices: ["It rises with the thread","It falls into the pool below","It turns black","A researcher cuts it off"],
        correctAnswer: "It rises with the thread",
      },
      {
        id: "q10",
        question: "What kinds of reasons bring people to leave offerings?",
        choices: ["Remembering the dead and naming children not yet born","Buying discounted tickets","Celebrating the end of winter","Collecting survey equipment"],
        correctAnswer: "Remembering the dead and naming children not yet born",
      },
      {
        id: "q11",
        question: "What do workers discover beneath the rock?",
        choices: ["A chamber containing a spiral staircase","A railway platform","A second mountain summit","A row of shop counters"],
        correctAnswer: "A chamber containing a spiral staircase",
      },
      {
        id: "q12",
        question: "What odd separation occurs on a researcher's first descent?",
        choices: ["The rest of the team gets ahead despite footsteps beside him","The staircase turns into an elevator","His watch begins playing music","Every step becomes invisible"],
        correctAnswer: "The rest of the team gets ahead despite footsteps beside him",
      },
      {
        id: "q13",
        question: "What does a researcher forget while still remembering a child's face?",
        choices: ["The child's name","The child's height","The color of the stairs","The number of his colleagues"],
        correctAnswer: "The child's name",
      },
      {
        id: "q14",
        question: "What appears at the bottom of the stairs?",
        choices: ["A still pool of water","A train ticket gate","A field of wheat","A large silver door"],
        correctAnswer: "A still pool of water",
      },
      {
        id: "q15",
        question: "What happens to a man's longtime neighbor after he ties a letter to the thread?",
        choices: ["She no longer recognizes him","She moves to the mountain","She returns his lost letter","She asks to photograph him"],
        correctAnswer: "She no longer recognizes him",
      },
      {
        id: "q16",
        question: "What is missing when clerks inspect their financial records?",
        choices: ["Several years of folders","The office's front door","A photograph of the mountain","The station timetable"],
        correctAnswer: "Several years of folders",
      },
      {
        id: "q17",
        question: "Why do the investigators struggle to compare accounts?",
        choices: ["Some people have forgotten giving them","They cannot find any measuring instruments","The summit has been covered in snow","The reports are written in different scripts"],
        correctAnswer: "Some people have forgotten giving them",
      },
      {
        id: "q18",
        question: "What does the girl carry back to the mountain near the end?",
        choices: ["An old photograph of her mother","A box full of coins","A broken camera","A gold axe"],
        correctAnswer: "An old photograph of her mother",
      },
      {
        id: "q19",
        question: "What does she do while descending the staircase?",
        choices: ["Repeats her own name","Reads the names on every offering","Sings the same song","Counts coins in her pocket"],
        correctAnswer: "Repeats her own name",
      },
      {
        id: "q20",
        question: "What does the girl see when she looks into the pool?",
        choices: ["Her mother with a younger girl whose face seems unfamiliar","A picture of the investigators at university","A line of people waiting at the ticket gates","Only her own name written on stone"],
        correctAnswer: "Her mother with a younger girl whose face seems unfamiliar",
      },
    ],
  },
];

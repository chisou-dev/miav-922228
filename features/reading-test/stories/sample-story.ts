import type { ReadingStoryInput } from "@/features/reading-test/types";

const body = `Mara found the coat at the end of her shift, folded over the bench by Platform Two. Rain had been falling since noon. By ten at night the last southbound train was twelve minutes away.

The coat was navy, heavy, and dry. Someone had set it down with care. A paper ticket stuck out of the left pocket. Nobody on the platform looked back.

She lifted the coat and felt the ticket. It was for the 22:17 to Harrow, coach C, seat 14. The date was today. On the reservation line, a pencil had written a name: E. Sato.

Lost things at the station went into a drawer, and a note went into a book. If nobody called by Sunday, they moved to the city office. Mara had never found a ticket that was still good.

The loudspeaker announced the southbound train. Mara held the coat over her arm and walked to the gate. She could hand it to the conductor. She could also look for a phone number, but the back of the ticket was blank. There was only the seat, the time, and the pencil name.

The train lights appeared at the curve. Mara made a decision that was smaller than it felt. She carried the coat onto the platform and waited where coach C would stop. If E. Sato was on the train, the coat would be easy to see. If not, she would bring it back to the drawer and write the note.

The train stopped. Doors opened. A woman with a sleeping child got off. A man with a bicycle got on. Mara raised the coat so the navy cloth caught the platform light. People passed. Nobody reached for it.

She looked into coach C. Seat 14 was empty. A paperback lay on the table, face down, and a paper cup had left a ring. The reservation card still showed the name E. Sato. The conductor, a tall woman with a silver whistle, saw Mara in the doorway.

"Lost property?" the conductor asked.

"A coat and a ticket," Mara said. "The seat is empty."

The conductor checked her list. "Sato transferred at the junction. The office radioed us an hour ago. He missed this train and took the bus. We were told to leave the book on the table. He said he would send for it."

"He left the coat at our station," Mara said.

"Then he may come back for it," the conductor said. "Or he may not. Bring it to your drawer and write the name."

The whistle blew. Mara stepped back. The doors closed, and the 22:17 pulled away without E. Sato and without the coat.

In the waiting room she spread the coat on the counter. The lining was grey. In the right pocket she found a folded map of the coast and a single brass key. The key was small, the kind that opens a padlock or a locker, not a house. The map had a circle drawn around a pier called Grey End. Under the circle, the same pencil had written: Saturday, if the light is on.

Tomorrow was Saturday.

Mara wrote the note anyway. Navy coat. Ticket for the 22:17, unused. Map. Brass key. Name: E. Sato. She put the coat in the drawer and turned the key of the drawer twice, which she did not usually do.

On Saturday morning she was not scheduled to work. She went to the station because the rain had stopped and because the sentence on the map had stayed in her head. The day clerk, Osman, was sorting mugs behind the counter.

"Did anyone ask for a navy coat?" Mara said.

"A man called at eight," Osman said. "He asked for a coat and a key. He said his name was Sato. I told him the night drawer is yours and that you would be in tonight. He laughed in a tired way and said tonight was too late. He said the light would not stay on past noon."

"Did he leave a number?"

"He left a pier," Osman said, and tapped a scrap of paper. "Grey End. He said if the coat is still here on Monday, keep the key. The locker is paid through Sunday, and after that the harbour clears it."

Mara could have waited for her shift. She took the coat out of the drawer, signed the book, and caught the bus to the coast.

The pier at Grey End was short, with a lamp at the far end and a row of green lockers beside the shelter. The lamp was on, pale in the daylight. A man stood next to locker 14 with his hands in the pockets of a thin jacket. He was younger than Mara had imagined, and he looked cold.

"E. Sato?" she said.

He turned. When he saw the coat, his face changed in a way that made the whole trip feel simple.

"You brought it," he said.

"You left it on our bench," Mara said. "The ticket was still in the pocket."

"I was going to ride to the junction and back before evening," he said. "Then the bus came early, and I thought I would only be a minute. I set the coat down so I would remember to return. I did not remember until I reached these lockers and the key was gone."

He took the key and opened locker 14. Inside was a camera wrapped in a scarf, and a letter with a stamp that had not been sent. He put the letter into the inner pocket of the coat and held the camera with both hands, as if it were heavier than it looked.

"The light is for my sister," he said. "She works the evening boat, but on Saturdays she passes at noon. If the lamp is on, she knows I am here and that I have the camera. If it is off, she sails on without stopping. The camera has the only pictures of our father on the water. I was supposed to bring it today."

"You almost missed her," Mara said.

"I know," he said. "Thank you for reading the map. Most people would have locked the coat away until Monday."

"I nearly did," Mara said.

At noon a small white boat came around the point. A woman on the deck raised her hand. Sato lifted the camera. The boat slowed, and the woman stepped onto the pier and took her brother's arm.

Sato turned back and held out the unused train ticket. "I will not need this," he said. "Please put it in your book, so the seat is not waiting for me."

Mara folded the ticket into her own pocket and left them on the pier with the lamp still on.

On Monday she returned the ticket to the lost-property drawer and wrote one more line in the book. Claimed at Grey End. Key returned. Coat returned. Lamp was on.`;

export const sampleStory = {
  slug: "sample-story",
  title: "The Coat on the Bench",
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 5,
  body,
  questions: [
    {
      id: "q1",
      question: "Where did Mara find the coat?",
      choices: [
        "In the heated waiting room",
        "On seat 14 of the train",
        "On the bench by Platform Two",
        "At the city lost-property office",
      ],
      correctAnswer: "On the bench by Platform Two",
    },
    {
      id: "q2",
      question: "What name was written in pencil on the ticket?",
      choices: ["Osman", "E. Sato", "Grey End", "Harrow"],
      correctAnswer: "E. Sato",
    },
    {
      id: "q3",
      question: "What makes Mara consider taking the coat to Grey End instead of keeping it in the drawer?",
      choices: ["The message on the map and the caller's urgency about the light","A letter from her manager ordering her to leave","A request from the train conductor to visit the coast","A station notice saying the drawer is broken"],
      correctAnswer: "The message on the map and the caller's urgency about the light",
    },
    {
      id: "q4",
      question: "Why does the camera in locker 14 matter to Sato and his sister?",
      choices: ["It contains the only photographs of their father on the water","It contains their tickets for the next train","It belongs to Mara's station manager","It shows the location of another missing coat"],
      correctAnswer: "It contains the only photographs of their father on the water",
    },
    {
      id: "q5",
      question: "How does the lit lamp tell Sato's sister what to do?",
      choices: ["It signals that he is at the pier with the camera, so she should stop","It tells her that the next train is leaving","It means the lockers have been emptied","It is a warning that boats cannot dock"],
      correctAnswer: "It signals that he is at the pier with the camera, so she should stop",
    },
    {
      id: "q6",
      question: "What makes the coat's ticket unusual for lost property?",
      choices: ["It is still valid for a departing train","It is written entirely in code","It belongs to a train that no longer runs","It has no destination"],
      correctAnswer: "It is still valid for a departing train",
    },
    {
      id: "q7",
      question: "What time is printed on the ticket?",
      choices: ["22:17","06:00","14:40","12:05"],
      correctAnswer: "22:17",
    },
    {
      id: "q8",
      question: "Where is the seat assigned?",
      choices: ["Coach C, seat 14","Coach A, seat 2","Coach D, seat 6","Coach B, seat 20"],
      correctAnswer: "Coach C, seat 14",
    },
    {
      id: "q9",
      question: "How does Mara try to return the coat before the train leaves?",
      choices: ["She holds it up where coach C will stop","She leaves it at the station café","She sends it by mail","She asks the driver to search the road"],
      correctAnswer: "She holds it up where coach C will stop",
    },
    {
      id: "q10",
      question: "What does the conductor say happened to Sato?",
      choices: ["He transferred at the junction and took a bus","He took the next train south","He stayed in his reserved seat","He called to cancel his ticket"],
      correctAnswer: "He transferred at the junction and took a bus",
    },
    {
      id: "q11",
      question: "What else does Mara find in the coat's pockets?",
      choices: ["A coastal map and a small brass key","A new watch and a photograph","A newspaper and a pen","A pile of coins and a receipt"],
      correctAnswer: "A coastal map and a small brass key",
    },
    {
      id: "q12",
      question: "What is written beside the circled pier on the map?",
      choices: ["Saturday, if the light is on","Come back in a year","Stay away from the coast","Return to the station before dawn"],
      correctAnswer: "Saturday, if the light is on",
    },
    {
      id: "q13",
      question: "Why is Saturday morning urgent?",
      choices: ["The lamp is not expected to remain lit beyond noon","The last train is at midnight","Mara has a staff meeting at noon","The pier will close forever that afternoon"],
      correctAnswer: "The lamp is not expected to remain lit beyond noon",
    },
    {
      id: "q14",
      question: "What does Mara decide to do on her day off?",
      choices: ["Take the coat to Grey End","Wait until Monday without checking","Sell the coat at the station","Send the key to the city office"],
      correctAnswer: "Take the coat to Grey End",
    },
    {
      id: "q15",
      question: "Where is the brass key meant to be used?",
      choices: ["A locker at the pier","The station ticket machine","Mara's home","The train driver's cabin"],
      correctAnswer: "A locker at the pier",
    },
    {
      id: "q16",
      question: "What is in locker 14?",
      choices: ["A camera wrapped in a scarf and an unsent letter","A stack of gold coins","A spare railway uniform","An unopened suitcase"],
      correctAnswer: "A camera wrapped in a scarf and an unsent letter",
    },
    {
      id: "q17",
      question: "Who is meant to notice the lamp at the pier?",
      choices: ["Sato's sister on the boat","The railway conductor","Mara's supervisor","A shop owner at the station"],
      correctAnswer: "Sato's sister on the boat",
    },
    {
      id: "q18",
      question: "Why is the camera important to Sato's family?",
      choices: ["It holds the only pictures of their father on the water","It contains a school examination paper","It is a gift from the train company","It was borrowed from Mara"],
      correctAnswer: "It holds the only pictures of their father on the water",
    },
    {
      id: "q19",
      question: "What happens when the boat arrives at noon?",
      choices: ["Sato's sister steps onto the pier","The lamp is switched off before anyone sees it","The boat sails past without slowing","The camera falls into the sea"],
      correctAnswer: "Sato's sister steps onto the pier",
    },
    {
      id: "q20",
      question: "What does Mara record in the lost-property book on Monday?",
      choices: ["The coat and key were returned at Grey End","The coat was never claimed","The train was canceled","Sato's ticket was refunded"],
      correctAnswer: "The coat and key were returned at Grey End",
    },
  ],
} satisfies ReadingStoryInput;

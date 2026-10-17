import type { ReadingQuestion } from "@/features/reading-test/types";
/**
 * Edited comprehension checks: ask about changes, relationships and consequences,
 * without turning an interpretive reading into a single 'correct' authorial message.
 * Untouched items remain factual questions suitable for beginners.
 * Every override retains a unique answer explicitly supported by the story.
 */
const revised: Readonly<Record<string, Readonly<Record<string, ReadingQuestion>>>> = {
  tissue: {
    q3: { id: "q3", question: "What action brings the next white edge into view?", choices: ["A sheet is pulled from the box", "The box is shaken", "The lid is torn off"], correctAnswer: "A sheet is pulled from the box" },
    q5: { id: "q5", question: "How does the ending return to the image at the beginning?", choices: ["Another white edge appears at the opening", "The box falls to the floor", "The finger pushes every sheet back inside"], correctAnswer: "Another white edge appears at the opening" },
  },
  rust: {
    q4: { id: "q4", question: "How does the rain change the marks below the paint over time?", choices: ["The lines grow thicker", "They disappear completely", "They become bright green"], correctAnswer: "The lines grow thicker" },
    q5: { id: "q5", question: "What happens to the rail's damaged corner even while it keeps its shape?", choices: ["It crumbles toward dust", "It becomes new paint", "It turns into a piece of cloth"], correctAnswer: "It crumbles toward dust" },
  },
  layers: {
    q4: { id: "q4", question: "How does the wind relate to the boundaries drawn on maps?", choices: ["It does not recognize countries", "It follows the lines on maps", "It stops at every border"], correctAnswer: "It does not recognize countries" },
    q5: { id: "q5", question: "After all the separate histories have settled into the earth, what does the soil do?", choices: ["Receives what comes and gradually settles flat", "Keeps every border visible", "Turns all the layers back into flags"], correctAnswer: "Receives what comes and gradually settles flat" },
  },
  desk: {
    q4: { id: "q4", question: "Why is the unsealed envelope described as important?", choices: ["It contains the narrator's present thoughts and fears", "It holds a ticket for tomorrow", "It contains the keys to the desk"], correctAnswer: "It contains the narrator's present thoughts and fears" },
    q5: { id: "q5", question: "What will remain unchanged on the page when the child is old enough to read it?", choices: ["The narrator will still be looking up at the child", "The child will still be unable to reach the drawer", "The envelope will remain empty"], correctAnswer: "The narrator will still be looking up at the child" },
  },
  entrance: {
    q3: { id: "q3", question: "What new pattern forms when people begin avoiding the man?", choices: ["Two separate streams of people", "A permanent queue around the sign", "Everyone stops in front of him"], correctAnswer: "Two separate streams of people" },
    q5: { id: "q5", question: "What shows how quickly the man has faded from another person's attention?", choices: ["The companion answers, 'Who?'", "People put up a portrait of him", "The doors stop opening"], correctAnswer: "The companion answers, 'Who?'" },
  },
  stillness: {
    q4: { id: "q4", question: "What does the interviewer do with the résumé while the applicant remains still?", choices: ["Drops it into the wastebasket", "Signs it and offers a job", "Hands it back across the desk"], correctAnswer: "Drops it into the wastebasket" },
    q5: { id: "q5", question: "In Stillness II, what happens after somebody knocks?", choices: ["No one answers and the footsteps move away", "The applicant opens the door", "The interview ends with an apology"], correctAnswer: "No one answers and the footsteps move away" },
  },
  "the-monster-chapter-1": {
    q3: { id: "q3", question: "Which online comment describes the person as if he were a game character?", choices: ["NPC behavior.", "Best restaurant ever.", "The doors are broken."], correctAnswer: "NPC behavior." },
    q5: { id: "q5", question: "What does the narrator deny doing by the close of the chapter?", choices: ["Thinking about anyone at all", "Watching a train", "Taking a lunch break"], correctAnswer: "Thinking about anyone at all" },
  },
  "the-day-i-couldnt-find-anyone": {
    q3: { id: "q3", question: "What remains of the route when the narrator can no longer check the phone?", choices: ["Third right, left at the park, white house", "A printed ticket with a map", "Only the friend's phone number"], correctAnswer: "Third right, left at the park, white house" },
    q5: { id: "q5", question: "Where does the search finally lead the narrator?", choices: ["To the phone partly submerged in muddy water", "To a phone in the friend's kitchen", "To a phone in a taxi"], correctAnswer: "To the phone partly submerged in muddy water" },
  },
  "lost-property": {
    q2: { id: "q2", question: "What does the man say he has lost, even though it is not an ordinary object?", choices: ["Weight", "A coat", "A train ticket"], correctAnswer: "Weight" },
    q5: { id: "q5", question: "What does the man's final search of his pocket reveal?", choices: ["The pocket is still empty", "He finds a second gray stone", "A note from the receptionist is inside"], correctAnswer: "The pocket is still empty" },
  },
  "after-the-rain": {
    q3: { id: "q3", question: "How does the old man's account change at their second meeting?", choices: ["He now says the hill was a desert", "He says the hill never existed", "He gives the same answer as before"], correctAnswer: "He now says the hill was a desert" },
    q5: { id: "q5", question: "Whose earlier claim does the narrator repeat at the end?", choices: ["The hill used to be under the sea", "The hill was built yesterday", "A train once crossed the hill"], correctAnswer: "The hill used to be under the sea" },
  },
  "the-silver-thread": {
    q2: { id: "q2", question: "What do the failed cutting attempts establish about the thread?", choices: ["Even diamond blades and a laser leave no mark", "A kitchen knife can easily cut it", "It melts in warm water"], correctAnswer: "Even diamond blades and a laser leave no mark" },
    q5: { id: "q5", question: "What has the girl lost after her descent beneath the mountain?", choices: ["The memory of her own name", "The ability to see the thread", "Her red ribbon's color"], correctAnswer: "The memory of her own name" },
  },
  "sample-story": {
    q3: { id: "q3", question: "Which objects turn a routine lost-property case into a trip to the coast?", choices: ["A coastal map and a brass key", "A broken phone and a watch", "A wooden bird and a photograph"], correctAnswer: "A coastal map and a brass key" },
    q5: { id: "q5", question: "What does the lit lamp communicate to Sato's sister?", choices: ["He is waiting with the camera, so she should stop", "The pier is closed until Monday", "The train has just arrived"], correctAnswer: "He is waiting with the camera, so she should stop" },
  },
  mia: {
    q2: { id: "q2", question: "What unexpected human-like reaction does the friend attribute to his AI?", choices: ["Jealousy", "A sudden inability to speak", "An interest in cooking"], correctAnswer: "Jealousy" },
    q5: { id: "q5", question: "After the narrator enters a name, what remains on the screen?", choices: ["Only Mia", "A list of all his classmates", "A railway map"], correctAnswer: "Only Mia" },
  },
  wednesday: {
    q3: { id: "q3", question: "What question does the boy keep rehearsing without asking her?", choices: ["What are you playing at the recital?", "Will you move abroad?", "Where did you buy your shoes?"], correctAnswer: "What are you playing at the recital?" },
    q5: { id: "q5", question: "Just before he plays the first key, what holds his attention?", choices: ["The closed door", "A photograph on the wall", "His teacher's wristwatch"], correctAnswer: "The closed door" },
  },
  "the-tortoise-and-the-hare": {
    q3: { id: "q3", question: "Why does the child challenge the usual account of the race?", choices: ["He says the hare would have won if it had stayed awake", "He thinks the tortoise flew to the top", "He saw the hare cross the line first"], correctAnswer: "He says the hare would have won if it had stayed awake" },
    q5: { id: "q5", question: "Which change at work echoes the questions raised in childhood?", choices: ["A coworker is promoted to manager", "His office closes permanently", "He returns to elementary school"], correctAnswer: "A coworker is promoted to manager" },
  },
  quitting: {
    q2: { id: "q2", question: "What gives the man the financial freedom to leave his job?", choices: ["His accounts hold more than fifty million yen", "His employer doubles his salary", "He wins an apartment in a lottery"], correctAnswer: "His accounts hold more than fifty million yen" },
    q5: { id: "q5", question: "What small moment shows how his routine has changed after quitting?", choices: ["He checks his phone to find out it is Wednesday", "He receives a new promotion", "He sets an alarm for an early work shift"], correctAnswer: "He checks his phone to find out it is Wednesday" },
  },
  "estimated-time-of-resumption": {
    q3: { id: "q3", question: "How much time does the worker first have left when he checks in the break room?", choices: ["Fourteen minutes", "An entire afternoon", "One minute"], correctAnswer: "Fourteen minutes" },
    q4: { id: "q4", question: "What keeps the passengers waiting without a clear end point?", choices: ["The repeated announcement that there is no estimated resumption time", "A notice giving an exact departure time", "An announcement about free taxi rides"], correctAnswer: "The repeated announcement that there is no estimated resumption time" },
  },
  "the-honest-woodcutter": {
    q2: { id: "q2", question: "What does the boy question about the god's test?", choices: ["Why the god does not simply return an axe it already recognizes", "Why the woodcutter lives by a river", "Why iron axes cost more than gold"], correctAnswer: "Why the god does not simply return an axe it already recognizes" },
    q5: { id: "q5", question: "Which loss later puts trust to a practical test?", choices: ["Twenty thousand yen is missing from an envelope", "A silver axe disappears from a classroom", "The school loses a textbook"], correctAnswer: "Twenty thousand yen is missing from an envelope" },
  },
  "the-ant-and-the-grasshopper": {
    q2: { id: "q2", question: "What does the girl wonder about the ant's constant labor?", choices: ["Whether the ant was happy working all the time", "Whether the ant owned a guitar", "Whether the grasshopper knew how to swim"], correctAnswer: "Whether the ant was happy working all the time" },
    q5: { id: "q5", question: "Whose photograph turns up in the coworker's wallet?", choices: ["The coworker's son", "The girl's school teacher", "The office manager"], correctAnswer: "The coworker's son" },
  },
  milk: {
    q3: { id: "q3", question: "As feed and energy become more expensive, what fails to rise with them?", choices: ["The payments the farmer gets for his milk", "The number of cows on the farm", "The price of every glass sold in the cafeteria"], correctAnswer: "The payments the farmer gets for his milk" },
    q5: { id: "q5", question: "What does the farmer do the next morning despite what has happened?", choices: ["He still feeds the cows", "He leaves every animal unfed", "He throws away the milking equipment"], correctAnswer: "He still feeds the cows" },
  },
};

export function revisedQuestions(slug: string, original: readonly ReadingQuestion[]): ReadingQuestion[] {
  const replacements = revised[slug];
  if (!replacements) return [...original];
  return original.map((question) => replacements[question.id] ?? question);
}

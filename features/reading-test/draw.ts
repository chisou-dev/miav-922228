import type { ReadingQuestion, TestChannel } from "@/features/reading-test/types";

export const QUESTIONS_PER_TEST = 5;

export type DrawnChoice = {
  id: string;
  text: string;
};

/** Choice ids are assigned before shuffling, so the correct id does not follow the display slot. */
export type DrawnQuestion = {
  id: string;
  question: string;
  choices: readonly DrawnChoice[];
  correctChoiceId: string;
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

export function questionsForChannel(
  questions: readonly ReadingQuestion[],
  channel: TestChannel,
): ReadingQuestion[] {
  return questions.filter((question) => {
    if (!question.channels || question.channels.length === 0) return true;
    return question.channels.includes(channel);
  });
}

/**
 * Draws one test. Question order and choice order are both shuffled.
 * When the bank is larger than the draw, ids from the previous test are
 * skipped if enough other questions remain.
 */
export function drawQuiz(
  questions: readonly ReadingQuestion[],
  options?: {
    count?: number;
    random?: () => number;
    avoidIds?: readonly string[];
    channel?: TestChannel;
  },
): DrawnQuestion[] {
  const count = options?.count ?? QUESTIONS_PER_TEST;
  const random = options?.random ?? Math.random;
  const channel = options?.channel ?? "reading";
  const pool = questionsForChannel(questions, channel);
  const avoid = new Set(options?.avoidIds ?? []);
  const fresh = pool.filter((question) => !avoid.has(question.id));
  const source = fresh.length >= Math.min(count, pool.length) ? fresh : pool;
  const picked = shuffle(source, random).slice(0, Math.min(count, source.length));

  return picked.map((question) => {
    const choices = question.choices.map((text, index) => ({
      id: `${question.id}:${index}`,
      text,
    }));
    const correct = choices.find((choice) => choice.text === question.correctAnswer);
    if (!correct) {
      throw new Error(`${question.id}: correct answer is not one of the choices`);
    }
    return {
      id: question.id,
      question: question.question,
      choices: shuffle(choices, random),
      correctChoiceId: correct.id,
    };
  });
}

export function scoreDrawnQuiz(
  questions: readonly Pick<DrawnQuestion, "id" | "correctChoiceId">[],
  answers: Readonly<Record<string, string>>,
): { correct: number; total: number; percent: number } {
  const total = questions.length;
  const correct = questions.filter(
    (question) => answers[question.id] === question.correctChoiceId,
  ).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent };
}

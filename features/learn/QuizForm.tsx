"use client";

import type { DrawnQuestion } from "@/features/reading-test/draw";

export function QuizForm({
  questions,
  answers,
  onAnswer,
  onSubmit,
  canSubmit,
}: {
  questions: readonly DrawnQuestion[];
  answers: Readonly<Record<string, string>>;
  onAnswer: (questionId: string, choiceId: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        onSubmit();
      }}
    >
      <ol className="space-y-10">
        {questions.map((question, index) => (
          <li key={question.id}>
            <fieldset>
              <legend className="text-[1.02rem] leading-relaxed">
                {index + 1}. {question.question}
              </legend>
              <div className="mt-4 space-y-3">
                {question.choices.map((choice) => (
                  <label
                    key={choice.id}
                    className="flex min-h-12 cursor-pointer items-start gap-3 border border-[var(--reading-line)] px-4 py-3 text-[1rem] leading-relaxed has-checked:border-[color-mix(in_srgb,var(--reading-ink)_55%,transparent)]"
                  >
                    <input
                      type="radio"
                      className="mt-1.5"
                      name={question.id}
                      value={choice.id}
                      checked={answers[question.id] === choice.id}
                      onChange={() => {
                        onAnswer(question.id, choice.id);
                      }}
                    />
                    <span>{choice.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="mt-14 text-center sm:mt-16">
        <button
          type="submit"
          className="reading-kindle-button font-[inherit] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canSubmit}
        >
          See Results
        </button>
      </div>
    </form>
  );
}

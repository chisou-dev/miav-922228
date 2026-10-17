"use client";

import { useEffect, useRef, useState } from "react";
import { QuizForm } from "@/features/learn/QuizForm";
import { TestResults } from "@/features/learn/TestResults";
import { ReadingLayout } from "@/features/library/ReadingLayout";
import { drawQuiz, scoreDrawnQuiz } from "@/features/reading-test/draw";
import { formatReadingDuration } from "@/features/reading-test/measure";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import type { ReadingQuestion } from "@/features/reading-test/types";
import {
  LISTENING_RATES,
  pickVoice,
  SPOKEN_LOCALES,
  type SpeechLanguage,
  speechAvailable,
  speechChunks,
  waitForVoice,
} from "@/features/listening-test/speech";
import {
  beginListeningAttempt,
  clearListeningAttempt,
  patchListeningAttempt,
  recentListeningQuestionIds,
  useListeningAttempt,
} from "@/features/listening-test/session";

type Enjoyment = "yes" | "a-little" | "not-really";

export function ListeningSession({
  slug,
  title,
  body,
  questions,
  continueUrl,
  language = "en",
}: {
  language?: SpeechLanguage;
  slug: string;
  title: string;
  body: string;
  questions: readonly ReadingQuestion[];
  continueUrl?: string;
}) {
  const attempt = useListeningAttempt(slug);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playToken, setPlayToken] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState(false);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [enjoyment, setEnjoyment] = useState<Enjoyment | null>(null);
  const [author, setAuthor] = useState<{ name: string; slug: string } | null>(null);
  const cursorRef = useRef(0);
  const attemptRef = useRef(attempt);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const playRequestRef = useRef(0);
  const heardRef = useRef(false);
  const pausedRef = useRef(false);
  const generationRef = useRef(0);
  const speakEpochRef = useRef(0);
  const playbackRate = attempt?.rate ?? rate;

  useEffect(() => {
    if (!speechAvailable()) return;
    const synth = window.speechSynthesis;
    const remember = () => {
      const voice = pickVoice(synth.getVoices(), language);
      if (voice) voiceRef.current = voice;
    };
    remember();
    synth.addEventListener("voiceschanged", remember);
    synth.getVoices();
    return () => {
      synth.removeEventListener("voiceschanged", remember);
    };
  }, [language]);

  useEffect(() => {
    if (!attempt || attempt.step !== "results") return;
    let cancelled = false;
    void import("@/features/reading-test/reveals").then((mod) => {
      if (!cancelled) setAuthor(mod.revealAuthor(slug));
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, slug]);

  useEffect(() => {
    if (!attempt || attempt.step !== "active") return;
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => {
      window.clearInterval(interval);
    };
  }, [attempt]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    if (!playing) return;
    const current = attemptRef.current;
    if (!current || current.step !== "active") return;
    if (!speechAvailable()) return;

    const synth = window.speechSynthesis;
    const chunks = speechChunks(body);
    const generation = ++generationRef.current;
    let cancelled = false;
    let voicesReady = false;

    function finishIfDone(index: number) {
      if (index < chunks.length) return false;
      if (cancelled || generation !== generationRef.current) return true;
      setPlaying(false);
      const voice = voiceRef.current;
      const active = attemptRef.current;
      if (
        !active ||
        !heardRef.current ||
        !voice ||
        !voice.lang.toLowerCase().replace("_", "-").startsWith(language)
      ) {
        return true;
      }
      patchListeningAttempt(slug, {
        step: "quiz",
        cursor: index,
        elapsedMs: Math.max(0, Date.now() - active.startedAt),
      });
      return true;
    }

    function speakFrom(index: number) {
      if (cancelled || generation !== generationRef.current || finishIfDone(index)) return;
      const voice = voiceRef.current;
      if (!voice || !voice.lang.toLowerCase().replace("_", "-").startsWith(language)) {
        setPlaying(false);
        setVoiceNote(true);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index] ?? "");
      utterance.lang = SPOKEN_LOCALES[language];
      utterance.rate = playbackRate;
      utterance.voice = voice;
      const epoch = speakEpochRef.current;
      let started = false;
      utterance.onstart = () => {
        if (epoch !== speakEpochRef.current || cancelled || generation !== generationRef.current) return;
        started = true;
        heardRef.current = true;
        setHeard(true);
      };
      utterance.onend = () => {
        if (
          epoch !== speakEpochRef.current ||
          !started ||
          cancelled ||
          pausedRef.current ||
          generation !== generationRef.current
        ) {
          return;
        }
        const next = index + 1;
        cursorRef.current = next;
        patchListeningAttempt(slug, { cursor: next });
        speakFrom(next);
      };
      utterance.onerror = (event) => {
        if (
          cancelled ||
          generation !== generationRef.current ||
          event.error === "interrupted" ||
          event.error === "canceled"
        ) {
          return;
        }
        setSpeechError(event.error || "playback-failed");
        setPlaying(false);
      };
      synth.speak(utterance);
    }

    let speakTimer = 0;

    function start() {
      if (cancelled || voicesReady) return;
      const voice = voiceRef.current;
      if (!voice || !voice.lang.toLowerCase().replace("_", "-").startsWith(language)) return;
      voicesReady = true;
      synth.cancel();
      speakTimer = window.setTimeout(() => {
        if (!cancelled) speakFrom(cursorRef.current);
      }, 60);
    }

    if (chunks.length === 0) return;

    const keepAlive = window.setInterval(() => {
      if (pausedRef.current) return;
      if (synth.paused || synth.speaking) synth.resume();
    }, 10_000);

    start();
    const onVoices = () => {
      const voice = pickVoice(synth.getVoices(), language);
      if (voice) voiceRef.current = voice;
      start();
    };
    synth.addEventListener("voiceschanged", onVoices);
    const fallback = window.setTimeout(start, 800);

    return () => {
      cancelled = true;
      generationRef.current += 1;
      speakEpochRef.current += 1;
      window.clearInterval(keepAlive);
      window.clearTimeout(fallback);
      window.clearTimeout(speakTimer);
      synth.removeEventListener("voiceschanged", onVoices);
      synth.cancel();
    };
  }, [playing, playToken, playbackRate, slug, body, language]);

  async function prepareTargetVoice() {
    if (!speechAvailable()) return null;
    const request = playRequestRef.current;
    const synth = window.speechSynthesis;
    const voice =
      voiceRef.current ??
      (await waitForVoice(synth, language, () => request !== playRequestRef.current));
    if (request !== playRequestRef.current || !voice) return null;
    voiceRef.current = voice;
    setVoiceName(voice.name);
    setVoiceNote(false);
    return voice;
  }

  async function beginPlayback() {
    playRequestRef.current += 1;
    pausedRef.current = false;
    setPaused(false);
    if (!speechAvailable() || speechChunks(body).length === 0) {
      setSpeechError("unavailable");
      setPlaying(false);
      return;
    }
    setSpeechError(null);
    const voice = await prepareTargetVoice();
    if (!voice) {
      setVoiceNote(true);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    setPlayToken((value) => value + 1);
  }

  async function startListening() {
    playRequestRef.current += 1;
    pausedRef.current = false;
    setPaused(false);
    if (!speechAvailable() || speechChunks(body).length === 0) {
      setSpeechError("unavailable");
      setVoiceNote(false);
      setPlaying(false);
      return;
    }
    const voice = await prepareTargetVoice();
    if (!voice) {
      setVoiceNote(true);
      setPlaying(false);
      return;
    }
    const paper = drawQuiz(questions, {
      channel: "listening",
      avoidIds: recentListeningQuestionIds(slug),
    });
    if (paper.length === 0) return;
    cursorRef.current = 0;
    heardRef.current = false;
    setHeard(false);
    beginListeningAttempt(slug, { rate, paper });
    setPlaying(true);
    setPlayToken((value) => value + 1);
  }

  function finishListening() {
    if (!attempt || !heard) return;
    speakEpochRef.current += 1;
    window.speechSynthesis?.cancel();
    setPlaying(false);
    patchListeningAttempt(slug, {
      step: "quiz",
      elapsedMs: Math.max(0, Date.now() - attempt.startedAt),
    });
  }

  const passages = speechChunks(body);
  const passageCount = passages.length;
  const passageNumber = Math.min((attempt?.cursor ?? 0) + 1, Math.max(passageCount, 1));
  const elapsed = attempt ? Math.max(0, now - attempt.startedAt) : 0;
  const unavailable = speechError != null && !heard;

  return (
    <ReadingTestFrame eyebrow="Listening" title={title}>
      {attempt == null ? (
        <ReadingLayout label="Choose a listening speed">
        <section className="mx-auto mt-12 max-w-md text-center" aria-labelledby="listening-setup">
          <h2 id="listening-setup" className="text-[1.05rem]">
            Choose a speed
          </h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">
            The story is read aloud. The text stays hidden. Playback uses this device&apos;s voice for the selected language.
          </p>
          {voiceNote ? (
            <p className="mt-6 text-[0.95rem] leading-relaxed" role="alert">
              No {language.toUpperCase()} voice is available on this device. The questions stay closed until a suitable voice can read the story.
            </p>
          ) : null}
          {speechError === "unavailable" ? (
            <p className="mt-6 text-[0.95rem] leading-relaxed" role="alert">
              Speech playback is not available in this browser. Listening needs a device that supports speech playback.
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {LISTENING_RATES.map((option) => (
              <button
                key={option}
                type="button"
                className="reading-kindle-button font-[inherit]"
                aria-pressed={rate === option}
                onClick={() => {
                  setRate(option);
                }}
              >
                {option.toFixed(2).replace(/0$/, "").replace(/\.0$/, "")}×
              </button>
            ))}
          </div>
          <div className="mt-10">
            <button
              type="button"
              className="reading-kindle-button font-[inherit]"
              onClick={startListening}
            >
              Start Listening
            </button>
          </div>
        </section>
        </ReadingLayout>
      ) : null}

      {attempt?.step === "active" ? (
        <ReadingLayout label="Listening player">
          <p className="text-center text-[0.95rem] leading-relaxed text-[var(--reading-ink-muted)]">
            {formatReadingDuration(elapsed)}
          </p>
          <p className="mt-3 text-center text-[0.8rem] tracking-[0.12em] text-[var(--reading-ink-muted)] uppercase">
            {rate}×
          </p>
          {paused ? (
            <p className="mx-auto mt-6 max-w-md text-center text-[0.95rem] leading-relaxed">
              {passageCount <= 1
                ? "Paused. Resume starts the story again from the beginning."
                : `Paused. Resume starts passage ${passageNumber} of ${passageCount} again from the beginning.`}
            </p>
          ) : passageCount > 1 ? (
            <p className="mt-3 text-center text-[0.8rem] tracking-[0.12em] text-[var(--reading-ink-muted)] uppercase">
              Passage {passageNumber} of {passageCount}
            </p>
          ) : null}
          {voiceName && !voiceNote ? (
            <p className="mt-3 text-center text-[0.8rem] tracking-[0.12em] text-[var(--reading-ink-muted)] uppercase">
              {language.toUpperCase()} voice: {voiceName}
            </p>
          ) : null}
          {voiceNote && !unavailable ? (
            <p className="mx-auto mt-8 max-w-md text-center text-[0.95rem] leading-relaxed" role="alert">
              No {language.toUpperCase()} voice is available on this device. The questions stay closed until a suitable voice can read the story.
            </p>
          ) : null}
          {unavailable ? (
            <p className="mx-auto mt-8 max-w-md text-center text-[0.95rem] leading-relaxed" role="alert">
              Speech playback is not available in this browser. Listening needs a device that supports speech playback.
            </p>
          ) : null}
          {speechError && heard ? (
            <p className="mx-auto mt-8 max-w-md text-center text-[0.95rem] leading-relaxed" role="alert">
              Playback stopped before the end. You can resume, restart, or finish with what you heard.
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {LISTENING_RATES.map((option) => (
              <button
                key={option}
                type="button"
                className="reading-kindle-button font-[inherit]"
                aria-pressed={rate === option}
                onClick={() => {
                  speakEpochRef.current += 1;
                  setRate(option);
                  pausedRef.current = false;
                  setPaused(false);
                  if (attempt?.step === "active") {
                    patchListeningAttempt(slug, { rate: option });
                  }
                }}
              >
                {option}×
              </button>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="reading-kindle-button font-[inherit] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={playing && !paused}
              onClick={() => {
                if (pausedRef.current) {
                  const synth = window.speechSynthesis;
                  pausedRef.current = false;
                  setPaused(false);
                  if (synth?.paused) {
                    synth.resume();
                    return;
                  }
                  if (attempt) cursorRef.current = attempt.cursor;
                  void beginPlayback();
                  return;
                }
                if (attempt) cursorRef.current = attempt.cursor;
                void beginPlayback();
              }}
            >
              {paused || (!playing && heard) ? "Resume" : "Play"}
            </button>
            <button
              type="button"
              className="reading-kindle-button font-[inherit]"
              onClick={() => {
                pausedRef.current = true;
                setPaused(true);
                const synth = window.speechSynthesis;
                if (!synth) return;
                synth.pause();
                window.setTimeout(() => {
                  if (!pausedRef.current || synth.paused) return;
                  speakEpochRef.current += 1;
                  synth.cancel();
                }, 100);
              }}
            >
              Pause
            </button>
            <button
              type="button"
              className="reading-kindle-button font-[inherit]"
              onClick={() => {
                pausedRef.current = false;
                speakEpochRef.current += 1;
                setPaused(false);
                cursorRef.current = 0;
                if (attempt) patchListeningAttempt(slug, { cursor: 0 });
                void beginPlayback();
              }}
            >
              Restart
            </button>
            <button
              type="button"
              className="reading-kindle-button font-[inherit] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={finishListening}
              disabled={!heard}
            >
              Finish Listening
            </button>
          </div>
        </ReadingLayout>
      ) : null}

      {attempt?.step === "quiz" && attempt.elapsedMs != null ? (
        <ReadingLayout label="Comprehension questions">
          <QuizForm
            questions={attempt.paper}
            answers={attempt.answers}
            canSubmit={attempt.paper.every((question) =>
              question.choices.some((choice) => choice.id === attempt.answers[question.id]),
            )}
            onAnswer={(questionId, choiceId) => {
              patchListeningAttempt(slug, {
                answers: { ...attempt.answers, [questionId]: choiceId },
              });
            }}
            onSubmit={() => {
              patchListeningAttempt(slug, { step: "results" });
            }}
          />
        </ReadingLayout>
      ) : null}

      {attempt?.step === "results" && attempt.elapsedMs != null ? (
        <TestResults
          kind="listening"
          correct={scoreDrawnQuiz(attempt.paper, attempt.answers).correct}
          total={scoreDrawnQuiz(attempt.paper, attempt.answers).total}
          percent={scoreDrawnQuiz(attempt.paper, attempt.answers).percent}
          elapsedMs={attempt.elapsedMs}
          author={author}
          enjoyment={enjoyment}
          onEnjoyment={setEnjoyment}
          onReplay={() => {
            window.speechSynthesis?.cancel();
            clearListeningAttempt(slug);
            setAuthor(null);
            setPlaying(false);
            heardRef.current = false;
            setHeard(false);
            setVoiceNote(false);
          }}
          continueUrl={continueUrl}
        />
      ) : null}
    </ReadingTestFrame>
  );
}

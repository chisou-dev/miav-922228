"use client";

import { FormEvent, useEffect, useState } from "react";
import { useT } from "@/features/shared/i18n";

type SubmitState = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [contactEnabled, setContactEnabled] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/site-control");
        const data = (await response.json().catch(() => null)) as {
          contactEnabled?: boolean;
        } | null;
        if (response.ok && typeof data?.contactEnabled === "boolean") {
          setContactEnabled(data.contactEnabled);
        }
      } catch {
        // Keep form available if the flag check fails.
      }
    })();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactEnabled) {
      setState("error");
      setError(t("contact.disabled"));
      return;
    }
    setState("sending");
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        code?: string;
      } | null;

      if (!response.ok) {
        setState("error");
        if (data?.code === "CONTACT_DISABLED") {
          setContactEnabled(false);
          setError(t("contact.disabled"));
          return;
        }
        setError(
          response.status === 429
            ? t("contact.errorRateLimit")
            : data?.error || t("contact.errorGeneric"),
        );
        return;
      }

      setName("");
      setEmail("");
      setMessage("");
      setWebsite("");
      setState("sent");
    } catch {
      setState("error");
      setError(t("contact.errorGeneric"));
    }
  }

  if (!contactEnabled) {
    return (
      <p className="mt-16 text-[0.95rem] leading-[2] text-[var(--foreground-muted)] sm:mt-20">
        {t("contact.disabled")}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative mt-16 space-y-12 sm:mt-20 sm:space-y-14"
      noValidate
    >
      {/* Honeypot for bots — hidden from people, must stay empty */}
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="website">{t("contact.website")}</label>
        <input
          id="website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <label className="block">
        <span className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
          {t("contact.name")}
        </span>
        <input
          type="text"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-4 w-full border-0 border-b border-[var(--line)] bg-transparent px-0 py-3 text-[1.02rem] text-[var(--foreground)] outline-none transition-colors duration-300 placeholder:text-[var(--foreground-muted)] focus:border-[var(--foreground-muted)]"
          autoComplete="name"
        />
      </label>

      <label className="block">
        <span className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
          {t("contact.email")}
        </span>
        <input
          type="email"
          name="email"
          required
          maxLength={200}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-4 w-full border-0 border-b border-[var(--line)] bg-transparent px-0 py-3 text-[1.02rem] text-[var(--foreground)] outline-none transition-colors duration-300 placeholder:text-[var(--foreground-muted)] focus:border-[var(--foreground-muted)]"
          autoComplete="email"
        />
      </label>

      <label className="block">
        <span className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
          {t("contact.message")}
        </span>
        <textarea
          name="message"
          required
          maxLength={5000}
          rows={8}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-4 w-full resize-y border border-[var(--line)] bg-transparent px-4 py-4 text-[1.02rem] leading-[2] text-[var(--foreground)] outline-none transition-colors duration-300 placeholder:text-[var(--foreground-muted)] focus:border-[var(--foreground-muted)]"
        />
      </label>

      <div className="pt-4">
        <button
          type="submit"
          disabled={state === "sending"}
          className="text-[0.85rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.55em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)] disabled:opacity-50"
        >
          {state === "sending" ? t("contact.sending") : t("contact.send")}
        </button>
      </div>

      {state === "sent" ? (
        <p className="text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          {t("contact.success")}
        </p>
      ) : null}

      {state === "error" && error ? (
        <p className="text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}

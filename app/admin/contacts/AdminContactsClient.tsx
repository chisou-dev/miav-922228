"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import type { ContactMessage, ContactStatus } from "@/lib/contact/types";
import {
  getFirebaseAuth,
  getPublicAdminUid,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";

type Gate =
  | { kind: "loading" }
  | { kind: "unconfigured" }
  | { kind: "signed_out" }
  | { kind: "forbidden" }
  | { kind: "ready"; user: User };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AdminContactsClient() {
  const configured = useMemo(() => isFirebaseClientConfigured(), []);
  const adminUid = useMemo(() => getPublicAdminUid(), []);
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadMessages = useCallback(async (user: User) => {
    setListError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => null)) as {
        messages?: ContactMessage[];
        error?: string;
      } | null;

      if (!response.ok) {
        setListError(data?.error || "Unable to load messages.");
        setMessages([]);
        return;
      }

      setMessages(data?.messages || []);
    } catch {
      setListError("Unable to load messages.");
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setGate({ kind: "unconfigured" });
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setGate({ kind: "signed_out" });
        setMessages([]);
        return;
      }

      if (!adminUid || user.uid !== adminUid) {
        setGate({ kind: "forbidden" });
        setMessages([]);
        return;
      }

      setGate({ kind: "ready", user });
      await loadMessages(user);
    });

    return () => unsubscribe();
  }, [adminUid, configured, loadMessages]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password,
      );

      if (!adminUid || credential.user.uid !== adminUid) {
        await signOut(getFirebaseAuth());
        setGate({ kind: "forbidden" });
        setAuthError("Access denied for this account.");
        return;
      }
    } catch {
      setAuthError("Unable to sign in.");
    }
  }

  async function onSignOut() {
    await signOut(getFirebaseAuth());
  }

  async function updateStatus(id: string, status: ContactStatus) {
    if (gate.kind !== "ready") return;
    setBusyId(id);

    try {
      const token = await gate.user.getIdToken();
      const response = await fetch(`/api/admin/contacts/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setListError(data?.error || "Unable to update status.");
        return;
      }

      setMessages((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    } catch {
      setListError("Unable to update status.");
    } finally {
      setBusyId(null);
    }
  }

  if (gate.kind === "loading") {
    return (
      <p className="mt-20 text-center text-[0.95rem] text-[var(--foreground-muted)]">
        Loading…
      </p>
    );
  }

  if (gate.kind === "unconfigured") {
    return (
      <p className="mt-20 text-center text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
        Firebase is not configured for this environment.
      </p>
    );
  }

  if (gate.kind === "forbidden") {
    return (
      <div className="mt-20 text-center">
        <p className="text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          Access denied. This archive is available only to the designated
          administrator.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-10 text-[0.8rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em]"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (gate.kind === "signed_out") {
    return (
      <form onSubmit={onLogin} className="mx-auto mt-20 max-w-md space-y-10">
        <p className="text-center text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          Administrator sign-in is required to read the contact archive.
        </p>

        <label className="block">
          <span className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-4 w-full border-0 border-b border-[var(--line)] bg-transparent px-0 py-3 text-[1.02rem] text-[var(--foreground)] outline-none focus:border-[var(--foreground-muted)]"
          />
        </label>

        <label className="block">
          <span className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
            Password
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-4 w-full border-0 border-b border-[var(--line)] bg-transparent px-0 py-3 text-[1.02rem] text-[var(--foreground)] outline-none focus:border-[var(--foreground-muted)]"
          />
        </label>

        <button
          type="submit"
          className="text-[0.85rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.55em]"
        >
          Sign in
        </button>

        {authError ? (
          <p className="text-[0.95rem] text-[var(--foreground-muted)]">{authError}</p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="mt-16 sm:mt-20">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-[0.78rem] tracking-[0.14em] text-[var(--foreground-muted)]">
          {messages.length} record{messages.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] hover:text-[var(--foreground)]"
        >
          Sign out
        </button>
      </div>

      {listError ? (
        <p className="mt-8 text-[0.95rem] text-[var(--foreground-muted)]">{listError}</p>
      ) : null}

      {messages.length === 0 && !listError ? (
        <p className="mt-16 text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          No messages have been recorded yet.
        </p>
      ) : (
        <ol className="mt-10 list-none">
          {messages.map((item) => (
            <li
              key={item.id}
              className="border-t border-[var(--line)] py-12 sm:py-16"
            >
              <article>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
                    {item.status}
                  </p>
                  <time
                    dateTime={item.createdAt}
                    className="text-[0.78rem] tracking-[0.08em] text-[var(--foreground-muted)]"
                  >
                    {formatDate(item.createdAt)}
                  </time>
                </div>

                <h2 className="mt-6 text-[1.2rem] font-medium tracking-[0.04em] text-[var(--foreground)]">
                  {item.name}
                </h2>
                <p className="mt-3 text-[0.9rem] tracking-[0.02em] text-[var(--foreground-muted)]">
                  {item.email}
                </p>
                <p className="mt-8 whitespace-pre-wrap text-[1.02rem] leading-[2.2] text-[var(--foreground)]">
                  {item.message}
                </p>

                <div className="mt-10 flex flex-wrap gap-8">
                  {item.status === "unread" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "read")}
                      className="text-[0.78rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em] disabled:opacity-50"
                    >
                      Mark as read
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "unread")}
                      className="text-[0.78rem] tracking-[0.12em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] disabled:opacity-50"
                    >
                      Mark as unread
                    </button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

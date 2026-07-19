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
  | { kind: "unconfigured"; missingClientKeys: string[] }
  | { kind: "signed_out" }
  | { kind: "forbidden" }
  | { kind: "ready"; user: User };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: ContactStatus) {
  return status === "unread" ? "未読" : "既読";
}

function sortByNewest(messages: ContactMessage[]) {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

function previewText(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 72) return compact;
  return `${compact.slice(0, 72)}…`;
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
  const [openId, setOpenId] = useState<string | null>(null);

  const sortedMessages = useMemo(() => sortByNewest(messages), [messages]);
  const unreadCount = useMemo(
    () => messages.filter((item) => item.status === "unread").length,
    [messages],
  );

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
        setListError(data?.error || "問い合わせ一覧を読み込めませんでした。");
        setMessages([]);
        return;
      }

      setMessages(sortByNewest(data?.messages || []));
    } catch {
      setListError("問い合わせ一覧を読み込めませんでした。");
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      void (async () => {
        try {
          const response = await fetch("/api/health/firebase");
          const data = (await response.json().catch(() => null)) as {
            missingClientKeys?: string[];
          } | null;
          setGate({
            kind: "unconfigured",
            missingClientKeys: data?.missingClientKeys || [],
          });
        } catch {
          setGate({ kind: "unconfigured", missingClientKeys: [] });
        }
      })();
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setGate({ kind: "signed_out" });
        setMessages([]);
        setOpenId(null);
        return;
      }

      if (!adminUid || user.uid !== adminUid) {
        setGate({ kind: "forbidden" });
        setMessages([]);
        setOpenId(null);
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
        setAuthError("このアカウントではアクセスできません。");
        return;
      }
    } catch {
      setAuthError("サインインに失敗しました。");
    }
  }

  async function onSignOut() {
    await signOut(getFirebaseAuth());
  }

  async function updateStatus(id: string, status: ContactStatus) {
    if (gate.kind !== "ready") return false;
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
        setListError(data?.error || "ステータスを更新できませんでした。");
        return false;
      }

      setMessages((current) =>
        sortByNewest(
          current.map((item) => (item.id === id ? { ...item, status } : item)),
        ),
      );
      return true;
    } catch {
      setListError("ステータスを更新できませんでした。");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function openMessage(item: ContactMessage) {
    const nextOpenId = openId === item.id ? null : item.id;
    setOpenId(nextOpenId);

    if (nextOpenId && item.status === "unread") {
      await updateStatus(item.id, "read");
    }
  }

  if (gate.kind === "loading") {
    return (
      <p className="mt-20 text-center text-[0.95rem] text-[var(--foreground-muted)]">
        読み込み中…
      </p>
    );
  }

  if (gate.kind === "unconfigured") {
    return (
      <div className="mt-20 text-center">
        <p className="text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          Firebase is not configured for this environment.
        </p>
        <p className="mt-6 text-[0.85rem] leading-[1.9] text-[var(--foreground-muted)]">
          Set the Firebase environment variables in Vercel (Production), then
          redeploy. Check{" "}
          <a
            href="/api/health/firebase"
            className="underline decoration-[var(--line)] underline-offset-[0.4em]"
          >
            /api/health/firebase
          </a>
          .
        </p>
        {gate.missingClientKeys.length > 0 ? (
          <p className="mt-8 text-[0.78rem] tracking-[0.04em] text-[var(--foreground-muted)]">
            Missing: {gate.missingClientKeys.join(", ")}
          </p>
        ) : null}
      </div>
    );
  }

  if (gate.kind === "forbidden") {
    return (
      <div className="mt-20 text-center">
        <p className="text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          アクセスが拒否されました。管理者のみ利用できます。
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-10 text-[0.8rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em]"
        >
          サインアウト
        </button>
      </div>
    );
  }

  if (gate.kind === "signed_out") {
    return (
      <form onSubmit={onLogin} className="mx-auto mt-20 max-w-md space-y-10">
        <p className="text-center text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          問い合わせ管理には管理者サインインが必要です。
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
          サインイン
        </button>

        {authError ? (
          <p className="text-[0.95rem] text-[var(--foreground-muted)]">{authError}</p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="mt-14 sm:mt-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.78rem] tracking-[0.12em] text-[var(--foreground-muted)]">
            全 {messages.length} 件 / 未読 {unreadCount} 件
          </p>
          <p className="mt-2 text-[0.8rem] text-[var(--foreground-muted)]">
            新しい順に表示しています
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="self-start text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] hover:text-[var(--foreground)] sm:self-auto"
        >
          サインアウト
        </button>
      </div>

      {listError ? (
        <p className="mt-8 text-[0.95rem] text-[var(--foreground-muted)]">{listError}</p>
      ) : null}

      {messages.length === 0 && !listError ? (
        <p className="mt-16 text-[0.95rem] leading-[2] text-[var(--foreground-muted)]">
          まだ問い合わせはありません。
        </p>
      ) : (
        <ul className="mt-10 list-none space-y-4">
          {sortedMessages.map((item) => {
            const isOpen = openId === item.id;
            const isUnread = item.status === "unread";

            return (
              <li key={item.id}>
                <article
                  className={[
                    "rounded-sm border border-[var(--line)] px-5 py-5 transition-colors duration-200 sm:px-6 sm:py-6",
                    isUnread ? "bg-white/[0.06]" : "bg-transparent",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => void openMessage(item)}
                    disabled={busyId === item.id}
                    className="w-full text-left disabled:opacity-60"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span
                        className={[
                          "text-[0.72rem] tracking-[0.16em]",
                          isUnread
                            ? "font-semibold text-[var(--foreground)]"
                            : "text-[var(--foreground-muted)]",
                        ].join(" ")}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <time
                        dateTime={item.createdAt}
                        className="text-[0.78rem] text-[var(--foreground-muted)]"
                      >
                        {formatDate(item.createdAt)}
                      </time>
                    </div>

                    <h2
                      className={[
                        "mt-3 text-[1.15rem] tracking-[0.02em] text-[var(--foreground)]",
                        isUnread ? "font-semibold" : "font-medium",
                      ].join(" ")}
                    >
                      {item.name}
                    </h2>

                    {!isOpen ? (
                      <p className="mt-3 text-[0.92rem] leading-[1.8] text-[var(--foreground-muted)]">
                        {previewText(item.message)}
                      </p>
                    ) : null}
                  </button>

                  {isOpen ? (
                    <div className="mt-5 border-t border-[var(--line)] pt-5">
                      <p className="text-[0.78rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                        Email
                      </p>
                      <a
                        href={`mailto:${item.email}`}
                        className="mt-2 inline-block text-[0.98rem] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.35em] hover:decoration-[var(--foreground-muted)]"
                      >
                        {item.email}
                      </a>

                      <p className="mt-8 text-[0.78rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                        Message
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-[1.02rem] leading-[2.05] text-[var(--foreground)]">
                        {item.message}
                      </p>

                      {item.status === "read" ? (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void updateStatus(item.id, "unread")}
                          className="mt-8 text-[0.78rem] tracking-[0.12em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.45em] disabled:opacity-50"
                        >
                          未読に戻す
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

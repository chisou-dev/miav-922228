"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LibraryShell } from "@/features/library/LibraryShell";
import { listSignalDefinitions } from "@/features/signals/definitions";
import { listUserSignals } from "@/features/signals/storage";
import type {
  SignalDefinition,
  SignalSource,
  UserSignal,
} from "@/features/signals/types";
import { useT, type MessageKey } from "@/features/shared/i18n";
import { EnterSignalForm } from "@/features/signals/EnterSignalForm";

const SOURCE_ORDER: SignalSource[] = [
  "novel",
  "binary",
  "luminous",
  "writer-memo",
  "miav-world",
  "other",
];

const SOURCE_LABEL_KEY: Record<SignalSource, MessageKey> = {
  novel: "signals.source.novel",
  binary: "signals.source.binary",
  luminous: "signals.source.luminous",
  "writer-memo": "signals.source.writerMemo",
  "miav-world": "signals.source.miavWorld",
  other: "signals.source.other",
};

type SignalRow = {
  definition: SignalDefinition;
  owned: UserSignal | undefined;
};

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function SignalCard({
  row,
  onCopied,
}: {
  row: SignalRow;
  onCopied: () => void;
}) {
  const t = useT();
  const { definition, owned } = row;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const showDetails = Boolean(owned) || !definition.hidden;

  const handleCopy = useCallback(async () => {
    if (!owned) return;
    const ok = await copyText(owned.code);
    setCopyState(ok ? "copied" : "failed");
    if (ok) onCopied();
    window.setTimeout(() => setCopyState("idle"), 1800);
  }, [owned, onCopied]);

  if (!owned && definition.hidden) {
    return (
      <li className="border-b border-[var(--line)] py-8 last:border-b-0">
        <p className="text-[0.95rem] tracking-[0.04em] text-[var(--foreground-muted)]">
          🔒 {t("signals.unknown")}
        </p>
      </li>
    );
  }

  return (
    <li className="border-b border-[var(--line)] py-8 last:border-b-0">
      <p className="text-[0.95rem] font-medium tracking-[0.04em] text-[var(--foreground)]">
        {owned ? "✓ " : "🔒 "}
        {showDetails ? definition.title : t("signals.unknown")}
      </p>
      {showDetails && definition.description ? (
        <p className="mt-3 max-w-md text-[0.9rem] leading-[1.85] tracking-[0.01em] text-[var(--foreground-muted)]">
          {definition.description}
        </p>
      ) : null}
      {owned ? (
        <div className="mt-5">
          <p className="font-mono text-[0.85rem] tracking-[0.12em] text-[var(--foreground)]">
            {owned.code}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-4 text-[0.78rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
          >
            {copyState === "copied"
              ? t("signals.copied")
              : t("signals.copy")}
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function MySignalsPage() {
  const t = useT();
  const [owned, setOwned] = useState<UserSignal[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setOwned(listUserSignals());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rowsBySource = useMemo(() => {
    const ownedMap = new Map(owned.map((item) => [item.signalId, item]));
    const groups = new Map<SignalSource, SignalRow[]>();

    for (const definition of listSignalDefinitions()) {
      const row: SignalRow = {
        definition,
        owned: ownedMap.get(definition.id),
      };
      const list = groups.get(definition.source) ?? [];
      list.push(row);
      groups.set(definition.source, list);
    }

    return SOURCE_ORDER.map((source) => ({
      source,
      rows: groups.get(source) ?? [],
    })).filter((group) => group.rows.length > 0);
  }, [owned]);

  const discovered = owned.length;
  const total = listSignalDefinitions().length;

  return (
    <LibraryShell
      eyebrow={t("signals.eyebrow")}
      title={t("signals.title")}
      summary={t("signals.summary")}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: t("signals.title"), href: "/signals" },
      ]}
    >
      <div className="pt-2">
        <p className="text-[0.78rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
          {t("signals.discovered", {
            found: discovered,
            total: total,
          })}
        </p>

        {!ready ? (
          <p className="mt-10 text-[0.9rem] text-[var(--foreground-muted)]">
            {t("common.loading")}
          </p>
        ) : (
          <div className="mt-6">
            {rowsBySource.map((group) => (
              <section key={group.source} className="mt-12 first:mt-10">
                <h2 className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
                  {t(SOURCE_LABEL_KEY[group.source])}
                </h2>
                <ul>
                  {group.rows.map((row) => (
                    <SignalCard
                      key={row.definition.id}
                      row={row}
                      onCopied={refresh}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <section className="mt-20 border-t border-[var(--line)] pt-12">
          <h2 className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            {t("signals.enterHeading")}
          </h2>
          <p className="mt-4 max-w-md text-[0.9rem] leading-[1.85] text-[var(--foreground-muted)]">
            {t("signals.enterHint")}
          </p>
          <div className="mt-8">
            <EnterSignalForm targetApp="miav" onRedeemed={refresh} />
          </div>
        </section>
      </div>
    </LibraryShell>
  );
}

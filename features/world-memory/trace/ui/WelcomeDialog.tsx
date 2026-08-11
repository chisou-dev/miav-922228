"use client";

import { useEffect, useState } from "react";
import {
  TraceDialogFrame,
  TraceDialogPrimaryButton,
} from "@/features/world-memory/trace/ui/TraceDialogFrame";
import { useT } from "@/features/shared/i18n";

export type WelcomeDialogBody = {
  paragraphs: string[];
  bullets?: string[];
  closing?: string[];
};

type Props = {
  open: boolean;
  title: string;
  body: WelcomeDialogBody;
  confirmLabel?: string;
  onClose: () => void;
};

/**
 * First-visit entrance for MIAV World.
 * Must be acknowledged before the map can be used.
 */
export function WelcomeDialog({
  open,
  title,
  body,
  confirmLabel,
  onClose,
}: Props) {
  const t = useT();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!open) setAgreed(false);
  }, [open]);

  function confirm() {
    if (!agreed) return;
    onClose();
  }

  return (
    <TraceDialogFrame
      open={open}
      title={title}
      eyebrow={t("world.welcomeEyebrow")}
      onClose={onClose}
      closeOnEscape={false}
      closeOnOverlayClick={false}
      onEnterConfirm={confirm}
      footer={
        <div className="space-y-8">
          <label className="flex cursor-pointer items-start gap-3 text-[0.85rem] leading-[1.7] text-[var(--map-ink,#243447)]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#5b7c99]"
            />
            <span>
              {t("world.welcomeAgreePrefix")}{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--map-accent,#5b7c99)] underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.35em]"
                onClick={(event) => event.stopPropagation()}
              >
                {t("world.privacyPolicyLabel")}
              </a>{" "}
              {t("world.agreeAnd")}{" "}
              <a
                href="/site-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--map-accent,#5b7c99)] underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.35em]"
                onClick={(event) => event.stopPropagation()}
              >
                {t("world.sitePolicy")}
              </a>
              .
            </span>
          </label>

          <TraceDialogPrimaryButton disabled={!agreed} onClick={confirm}>
            {confirmLabel ?? t("world.welcomeUnderstand")}
          </TraceDialogPrimaryButton>
        </div>
      }
    >
      {body.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      {body.bullets && body.bullets.length > 0 ? (
        <ul className="list-none space-y-1.5">
          {body.bullets.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : null}

      {body.closing?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </TraceDialogFrame>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  TraceDialogFrame,
  TraceDialogPrimaryButton,
  TraceDialogQuietButton,
} from "@/features/world-memory/trace/ui/TraceDialogFrame";
import { useT } from "@/features/shared/i18n";

type Props = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function GoogleSignInDialog({
  open,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const t = useT();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!open) setAgreed(false);
  }, [open]);

  return (
    <TraceDialogFrame
      open={open}
      title={t("world.googleDialogTitle")}
      eyebrow={t("world.googleDialogEyebrow")}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="space-y-8">
          <label className="flex cursor-pointer items-start gap-3 text-[0.85rem] leading-[1.7] text-[var(--map-ink,#243447)]">
            <input
              type="checkbox"
              checked={agreed}
              disabled={busy}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#5b7c99]"
            />
            <span>
              {t("world.agreePrivacyPrefix")}{" "}
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

          <div className="space-y-3">
            <div>
              <TraceDialogPrimaryButton
                disabled={!agreed || busy}
                onClick={onConfirm}
              >
                {busy ? t("world.continuing") : t("world.continueToPermanent")}
              </TraceDialogPrimaryButton>
              <p className="mt-2 text-[0.72rem] leading-[1.7] text-[var(--map-muted,#6b7c8f)]">
                {t("world.verifiedGoogle")}
              </p>
            </div>
            <TraceDialogQuietButton
              disabled={busy}
              onClick={() => {
                if (!busy) onClose();
              }}
            >
              {t("world.cancel")}
            </TraceDialogQuietButton>
          </div>
        </div>
      }
    >
      <p>{t("world.googleDialogIntro")}</p>

      <div>
        <p className="text-[var(--map-ink,#243447)]">
          {t("world.googleDoesNotStoreHeading")}
        </p>
        <ul className="mt-3 list-none space-y-1.5">
          <li>• {t("world.googleDoesNotStoreEmail")}</li>
          <li>• {t("world.googleDoesNotStoreName")}</li>
          <li>• {t("world.googleDoesNotStorePhoto")}</li>
          <li>• {t("world.googleDoesNotStoreAccount")}</li>
        </ul>
      </div>

      <p>{t("world.googleUidNote")}</p>
      <p>{t("world.googleNeverAccess")}</p>
      <p>{t("world.responsibility")}</p>
      <p>{t("world.noEdit")}</p>
      <p>{t("world.removal")}</p>
    </TraceDialogFrame>
  );
}

"use client";

import {
  TraceDialogFrame,
  TraceDialogPolicyLinks,
  TraceDialogPrimaryButton,
} from "@/components/trace/TraceDialogFrame";

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
 * First-visit welcome for MIAV World Map.
 * Body content is passed via props for reuse / localization.
 */
export function WelcomeDialog({
  open,
  title,
  body,
  confirmLabel = "I Understand",
  onClose,
}: Props) {
  return (
    <TraceDialogFrame
      open={open}
      title={title}
      eyebrow="World Map"
      onClose={onClose}
      closeOnEnter
      footer={
        <div className="space-y-8">
          <TraceDialogPrimaryButton onClick={onClose}>
            {confirmLabel}
          </TraceDialogPrimaryButton>
          <TraceDialogPolicyLinks />
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

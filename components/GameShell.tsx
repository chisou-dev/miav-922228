import type { ReactNode } from "react";
import { LunaCompanion } from "@/components/LunaCompanion";

type Props = {
  title: string;
  backHref?: string;
  children: ReactNode;
  /** Hide the large title chrome — game UI owns its own header. */
  compact?: boolean;
  /** Show site mascot in the corner. */
  showLuna?: boolean;
};

export function GameShell({
  title,
  backHref = "/game",
  children,
  compact = false,
  showLuna = false,
}: Props) {
  if (compact) {
    return (
      <div className="shell shell--compact">
        <main className="shell-main shell-main--compact">{children}</main>
        {showLuna ? <LunaCompanion variant="corner" animation="idle" /> : null}
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <a href={backHref} className="shell-back">
          Game Library
        </a>
        <h1 className="shell-title">{title}</h1>
      </header>
      <main className="shell-main">{children}</main>
      {showLuna ? <LunaCompanion variant="corner" animation="idle" /> : null}
    </div>
  );
}

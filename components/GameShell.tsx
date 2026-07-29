import type { ReactNode } from "react";

type Props = {
  title: string;
  backHref?: string;
  children: ReactNode;
  /** Hide the large title chrome — game UI owns its own header. */
  compact?: boolean;
};

export function GameShell({
  title,
  backHref = "/game",
  children,
  compact = false,
}: Props) {
  if (compact) {
    return (
      <div className="shell shell--compact">
        <main className="shell-main shell-main--compact">{children}</main>
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
    </div>
  );
}

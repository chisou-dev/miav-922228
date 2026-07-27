import type { ReactNode } from "react";

type Props = {
  title: string;
  backHref?: string;
  children: ReactNode;
};

export function GameShell({ title, backHref = "/game", children }: Props) {
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

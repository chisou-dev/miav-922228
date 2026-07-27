import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Shared in-game chrome — canvas mounts inside children. */
export function GameLayout({ children }: Props) {
  return <div className="game-layout">{children}</div>;
}

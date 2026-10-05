"use client";

import { createContext, useContext } from "react";
import { ReentryMobileTeaser } from "./ReentryMobileTeaser";

const ReentryShellContext = createContext<{ openStage: () => void } | null>(
  null,
);

export function ReentryShellProvider({
  openStage,
  children,
}: {
  openStage: () => void;
  children: React.ReactNode;
}) {
  return (
    <ReentryShellContext.Provider value={{ openStage }}>
      {children}
    </ReentryShellContext.Provider>
  );
}

export function ReentryHeroTeaser() {
  const ctx = useContext(ReentryShellContext);
  if (!ctx) return null;
  return (
    <div className="shrink-0 lg:hidden">
      <ReentryMobileTeaser onOpen={ctx.openStage} />
    </div>
  );
}

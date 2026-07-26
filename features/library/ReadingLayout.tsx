import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Accessible name for the reading region when wrapping an article. */
  label?: string;
};

/**
 * Paper reading surface for chapter / flash / Kindle continue landings.
 * Site chrome stays blue; only this region uses warm paper tones.
 */
export function ReadingLayout({ children, className, label }: Props) {
  return (
    <div
      className={["reading-layout", className].filter(Boolean).join(" ")}
      aria-label={label}
    >
      {children}
    </div>
  );
}

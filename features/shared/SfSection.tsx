import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Shared MIAV SF section language — same signal / trace dividers as the home page.
 * Decorative lines are CSS ::before/::after (not announced to screen readers).
 */
export type SfSectionVariant =
  | "central"
  | "central-offset"
  | "split"
  | "trace"
  | "terminal";

const VARIANT_CLASS: Record<SfSectionVariant, string> = {
  central: "sf-section--central",
  "central-offset": "sf-section--central-offset",
  split: "sf-section--split",
  trace: "sf-section--trace",
  terminal: "sf-section--terminal",
};

/** Cycle home variants across long lists (archive, books, etc.). */
export const SF_SECTION_VARIANTS: readonly SfSectionVariant[] = [
  "central",
  "split",
  "trace",
  "central-offset",
  "terminal",
] as const;

export function sfSectionVariantAt(index: number): SfSectionVariant {
  return SF_SECTION_VARIANTS[index % SF_SECTION_VARIANTS.length];
}

export function sfSectionClass(
  variant: SfSectionVariant = "central",
  className?: string,
): string {
  return ["sf-section", VARIANT_CLASS[variant], className]
    .filter(Boolean)
    .join(" ");
}

type SfSectionProps = ComponentPropsWithoutRef<"section"> & {
  variant?: SfSectionVariant;
  children?: ReactNode;
};

export function SfSection({
  variant = "central",
  className,
  children,
  ...props
}: SfSectionProps) {
  return (
    <section className={sfSectionClass(variant, className)} {...props}>
      {children}
    </section>
  );
}

/**
 * Standalone decorative divider when wrapping a full section is awkward.
 * Prefer SfSection when the following block is a real content section.
 */
export function SfDivider({
  variant = "central",
  className,
}: {
  variant?: SfSectionVariant;
  className?: string;
}) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={sfSectionClass(variant, className ?? "sf-divider")}
    />
  );
}

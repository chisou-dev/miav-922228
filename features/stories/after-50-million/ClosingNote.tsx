import { after50MillionAmazonHref } from "@/features/stories/after-50-million/work";

/**
 * Quiet close of the free preview. A link renders only when amazonUrl is a real URL.
 */
export function After50MillionClosing() {
  const href = after50MillionAmazonHref();

  if (href) {
    return (
      <p className="text-[0.85rem] leading-relaxed tracking-[0.04em]">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:text-[var(--foreground-muted)]"
        >
          Continue reading on Amazon
        </a>
      </p>
    );
  }

  return (
    <p className="text-[0.85rem] leading-relaxed tracking-[0.04em] text-[var(--foreground-muted)]">
      The complete novel will be available on Amazon.
    </p>
  );
}

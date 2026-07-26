type Props = {
  /** Optional heading above the description (usually omitted when the page title already shows). */
  title?: string;
  description: string;
  amazonUrl: string;
  buttonLabel?: string;
};

/**
 * Quiet landing block: continue reading on Kindle (or another storefront).
 * Reusable across series — keep typography aligned with Works / chapter pages.
 */
export function BookContinueCard({
  title,
  description,
  amazonUrl,
  buttonLabel = "Read the complete story on Amazon Kindle",
}: Props) {
  const paragraphs = description
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto mt-12 max-w-prose text-center sm:mt-16">
      {title ? (
        <h2 className="text-[1.05rem] font-medium tracking-[0.06em] text-[var(--foreground)]">
          {title}
        </h2>
      ) : null}

      <div
        className={`space-y-6 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-[1.02rem] sm:leading-[2.15] ${
          title ? "mt-8" : ""
        }`}
      >
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-14 sm:mt-16">
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-6 text-[0.78rem] tracking-[0.12em] text-[var(--foreground)] transition-colors duration-300 hover:border-[var(--foreground-muted)] hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]"
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  );
}

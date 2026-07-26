type Props = {
  /** Optional heading above the description (usually omitted when the page title already shows). */
  title?: string;
  description: string;
  amazonUrl: string;
  buttonLabel?: string;
};

/**
 * Quiet landing block: continue reading on Kindle (or another storefront).
 * Uses ReadingLayout paper surface — keep typography aligned with chapter pages.
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
    <div className="reading-layout">
      {title ? (
        <h2 className="text-center text-[1.05rem] font-medium tracking-[0.06em]">
          {title}
        </h2>
      ) : null}

      <div
        className={`story-content story-content--center ${title ? "mt-8" : ""}`}
      >
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-14 text-center sm:mt-16">
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="reading-kindle-button"
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  );
}

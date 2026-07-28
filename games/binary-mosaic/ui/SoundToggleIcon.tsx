/** Inline SVG — speaker with waves (on) or without (muted). No image files. */

type Props = {
  muted: boolean;
  className?: string;
};

export function SoundToggleIcon({ muted, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden="true"
      focusable="false"
    >
      {/* Speaker body */}
      <path
        fill="currentColor"
        d="M4 9v6h4l5 4V5L8 9H4z"
      />
      {!muted ? (
        <>
          {/* Sound waves */}
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            d="M14.5 8.5a5 5 0 0 1 0 7"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            d="M17.5 6a8.5 8.5 0 0 1 0 12"
          />
        </>
      ) : null}
    </svg>
  );
}

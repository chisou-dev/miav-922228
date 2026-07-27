type Props = {
  visible: boolean;
};

/** Post-sync message and path into the Works library. */
export function MemoryUnlock({ visible }: Props) {
  return (
    <div
      className={`memory-unlock${visible ? " memory-unlock--visible" : ""}`}
      aria-hidden={!visible}
    >
      <p className="memory-unlock-message">Memory synchronized.</p>
      <a href="/works" className="memory-unlock-works">
        Works
      </a>
    </div>
  );
}

type Props = {
  lit: boolean;
  onActivate: () => void;
};

/** Glowing data node — only interactive while lit. */
export function DataNode({ lit, onActivate }: Props) {
  return (
    <button
      type="button"
      className={`data-node-marker${lit ? " data-node-marker--lit" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        if (lit) onActivate();
      }}
      aria-label={lit ? "Synchronize memory" : "Data node"}
      tabIndex={lit ? 0 : -1}
    />
  );
}

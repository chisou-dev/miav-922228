"use client";

/**
 * Binary Message — encode / decode / copy / share short ASCII text as binary.
 * Separate from the puzzle board, Creator, Challenge Link, and Share Code.
 * Session-only (no localStorage).
 */

import { useCallback, useState } from "react";
import {
  BINARY_MESSAGE_COPIED,
  BINARY_MESSAGE_COPY_FAILED,
  BINARY_MESSAGE_INVALID_ERROR,
  BINARY_MESSAGE_MAX_CHARS,
  BINARY_MESSAGE_MAX_ERROR,
  BINARY_MESSAGE_SHARE_COPIED,
  copyBinaryText,
  decodeBinaryToMessage,
  encodeMessageToBinary,
  remainingLabel,
  shareOrCopyBinaryMessage,
  validateMessageText,
} from "@/games/binary-mosaic/message/binaryMessage";

type StatusKind = "ok" | "fail" | null;

export function BinaryMessagePanel() {
  const [textInput, setTextInput] = useState("");
  const [binaryInput, setBinaryInput] = useState("");
  const [binaryOutput, setBinaryOutput] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const clearStatus = useCallback(() => {
    setStatusKind(null);
    setStatusMessage(null);
  }, []);

  function showStatus(kind: "ok" | "fail", message: string) {
    setStatusKind(kind);
    setStatusMessage(message);
  }

  function onTextChange(value: string) {
    clearStatus();
    if (value.length > BINARY_MESSAGE_MAX_CHARS) {
      showStatus("fail", BINARY_MESSAGE_MAX_ERROR);
      return;
    }
    const validated = validateMessageText(value);
    if (!validated.ok) {
      showStatus("fail", validated.error);
      return;
    }
    setTextInput(validated.text);
  }

  function onEncode() {
    clearStatus();
    if (!textInput) return;

    const validated = validateMessageText(textInput);
    if (!validated.ok) {
      showStatus("fail", validated.error);
      return;
    }

    const encoded = encodeMessageToBinary(validated.text);
    if (encoded == null) return;

    setBinaryOutput(encoded);
    setBinaryInput(encoded);
  }

  function onDecode() {
    clearStatus();
    const result = decodeBinaryToMessage(binaryInput);
    if (!result.ok) {
      showStatus("fail", BINARY_MESSAGE_INVALID_ERROR);
      return;
    }
    setTextInput(result.text);
    setBinaryOutput(
      encodeMessageToBinary(result.text) ?? binaryInput.trim().replace(/\s+/g, " "),
    );
  }

  async function onCopyBinary() {
    if (!binaryOutput) return;
    clearStatus();
    const ok = await copyBinaryText(binaryOutput);
    if (ok) {
      showStatus("ok", BINARY_MESSAGE_COPIED);
    } else {
      showStatus("fail", BINARY_MESSAGE_COPY_FAILED);
    }
  }

  async function onShare() {
    if (!binaryOutput || shareBusy) return;
    setShareBusy(true);
    clearStatus();
    const result = await shareOrCopyBinaryMessage(binaryOutput);
    setShareBusy(false);
    if (result.status === "aborted" || result.status === "shared") {
      return;
    }
    if (result.status === "copied") {
      showStatus("ok", BINARY_MESSAGE_SHARE_COPIED);
      return;
    }
    showStatus("fail", BINARY_MESSAGE_COPY_FAILED);
  }

  function onClear() {
    setTextInput("");
    setBinaryInput("");
    setBinaryOutput("");
    clearStatus();
  }

  const hasBinary = binaryOutput.length > 0;

  return (
    <div className="mosaic-root mosaic-binary-message">
      <div className="mosaic-chrome mosaic-chrome--select">
        <a href="/game/binary-mosaic" className="mosaic-chrome-link">
          ← Levels
        </a>
        <span className="mosaic-chrome-title">Binary Message</span>
        <a
          href="/game/binary-mosaic/creator"
          className="mosaic-chrome-link mosaic-chrome-sound"
        >
          Creator
        </a>
      </div>

      <p className="mosaic-lead">
        Convert a short message to binary, copy it, or share it. Paste binary to
        decode it back. Separate from the puzzle board.
      </p>

      <section
        className="mosaic-creator-panel mosaic-binary-message-panel"
        aria-label="Binary Message"
      >
        <h2 className="mosaic-creator-h">Binary Message</h2>

        <div className="mosaic-binary-message-form">
          <label className="mosaic-creator-field mosaic-creator-field--primary mosaic-binary-message-text-field">
            <span>Text</span>
            <input
              type="text"
              value={textInput}
              onChange={(e) => onTextChange(e.target.value)}
              onPaste={(e) => {
                const paste = e.clipboardData.getData("text");
                const el = e.currentTarget;
                const start = el.selectionStart ?? textInput.length;
                const end = el.selectionEnd ?? textInput.length;
                const next =
                  textInput.slice(0, start) + paste + textInput.slice(end);
                if (next.length > BINARY_MESSAGE_MAX_CHARS) {
                  e.preventDefault();
                  showStatus("fail", BINARY_MESSAGE_MAX_ERROR);
                  return;
                }
                const validated = validateMessageText(next);
                if (!validated.ok) {
                  e.preventDefault();
                  showStatus("fail", validated.error);
                }
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="Up to 30 characters"
              aria-describedby="binary-message-remaining"
            />
            <span
              id="binary-message-remaining"
              className="mosaic-binary-message-remaining"
            >
              {remainingLabel(textInput)}
            </span>
          </label>

          <div className="mosaic-creator-actions mosaic-binary-message-actions">
            <button
              type="button"
              className="mosaic-btn"
              onClick={onEncode}
              disabled={!textInput}
            >
              Encode
            </button>
            <button
              type="button"
              className="mosaic-btn mosaic-btn--ghost"
              onClick={onClear}
            >
              Clear
            </button>
          </div>

          <label className="mosaic-creator-field mosaic-binary-message-binary-field">
            <span>Binary</span>
            <textarea
              className="mosaic-binary-message-binary-input"
              value={binaryInput}
              onChange={(e) => {
                clearStatus();
                setBinaryInput(e.target.value);
              }}
              rows={4}
              spellCheck={false}
              autoComplete="off"
              placeholder="01001000 01000101 01001100 01001100 01001111"
            />
          </label>

          {hasBinary ? (
            <div
              className="mosaic-binary-message-output"
              role="status"
            >
              <span className="mosaic-binary-message-output-label">
                Encoded
              </span>
              <p className="mosaic-binary-message-output-text">{binaryOutput}</p>
            </div>
          ) : null}

          <div className="mosaic-creator-actions mosaic-binary-message-actions">
            <button
              type="button"
              className="mosaic-btn"
              onClick={onDecode}
              disabled={!binaryInput.trim()}
            >
              Decode
            </button>
            <button
              type="button"
              className="mosaic-btn mosaic-btn--ghost"
              onClick={() => void onCopyBinary()}
              disabled={!hasBinary}
            >
              Copy Binary
            </button>
            <button
              type="button"
              className="mosaic-btn"
              onClick={() => void onShare()}
              disabled={!hasBinary || shareBusy}
            >
              {shareBusy ? "…" : "SHARE"}
            </button>
          </div>
        </div>

        {statusMessage ? (
          <p
            className={
              statusKind === "ok"
                ? "mosaic-creator-save-msg mosaic-creator-save-msg--ok"
                : "mosaic-creator-status mosaic-creator-status--fail"
            }
            role="status"
            style={{ whiteSpace: "pre-line" }}
          >
            {statusMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}

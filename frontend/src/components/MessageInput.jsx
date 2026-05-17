import { useState, useRef, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import { encryptMessage } from "../utils/crypto";

export default function MessageInput({ conversationId }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef();

  async function sendEncrypted(content) {
    try {
      // conversationId is passed so the same deterministic key is derived on
      // every encrypt AND decrypt call — messages now decode correctly.
      const encrypted = await encryptMessage(content, conversationId);

      const res = await api.post("/messages", {
        conversation_id: conversationId,
        content: encrypted.ciphertext,
        iv: encrypted.iv,
      });

      const socket = getSocket();
      if (socket) socket.emit("send_message", res.data);

      window.dispatchEvent(
        new CustomEvent("chatty:message_sent", { detail: { plaintext: content, data: res.data } })
      );
    } catch (err) {
      console.error("Encryption error:", err);
    }
  }

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");

    try {
      await sendEncrypted(trimmed);
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, sending, conversationId]);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function addEmoji(e) {
    setText(prev => prev + e.emoji);
    textareaRef.current?.focus();
  }

  return (
    <>
      {showEmoji && (
        <div style={s.popup}>
          <EmojiPicker onEmojiClick={addEmoji} theme="dark" />
        </div>
      )}

      <div style={s.bar}>
        <button
          style={s.emojiBtn}
          onClick={() => setShowEmoji(v => !v)}
          title="Emoji"
        >
          😀
        </button>

        <textarea
          ref={textareaRef}
          style={s.textarea}
          value={text}
          rows={1}
          placeholder="Message"
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
        />

        <button
          style={{ ...s.sendBtn, opacity: sending || !text.trim() ? 0.45 : 1 }}
          onClick={send}
          disabled={sending || !text.trim()}
          title="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </>
  );
}

const s = {
  bar: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    padding: "10px 14px",
    background: "var(--bg-header)",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: "none",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    fontSize: 14,
    lineHeight: 1.5,
    maxHeight: 120,
    overflowY: "auto",
    fontFamily: "var(--font)",
    transition: "border-color .15s, background .15s",
  },
  emojiBtn: {
    background: "none",
    fontSize: 20,
    padding: "6px",
    borderRadius: "50%",
    color: "var(--text-muted)",
    flexShrink: 0,
    transition: "background .15s",
    lineHeight: 1,
  },
  sendBtn: {
    background: "var(--accent)",
    color: "var(--bg-app)",
    width: 38,
    height: 38,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "opacity .15s, background .15s",
  },
  popup: {
    position: "absolute",
    bottom: 70,
    left: 14,
    zIndex: 100,
  },
};

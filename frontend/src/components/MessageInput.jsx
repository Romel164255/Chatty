import { useState, useRef, useEffect, useCallback } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";

export default function MessageInput({ conversationId }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const isTypingRef = useRef(false);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    return () => { clearTimeout(timerRef.current); emitTyping(false); };
  }, [conversationId]);

  function emitTyping(v) {
    const s = getSocket(); if (!s) return;
    s.emit("typing", { conversationId, isTyping: v });
  }

  function handleChange(e) {
    setText(e.target.value);
    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
    // Typing indicator
    if (!isTypingRef.current) { isTypingRef.current = true; emitTyping(true); }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { isTypingRef.current = false; emitTyping(false); }, 1000);
  }

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    clearTimeout(timerRef.current); isTypingRef.current = false; emitTyping(false);
    setSending(true); setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      const res = await api.post("/messages", { conversation_id: conversationId, content: trimmed });
      const socket = getSocket();
      if (socket) socket.emit("send_message", res.data);
      window.dispatchEvent(new CustomEvent("chatty:message_sent", { detail: res.data }));
    } catch (err) {
      console.error(err); setText(trimmed);
    } finally { setSending(false); textareaRef.current?.focus(); }
  }, [text, sending, conversationId]);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const hasText = text.trim().length > 0;

  return (
    <div style={s.bar}>
      {/* Emoji button (cosmetic) */}
      <button style={s.iconBtn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>

      {/* Attach button (cosmetic) */}
      <button style={s.iconBtn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>

      <div style={s.inputWrap}>
        <textarea
          ref={textareaRef}
          style={s.textarea}
          placeholder="Message"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          rows={1}
          disabled={sending}
        />
      </div>

      <button
        style={{ ...s.sendBtn, background: hasText ? "var(--accent)" : "var(--bg-active)", transform: hasText ? "scale(1)" : "scale(0.9)" }}
        onClick={send}
        disabled={!hasText || sending}
      >
        {hasText ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>
    </div>
  );
}

const s = {
  bar: { display:"flex", alignItems:"flex-end", gap:8, padding:"8px 12px", background:"var(--bg-header)", borderTop:"1px solid var(--border)", flexShrink:0 },
  iconBtn: { width:40, height:40, borderRadius:"50%", background:"none", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-secondary)", flexShrink:0 },
  inputWrap: { flex:1, background:"var(--bg-input)", borderRadius:22, padding:"0 14px", display:"flex", alignItems:"center" },
  textarea: { width:"100%", padding:"11px 0", fontSize:15, color:"var(--text-primary)", background:"transparent", resize:"none", lineHeight:1.5, maxHeight:120, overflowY:"auto" },
  sendBtn: { width:42, height:42, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .2s", border:"none" },
};

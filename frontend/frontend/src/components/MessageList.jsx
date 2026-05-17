import { useEffect, useRef, useState, useCallback } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";

/* ─── Helpers ─────────────────────────────────── */
function getMyId() {
  try { return JSON.parse(atob(localStorage.getItem("token").split(".")[1])).id; } catch { return null; }
}
function timeFmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateLabel(iso) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/* ─── Status Ticks ────────────────────────────── */
function StatusTick({ status }) {
  if (status === "read") return (
    <span title="Read">
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path d="M1 5l3 3L10 1" stroke="#3a76f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 5l3 3L15 1" stroke="#3a76f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
  if (status === "delivered") return (
    <span title="Delivered">
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path d="M1 5l3 3L10 1" stroke="#6a6a72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 5l3 3L15 1" stroke="#6a6a72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
  return (
    <span title="Sent">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 5l3 3L9 1" stroke="#6a6a72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

/* ─── Sender color for group ──────────────────── */
function getSenderColor(senderId) {
  const hue = [...(senderId || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 65%, 65%)`;
}

/* ─── Delete Context Menu ─────────────────────── */
function DeleteMenu({ mine, onDeleteForMe, onDeleteForAll, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={s.deleteMenu} className="slide-up">
      <button style={s.deleteMenuItem} onClick={onDeleteForMe}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>
        Delete for me
      </button>
      {mine && (
        <button style={{ ...s.deleteMenuItem, color: "var(--danger)" }} onClick={onDeleteForAll}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
          Delete for everyone
        </button>
      )}
    </div>
  );
}

/* ─── Message Bubble ──────────────────────────── */
function MessageBubble({ msg, mine, showSender, isFirst, isLast, isGroup, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  function handleDeleteForMe() {
    setShowMenu(false);
    onDelete(msg.id, false);
  }
  function handleDeleteForAll() {
    setShowMenu(false);
    onDelete(msg.id, true);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: mine ? "flex-end" : "flex-start",
        marginBottom: isLast ? 6 : 2,
        paddingLeft: mine ? 60 : 0,
        paddingRight: mine ? 0 : 60,
        animation: "msgPop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      {/* Delete button — shows on hover */}
      {hovered && !showMenu && (
        <button
          style={{
            ...s.deleteBtn,
            [mine ? "left" : "right"]: "calc(100% - 52px)",
          }}
          onClick={() => setShowMenu(true)}
          title="Delete message"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      )}

      <div style={{
        ...s.bubble,
        background: mine ? "var(--bg-bubble-me)" : "var(--bg-bubble-them)",
        backgroundImage: mine ? "var(--bg-bubble-me)" : "none",
        borderRadius: mine
          ? `${isFirst ? "var(--radius-bubble)" : "6px"} 4px var(--radius-bubble) var(--radius-bubble)`
          : `4px ${isFirst ? "var(--radius-bubble)" : "6px"} var(--radius-bubble) var(--radius-bubble)`,
        boxShadow: mine ? "0 2px 8px rgba(0,0,0,0.35)" : "0 1px 3px rgba(0,0,0,0.2)",
        outline: showMenu ? "1px solid var(--accent)" : "none",
      }}>
        {!mine && isGroup && isFirst && msg.sender_name && (
          <div style={{ ...s.senderName, color: getSenderColor(msg.sender_id) }}>
            {msg.sender_name}
          </div>
        )}
        <p style={s.text}>{msg.content}</p>
        <div style={s.meta}>
          <span style={s.time}>{timeFmt(msg.created_at)}</span>
          {mine && <StatusTick status={msg.status} />}
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <DeleteMenu
          mine={mine}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForAll={handleDeleteForAll}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

/* ─── Main MessageList ────────────────────────── */
export default function MessageList({ conversationId, isGroup }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const myId = getMyId();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/messages/${conversationId}?limit=40`);
      setMessages(r.data);
      setHasMore(r.data.length === 40);
    } catch {} finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]); setTypingUsers([]); setHasMore(true);
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0]?.created_at;
    try {
      const r = await api.get(`/messages/${conversationId}?limit=40&before=${encodeURIComponent(oldest)}`);
      if (r.data.length === 0) { setHasMore(false); return; }
      const list = listRef.current;
      const prevHeight = list?.scrollHeight ?? 0;
      setMessages(prev => [...r.data, ...prev]);
      requestAnimationFrame(() => {
        if (list) list.scrollTop = list.scrollHeight - prevHeight;
      });
      setHasMore(r.data.length === 40);
    } catch {} finally { setLoadingMore(false); }
  }, [conversationId, messages, loadingMore, hasMore]);

  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const fn = () => { if (el.scrollTop < 80) loadMore(); };
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, [loadMore]);

  /* ── Delete handler ── */
  const handleDelete = useCallback(async (messageId, forEveryone) => {
    try {
      const res = await api.delete(`/messages/${messageId}`, { data: { for_everyone: forEveryone } });
      // Optimistic remove locally
      setMessages(prev => prev.filter(m => m.id !== messageId));
      // Broadcast to other participants via socket
      const socket = getSocket();
      if (socket && res.data?.conversation_id) {
        socket.emit("delete_message", {
          message_id: messageId,
          conversation_id: res.data.conversation_id,
        });
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, []);

  /* ── Socket events ── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    socket.emit("join_conversation", conversationId);

    function onMsg(data) {
      if (data.conversation_id !== conversationId) return;
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
    }
    function onSent(e) {
      const data = e.detail;
      if (data.conversation_id !== conversationId) return;
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
    }
    function onTyping({ conversationId: cid, userId, isTyping }) {
      if (cid !== conversationId || userId === myId) return;
      setTypingUsers(prev =>
        isTyping ? [...new Set([...prev, userId])] : prev.filter(id => id !== userId)
      );
    }
    function onRead({ message_id }) {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, status: "read" } : m));
    }
    function onDelivered({ message_id }) {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, status: "delivered" } : m));
    }
    // Real-time delete from other clients
    function onDeleted({ message_id }) {
      setMessages(prev => prev.filter(m => m.id !== message_id));
    }

    socket.on("receive_message", onMsg);
    socket.on("user_typing", onTyping);
    socket.on("message_read", onRead);
    socket.on("message_delivered", onDelivered);
    socket.on("message_deleted", onDeleted);
    window.addEventListener("chatty:message_sent", onSent);

    return () => {
      socket.off("receive_message", onMsg);
      socket.off("user_typing", onTyping);
      socket.off("message_read", onRead);
      socket.off("message_delivered", onDelivered);
      socket.off("message_deleted", onDeleted);
      window.removeEventListener("chatty:message_sent", onSent);
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId, myId]);

  if (loading) return (
    <div style={s.loading}>
      <div style={s.loadingDots}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...s.loadingDot, animationDelay: `${i * 0.15}s` }} className="typing-dot" />
        ))}
      </div>
    </div>
  );

  // Group messages by date
  const groups = [];
  let lastDate = null;
  messages.forEach(m => {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) {
      groups.push({ type: "date", label: formatDateLabel(m.created_at), key: `date-${d}` });
      lastDate = d;
    }
    groups.push({ type: "msg", ...m });
  });

  return (
    <div ref={listRef} style={s.list} className="chat-bg">
      {loadingMore && (
        <div style={s.loadMore}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.15}s` }}/>)}
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <div style={s.empty}>
          <div style={s.emptyInner}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3, marginBottom: 10 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--text-muted)" strokeWidth="1.5"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={s.emptyBubble}>Messages are end-to-end encrypted</div>
          </div>
        </div>
      )}

      {groups.map((item, i) => {
        if (item.type === "date") return (
          <div key={item.key} style={s.dateDivider}>
            <span style={s.dateLabel}>{item.label}</span>
          </div>
        );

        const mine = item.sender_id === myId;
        const prev = groups[i - 1];
        const next = groups[i + 1];
        const isFirst = !prev || prev.type === "date" || prev.sender_id !== item.sender_id;
        const isLast = !next || next.type === "date" || next.sender_id !== item.sender_id;

        return (
          <MessageBubble
            key={item.id}
            msg={item}
            mine={mine}
            showSender={!mine && isGroup && isFirst}
            isFirst={isFirst}
            isLast={isLast}
            isGroup={isGroup}
            onDelete={handleDelete}
          />
        );
      })}

      {typingUsers.length > 0 && (
        <div style={{ display: "flex", marginBottom: 6 }}>
          <div style={{ ...s.bubble, background: "var(--bg-bubble-them)", padding: "10px 14px", borderRadius: "4px var(--radius-bubble) var(--radius-bubble) var(--radius-bubble)" }}>
            <div style={s.typingWrap}>
              {[0, 1, 2].map(i => (
                <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

const s = {
  list: {
    flex: 1, overflowY: "auto", padding: "16px 16px 8px",
    display: "flex", flexDirection: "column", gap: 0,
  },
  loading: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  loadingDots: { display: "flex", gap: 6 },
  loadingDot: { width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)" },
  loadMore: { display: "flex", justifyContent: "center", padding: "8px 0 4px", gap: 5 },
  empty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyInner: { display: "flex", flexDirection: "column", alignItems: "center" },
  emptyBubble: {
    background: "var(--bg-bubble-them)", padding: "8px 18px",
    borderRadius: 20, fontSize: 13, color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  },
  dateDivider: { display: "flex", justifyContent: "center", margin: "14px 0" },
  dateLabel: {
    fontSize: 11.5, color: "var(--text-muted)",
    background: "rgba(27,27,29,0.9)",
    padding: "4px 14px", borderRadius: 12,
    border: "1px solid var(--border)", backdropFilter: "blur(8px)",
  },
  bubble: { padding: "7px 10px 4px", wordBreak: "break-word", maxWidth: "100%", position: "relative" },
  senderName: { fontSize: 11.5, fontWeight: 700, marginBottom: 3, letterSpacing: "0.01em" },
  text: { fontSize: 14.5, lineHeight: 1.55, color: "var(--text-primary)", whiteSpace: "pre-wrap" },
  meta: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, marginTop: 3 },
  time: { fontSize: 10.5, color: "var(--text-muted)" },
  typingWrap: { display: "flex", gap: 4, alignItems: "center", height: 16 },

  /* delete button that appears on hover */
  deleteBtn: {
    position: "absolute",
    top: "50%", transform: "translateY(-50%)",
    width: 26, height: 26, borderRadius: "50%",
    background: "rgba(40,40,46,0.95)",
    border: "1px solid var(--border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text-muted)",
    cursor: "pointer",
    zIndex: 10,
    transition: "color .15s, background .15s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },

  /* context menu */
  deleteMenu: {
    position: "absolute", top: "calc(100% + 4px)", right: 0,
    background: "var(--bg-modal)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    zIndex: 100,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    minWidth: 190,
  },
  deleteMenuItem: {
    display: "flex", alignItems: "center", gap: 8,
    width: "100%", padding: "10px 14px",
    background: "none", color: "var(--text-primary)",
    fontSize: 13.5, textAlign: "left",
    cursor: "pointer",
    transition: "background .12s",
  },
};

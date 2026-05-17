import { useState, useEffect } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Avatar } from "./Sidebar";
import api from "../services/api";
import { getSocket } from "../services/socket";

export default function ChatWindow({ conversationId, title, isGroup }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [membersCount, setMembersCount] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  const [members, setMembers] = useState([]);

  // Track online users from socket
  useEffect(() => {
    const s = getSocket(); if (!s) return;
    const fn = (list) => setOnlineUsers(list);
    s.on("online_users", fn);
    return () => s.off("online_users", fn);
  }, []);

  // Track typing in this conversation
  useEffect(() => {
    const s = getSocket(); if (!s || !conversationId) return;
    const fn = ({ conversationId: cid, userId, isTyping }) => {
      if (cid !== conversationId) return;
      setTypingUsers(prev =>
        isTyping ? [...new Set([...prev, userId])] : prev.filter(id => id !== userId)
      );
    };
    s.on("user_typing", fn);
    return () => s.off("user_typing", fn);
  }, [conversationId]);

  // Load group members when info panel opened
  useEffect(() => {
    if (showInfo && isGroup && conversationId) {
      api.get(`/groups/${conversationId}/members`)
        .then(r => setMembers(r.data))
        .catch(() => {});
    }
  }, [showInfo, isGroup, conversationId]);

  // Group member count
  useEffect(() => {
    if (isGroup && conversationId) {
      api.get(`/groups/${conversationId}/members`)
        .then(r => setMembersCount(r.data.length))
        .catch(() => {});
    } else {
      setMembersCount(null);
    }
  }, [conversationId, isGroup]);

  if (!conversationId) {
    return (
      <div style={s.empty}>
        <div style={s.emptyInner}>
          <div style={s.emptyIcon}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 style={s.emptyTitle}>Welcome to rChat</h2>
          <p style={s.emptyText}>Select a conversation or search for someone to start chatting</p>
          <div style={s.emptyHints}>
            <div style={s.emptyHint}><span style={s.hintKey}>🔍</span> Search for users</div>
            <div style={s.emptyHint}><span style={s.hintKey}>👥</span> Create group chats</div>
            <div style={s.emptyHint}><span style={s.hintKey}>⚡</span> Real-time messages</div>
          </div>
        </div>
        {/* Decorative background */}
        <div style={s.emptyBg} />
      </div>
    );
  }

  const statusLine = typingUsers.length > 0
    ? `${typingUsers.length === 1 ? "typing" : "several typing"}…`
    : isGroup
      ? membersCount ? `${membersCount} members` : "group chat"
      : onlineUsers.length > 0 ? "online" : "last seen recently";

  const isOnline = !isGroup && onlineUsers.length > 0;

  return (
    <div style={s.window}>
      {/* ── Header ── */}
      <div style={s.header}>
        <Avatar name={title} size={40} isGroup={isGroup} />
        <div style={s.headerInfo}>
          <div style={s.headerName}>{title}</div>
          <div style={s.headerStatus}>
            {/* E2E encryption badge */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" fill="var(--accent)" opacity="0.8"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" opacity="0.8"/>
            </svg>
            <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 500 }}>End-to-end encrypted</span>
            {isOnline && <span style={s.dot} />}
            <span style={{ color: typingUsers.length > 0 ? "var(--accent)" : "var(--text-secondary)" }}>
              {typingUsers.length > 0 && statusLine}
            </span>
          </div>
        </div>
        <div style={s.headerActions}>
          {isGroup && (
            <button
              style={{ ...s.iconBtn, ...(showInfo ? s.iconBtnActive : {}) }}
              title="Group info"
              onClick={() => setShowInfo(v => !v)}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>
          )}
          <button style={s.iconBtn}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button style={s.iconBtn}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Chat area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <MessageList conversationId={conversationId} isGroup={isGroup} />
          <MessageInput conversationId={conversationId} />
        </div>

        {/* ── Group info panel ── */}
        {showInfo && isGroup && (
          <div style={s.infoPanel}>
            <div style={s.infoPanelTitle}>Members</div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {members.map(m => (
                <div key={m.id} style={s.memberRow}>
                  <Avatar name={m.display_name || m.username} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.memberName}>{m.display_name || m.username}</div>
                    <div style={s.memberHandle}>@{m.username}</div>
                  </div>
                  {(m.role === "owner" || m.role === "admin") && (
                    <span style={{ ...s.roleBadge, background: m.role === "owner" ? "rgba(167,139,250,0.15)" : "rgba(77,216,255,0.1)", color: m.role === "owner" ? "var(--accent2)" : "var(--accent)" }}>
                      {m.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  empty: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg-chat)", position: "relative", overflow: "hidden",
  },
  emptyBg: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(77,216,255,0.04) 0%, transparent 70%)",
  },
  emptyInner: {
    textAlign: "center", maxWidth: 340, padding: "0 24px",
    position: "relative", zIndex: 1, animation: "fadeUp .4s ease forwards",
  },
  emptyIcon: {
    width: 88, height: 88, borderRadius: "50%",
    background: "rgba(77,216,255,0.06)", border: "1px solid rgba(77,216,255,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
    boxShadow: "0 0 40px rgba(77,216,255,0.08)",
  },
  emptyTitle: {
    fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
    color: "var(--text-primary)", marginBottom: 10,
    background: "linear-gradient(135deg, #e4ecf4 0%, var(--accent) 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  emptyText: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 },
  emptyHints: { display: "flex", flexDirection: "column", gap: 8 },
  emptyHint: {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(255,255,255,0.03)", borderRadius: 10,
    padding: "9px 14px", border: "1px solid var(--border-subtle)",
    fontSize: 13, color: "var(--text-secondary)",
  },
  hintKey: { fontSize: 16 },
  window: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-chat)" },
  header: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 16px",
    background: "var(--bg-header)",
    borderBottom: "1px solid var(--border)", flexShrink: 0,
    backdropFilter: "blur(12px)",
  },
  headerInfo: { flex: 1, minWidth: 0 },
  headerName: { fontSize: 15, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  headerStatus: { fontSize: 12, display: "flex", alignItems: "center", gap: 5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "var(--online)", boxShadow: "0 0 6px var(--online-glow)", display: "inline-block", flexShrink: 0 },
  headerActions: { display: "flex", gap: 2, flexShrink: 0 },
  iconBtn: {
    width: 36, height: 36, borderRadius: "50%", background: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text-secondary)", transition: "background .15s, color .15s",
  },
  iconBtnActive: { background: "var(--accent-glow-sm)", color: "var(--accent)" },
  infoPanel: {
    width: 240, borderLeft: "1px solid var(--border)",
    background: "var(--bg-sidebar)", display: "flex",
    flexDirection: "column", animation: "slideIn .2s ease",
    flexShrink: 0,
  },
  infoPanelTitle: {
    padding: "16px", fontWeight: 700, fontSize: 12,
    color: "var(--text-muted)", textTransform: "uppercase",
    letterSpacing: "0.08em", borderBottom: "1px solid var(--border)",
  },
  memberRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
  },
  memberName: { fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  memberHandle: { fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 },
  roleBadge: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, flexShrink: 0, textTransform: "capitalize" },
};

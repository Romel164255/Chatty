import { useEffect, useRef, useState, useCallback } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";

function getMyId() {
  try { return JSON.parse(atob(localStorage.getItem("token").split(".")[1])).id; } catch { return null; }
}

function timeFmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
}

function StatusTick({ status }) {
  if (status === "read") return <span style={{color:"#53bdeb",fontSize:12}}>✓✓</span>;
  if (status === "delivered") return <span style={{color:"#aaa",fontSize:12}}>✓✓</span>;
  return <span style={{color:"#aaa",fontSize:12}}>✓</span>;
}

export default function MessageList({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const myId = getMyId();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`/messages/${conversationId}`); setMessages(r.data); }
    catch {} finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => { setMessages([]); setTyping(false); load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    socket.emit("join_conversation", conversationId);

    function onMsg(data) {
      if (data.conversation_id !== conversationId) return;
      setMessages(prev => prev.some(m=>m.id===data.id) ? prev : [...prev, data]);
    }
    function onSent(e) {
      const data = e.detail;
      if (data.conversation_id !== conversationId) return;
      setMessages(prev => prev.some(m=>m.id===data.id) ? prev : [...prev, data]);
    }
    function onTyping({ userId, isTyping }) {
      if (userId !== myId) setTyping(isTyping);
    }

    socket.on("receive_message", onMsg);
    socket.on("user_typing", onTyping);
    window.addEventListener("chatty:message_sent", onSent);

    return () => {
      socket.off("receive_message", onMsg);
      socket.off("user_typing", onTyping);
      window.removeEventListener("chatty:message_sent", onSent);
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId, myId]);

  if (loading) return (
    <div style={s.loading}>
      <div style={s.loadingDots}><span/><span/><span/></div>
    </div>
  );

  // Group messages by date
  const groups = [];
  let lastDate = null;
  messages.forEach(m => {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) { groups.push({ type:"date", label: formatDateLabel(m.created_at) }); lastDate = d; }
    groups.push({ type:"msg", ...m });
  });

  return (
    <div style={s.list}>
      {messages.length===0 && (
        <div style={s.empty}>
          <div style={s.emptyBubble}>👋 Say hello!</div>
        </div>
      )}

      {groups.map((item, i) => {
        if (item.type === "date") return (
          <div key={`d-${i}`} style={s.dateDivider}>
            <span style={s.dateLabel}>{item.label}</span>
          </div>
        );

        const mine = item.sender_id === myId;
        const prevMsg = groups[i-1];
        const nextMsg = groups[i+1];
        const isFirst = !prevMsg || prevMsg.type==="date" || prevMsg.sender_id!==item.sender_id;
        const isLast = !nextMsg || nextMsg.type==="date" || nextMsg.sender_id!==item.sender_id;

        return (
          <div key={item.id} style={{ ...s.msgRow, justifyContent: mine?"flex-end":"flex-start", marginBottom: isLast ? 6 : 2 }}>
            <div style={{
              ...s.bubble,
              background: mine ? "var(--bg-bubble-me)" : "var(--bg-bubble-them)",
              borderRadius: mine
                ? `var(--radius-bubble) ${isFirst?"4px":"var(--radius-bubble)"} var(--radius-bubble) var(--radius-bubble)`
                : `${isFirst?"4px":"var(--radius-bubble)"} var(--radius-bubble) var(--radius-bubble) var(--radius-bubble)`,
              maxWidth: "65%",
            }}>
              <p style={s.text}>{item.content}</p>
              <div style={s.meta}>
                <span style={s.time}>{timeFmt(item.created_at)}</span>
                {mine && <StatusTick status={item.status}/>}
              </div>
            </div>
          </div>
        );
      })}

      {typing && (
        <div style={{...s.msgRow, justifyContent:"flex-start", marginBottom:6}}>
          <div style={{...s.bubble, background:"var(--bg-bubble-them)", padding:"10px 14px"}}>
            <div style={s.typingDots}>
              <span style={{...s.typingDot, animationDelay:"0s"}}/>
              <span style={{...s.typingDot, animationDelay:".2s"}}/>
              <span style={{...s.typingDot, animationDelay:".4s"}}/>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef}/>
    </div>
  );
}

function formatDateLabel(iso) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString()===now.toDateString()) return "Today";
  const yest = new Date(now); yest.setDate(yest.getDate()-1);
  if (d.toDateString()===yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([],{month:"long",day:"numeric",year:"numeric"});
}

const s = {
  list: { flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:0 },
  loading: { flex:1, display:"flex", alignItems:"center", justifyContent:"center" },
  loadingDots: { display:"flex", gap:6 },
  empty: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", paddingTop:60 },
  emptyBubble: { background:"var(--bg-bubble-them)", padding:"10px 18px", borderRadius:20, fontSize:14, color:"var(--text-secondary)" },
  dateDivider: { display:"flex", justifyContent:"center", margin:"12px 0" },
  dateLabel: { fontSize:12, color:"var(--text-muted)", background:"#1a2c3a", padding:"3px 12px", borderRadius:10 },
  msgRow: { display:"flex", width:"100%" },
  bubble: { padding:"7px 10px 4px", wordBreak:"break-word" },
  text: { fontSize:14.5, lineHeight:1.5, color:"var(--text-primary)" },
  meta: { display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4, marginTop:2 },
  time: { fontSize:11, color:"var(--text-muted)" },
  typingDots: { display:"flex", gap:4, alignItems:"center", height:16 },
  typingDot: { width:7, height:7, borderRadius:"50%", background:"var(--text-secondary)", animation:"bounce .8s infinite ease-in-out" },
};

import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

function Avatar({ name, size=38 }) {
  const initials = (name||"?").slice(0,2).toUpperCase();
  const hue = [...(name||"")].reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${hue},45%,32%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:700,color:`hsl(${hue},60%,80%)`,flexShrink:0}}>
      {initials}
    </div>
  );
}

export default function ChatWindow({ conversationId, title }) {
  if (!conversationId) {
    return (
      <div style={s.empty}>
        <div style={s.emptyInner}>
          <div style={{fontSize:64,marginBottom:16}}>💬</div>
          <h2 style={s.emptyTitle}>Open a chat to start messaging</h2>
          <p style={s.emptyText}>Select a conversation from the left or search for a user</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.window}>
      {/* Chat header */}
      <div style={s.header}>
        <Avatar name={title}/>
        <div style={s.headerInfo}>
          <div style={s.headerName}>{title}</div>
          <div style={s.headerStatus}>
            <span style={s.dot}/>online
          </div>
        </div>
        <div style={s.headerActions}>
          <button style={s.iconBtn}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button style={s.iconBtn}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </div>

      <MessageList conversationId={conversationId} />
      <MessageInput conversationId={conversationId} />
    </div>
  );
}

const s = {
  empty: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-chat)", backgroundImage:"radial-gradient(circle at 50% 50%, #0f1e2e 0%, var(--bg-chat) 70%)" },
  emptyInner: { textAlign:"center", maxWidth:320 },
  emptyTitle: { fontSize:20, fontWeight:600, color:"var(--text-primary)", marginBottom:8 },
  emptyText: { fontSize:14, color:"var(--text-secondary)", lineHeight:1.6 },
  window: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg-chat)" },
  header: { display:"flex", alignItems:"center", gap:12, padding:"10px 16px", background:"var(--bg-header)", borderBottom:"1px solid var(--border)", flexShrink:0 },
  headerInfo: { flex:1 },
  headerName: { fontSize:15, fontWeight:600, color:"var(--text-primary)" },
  headerStatus: { fontSize:12, color:"var(--accent)", display:"flex", alignItems:"center", gap:4, marginTop:1 },
  dot: { width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block" },
  headerActions: { display:"flex", gap:4 },
  iconBtn: { width:36, height:36, borderRadius:"50%", background:"none", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-secondary)" },
};

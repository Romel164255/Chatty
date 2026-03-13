import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import SearchUsers from "./SearchUsers";

function Avatar({ name, size=40 }) {
  const initials = (name||"?").slice(0,2).toUpperCase();
  const hue = [...(name||"")].reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${hue},45%,32%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:700,color:`hsl(${hue},60%,80%)`,flexShrink:0}}>
      {initials}
    </div>
  );
}

function timeFmt(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  if (d.toDateString()===now.toDateString()) return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const diff = (now-d)/86400000;
  if (diff<7) return d.toLocaleDateString([],{weekday:"short"});
  return d.toLocaleDateString([],{month:"short",day:"numeric"});
}

export default function Sidebar({ activeConversationId, onSelect, onLogout }) {
  const [convos, setConvos] = useState([]);
  const [search, setSearch] = useState(false);
  const [me, setMe] = useState(null);

  const load = useCallback(async () => {
    try { const r = await api.get("/conversations"); setConvos(r.data); } catch {}
  }, []);

  useEffect(() => { load(); api.get("/auth/me").then(r=>setMe(r.data)).catch(()=>{}); }, [load]);

  useEffect(() => {
    const s = getSocket(); if (!s) return;
    const fn = () => load();
    s.on("receive_message", fn);
    return () => s.off("receive_message", fn);
  }, [load]);

  return (
    <div style={s.sidebar}>
      {/* Header */}
      <div style={s.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Avatar name={me?.display_name||me?.username||"Me"} size={36}/>
          <span style={s.appName}>R-Chat</span>
        </div>
        <div style={s.headerActions}>
          <button style={s.iconBtn} title="New chat" onClick={()=>setSearch(v=>!v)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button style={s.iconBtn} title="Logout" onClick={onLogout}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* Search drawer */}
      {search && (
        <SearchUsers
          reload={load}
          onSelect={(id, title) => { onSelect(id, title); setSearch(false); }}
          onClose={() => setSearch(false)}
        />
      )}

      {/* Filter tabs (cosmetic — like Telegram) */}
      {!search && (
        <div style={s.tabs}>
          {["All","Unread","Groups"].map((t,i)=>(
            <button key={t} style={{...s.tab, ...(i===0?s.tabActive:{})}}>
              {t}{i===1&&convos.filter(c=>c.unread_count>0).length>0&&<span style={s.tabBadge}>{convos.filter(c=>c.unread_count>0).length}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Conversation list */}
      {!search && (
        <div style={s.list}>
          {convos.length===0 && (
            <div style={s.empty}>
              <span style={{fontSize:40,display:"block",marginBottom:12}}>💬</span>
              No chats yet.<br/>Tap 🔍 to find someone.
            </div>
          )}
          {convos.map(c => {
            const active = c.id===activeConversationId;
            const title = c.title || "Direct Chat";
            return (
              <div key={c.id} style={{...s.row, background:active?"var(--bg-active)":"transparent"}}
                onClick={()=>onSelect(c.id, title)}>
                <Avatar name={title}/>
                <div style={s.rowMid}>
                  <div style={s.rowTop}>
                    <span style={s.rowName}>{title}</span>
                    <span style={s.rowTime}>{timeFmt(c.last_message_time)}</span>
                  </div>
                  <div style={s.rowBot}>
                    <span style={s.rowPreview}>{c.last_message||"No messages yet"}</span>
                    {c.unread_count>0&&<span style={s.badge}>{c.unread_count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  sidebar: { width:340, minWidth:340, background:"var(--bg-sidebar)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", overflow:"hidden" },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"var(--bg-header)" },
  appName: { fontSize:18, fontWeight:700, color:"var(--text-primary)" },
  headerActions: { display:"flex", gap:4 },
  iconBtn: { width:36, height:36, borderRadius:"50%", background:"none", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-secondary)", transition:"background .15s" },
  tabs: { display:"flex", gap:4, padding:"8px 12px", borderBottom:"1px solid var(--border)" },
  tab: { padding:"5px 14px", borderRadius:20, fontSize:13, fontWeight:500, background:"none", color:"var(--text-secondary)", transition:"all .15s" },
  tabActive: { background:"#25d36620", color:"var(--accent)" },
  tabBadge: { marginLeft:5, background:"var(--accent)", color:"#fff", fontSize:10, fontWeight:700, borderRadius:10, padding:"1px 5px" },
  list: { flex:1, overflowY:"auto" },
  empty: { textAlign:"center", padding:"60px 20px", color:"var(--text-muted)", fontSize:14, lineHeight:2 },
  row: { display:"flex", alignItems:"center", gap:12, padding:"12px 16px", cursor:"pointer", transition:"background .1s", borderBottom:"1px solid #ffffff08" },
  rowMid: { flex:1, minWidth:0 },
  rowTop: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 },
  rowName: { fontSize:15, fontWeight:600, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  rowTime: { fontSize:11, color:"var(--text-muted)", flexShrink:0, marginLeft:8 },
  rowBot: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  rowPreview: { fontSize:13, color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200 },
  badge: { background:"var(--accent)", color:"#fff", borderRadius:10, fontSize:11, fontWeight:700, padding:"2px 7px", flexShrink:0, marginLeft:8 },
};

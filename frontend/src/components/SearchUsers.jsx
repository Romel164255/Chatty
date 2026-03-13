import { useState } from "react";
import api from "../services/api";

function Avatar({ name, size=40 }) {
  const initials = (name||"?").slice(0,2).toUpperCase();
  const hue = [...(name||"")].reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${hue},45%,32%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:700,color:`hsl(${hue},60%,80%)`,flexShrink:0}}>
      {initials}
    </div>
  );
}

export default function SearchUsers({ reload, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  async function search(v) {
    setQuery(v);
    if (!v.trim() || v.trim().length < 2) { setUsers([]); return; }
    setLoading(true);
    try {
      const r = await api.get(`/users/search?username=${encodeURIComponent(v.trim())}`);
      setUsers(r.data);
    } catch {}
    finally { setLoading(false); }
  }

  async function startChat(u) {
    try {
      const r = await api.post("/conversations", { user_id: u.id });
      await reload();
      onSelect(r.data.conversation_id, u.display_name || u.username);
    } catch {}
  }

  return (
    <div style={s.wrap}>
      <div style={s.bar}>
        <button style={s.back} onClick={onClose}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
        </button>
        <input style={s.input} placeholder="Search by username…" value={query}
          onChange={e=>search(e.target.value)} autoFocus />
      </div>

      <div style={s.results}>
        {loading && <div style={s.hint}>Searching…</div>}
        {!loading && query.length>=2 && users.length===0 && <div style={s.hint}>No users found</div>}
        {users.map(u => (
          <div key={u.id} style={s.row} onClick={()=>startChat(u)}>
            <Avatar name={u.display_name||u.username}/>
            <div>
              <div style={s.name}>{u.display_name||u.username}</div>
              <div style={s.handle}>@{u.username}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: { display:"flex", flexDirection:"column", flex:1, background:"var(--bg-sidebar)" },
  bar: { display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"var(--bg-header)", borderBottom:"1px solid var(--border)" },
  back: { width:34, height:34, borderRadius:"50%", background:"none", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)", flexShrink:0 },
  input: { flex:1, padding:"8px 0", fontSize:15, color:"var(--text-primary)", background:"transparent" },
  results: { overflowY:"auto", flex:1 },
  hint: { padding:"20px 16px", fontSize:13, color:"var(--text-muted)" },
  row: { display:"flex", alignItems:"center", gap:12, padding:"12px 16px", cursor:"pointer", borderBottom:"1px solid #ffffff08", transition:"background .1s" },
  name: { fontSize:14, fontWeight:600, color:"var(--text-primary)" },
  handle: { fontSize:12, color:"var(--text-secondary)", marginTop:2 },
};

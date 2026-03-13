import { useState } from "react";
import api from "../services/api";

export default function Login({ setPhone }) {
  const [phone, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOTP() {
    const trimmed = phone.trim();
    if (!trimmed) { setError("Please enter your phone number"); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.post("/auth/request-otp", { phone: trimmed });
      setPhone(trimmed, res.data.otp || null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Try again.");
    } finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#25d366" opacity="0.15"/>
            <path d="M24 10C16.268 10 10 16.268 10 24c0 2.9.87 5.6 2.37 7.85L10 38l6.37-2.33A13.92 13.92 0 0024 38c7.732 0 14-6.268 14-14S31.732 10 24 10z" fill="#25d366"/>
            <path d="M20 18h1.5l1.5 3.5-1 1.5c.8 1.5 2 2.7 3.5 3.5l1.5-1 3.5 1.5v1.5C30 29.33 28.33 31 26 30c-4-1.5-7.5-5-9-9C16 18.67 17.67 17 20 18z" fill="white" opacity="0.9"/>
          </svg>
        </div>
        <h1 style={s.title}>R-Chat</h1>
        <p style={s.subtitle}>Enter your phone number to continue</p>

        <div style={s.inputWrap}>
          <span style={s.inputIcon}>📱</span>
          <input
            style={s.input}
            placeholder="+91 98765 43210"
            value={phone}
            onChange={e => setPhoneInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && requestOTP()}
            type="tel"
            autoFocus
          />
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={requestOTP} disabled={loading}>
          {loading ? <span style={s.spinner} /> : "Continue"}
        </button>

        <p style={s.terms}>By continuing, you agree to our Terms of Service</p>
      </div>
    </div>
  );
}

const s = {
  page: { height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-app)" },
  card: { width:380, padding:"48px 40px", background:"var(--bg-sidebar)", borderRadius:20, border:"1px solid var(--border)", textAlign:"center" },
  logo: { display:"flex", justifyContent:"center", marginBottom:16 },
  title: { fontSize:28, fontWeight:700, color:"var(--text-primary)", marginBottom:6 },
  subtitle: { fontSize:14, color:"var(--text-secondary)", marginBottom:32 },
  inputWrap: { display:"flex", alignItems:"center", gap:10, background:"var(--bg-search)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"0 16px", marginBottom:12 },
  inputIcon: { fontSize:16, flexShrink:0 },
  input: { flex:1, padding:"14px 0", fontSize:15, color:"var(--text-primary)", background:"transparent" },
  error: { color:"#f87171", fontSize:13, marginBottom:12, textAlign:"left" },
  btn: { width:"100%", padding:"14px", fontSize:15, fontWeight:600, background:"var(--accent)", color:"#fff", borderRadius:"var(--radius-md)", transition:"opacity .2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
  spinner: { width:18, height:18, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite" },
  terms: { marginTop:20, fontSize:12, color:"var(--text-muted)", lineHeight:1.6 },
};

import { useState, useEffect, useRef } from "react";
import api from "../services/api";

export default function VerifyOTP({ phone, devOtp, onLogin }) {
  const [digits, setDigits] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refs = Array.from({length:6}, () => useRef(null));

  useEffect(() => {
    if (devOtp) {
      const d = devOtp.split("").slice(0,6);
      setDigits(d.concat(Array(6-d.length).fill("")));
    }
    refs[0].current?.focus();
  }, [devOtp]);

  function handleKey(i, e) {
    if (e.key === "Backspace") {
      if (!digits[i] && i > 0) { refs[i-1].current.focus(); }
      const d = [...digits]; d[i] = ""; setDigits(d);
      return;
    }
    if (e.key === "Enter") { verify(); return; }
  }

  function handleChange(i, val) {
    const clean = val.replace(/\D/g,"").slice(-1);
    const d = [...digits]; d[i] = clean; setDigits(d);
    if (clean && i < 5) refs[i+1].current.focus();
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (pasted) {
      const d = pasted.split("").concat(Array(6-pasted.length).fill(""));
      setDigits(d);
      refs[Math.min(pasted.length, 5)].current?.focus();
    }
  }

  const otp = digits.join("");

  async function verify() {
    if (otp.length !== 6) { setError("Enter all 6 digits"); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { phone, code: otp });
      onLogin(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed.");
      setDigits(["","","","","",""]);
      refs[0].current?.focus();
    } finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.iconWrap}>
          <span style={{fontSize:36}}>🔐</span>
        </div>
        <h1 style={s.title}>Verify your number</h1>
        <p style={s.subtitle}>
          Enter the 6-digit code sent to<br/>
          <strong style={{color:"var(--accent)"}}>{phone}</strong>
        </p>

        {devOtp && (
          <div style={s.devBanner}>
            🛠 Dev mode — OTP: <strong>{devOtp}</strong>
          </div>
        )}

        <div style={s.boxes} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              style={{...s.box, borderColor: d ? "var(--accent)" : "var(--border)", color: d ? "var(--accent)" : "var(--text-primary)"}}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              maxLength={1}
              inputMode="numeric"
            />
          ))}
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button style={{...s.btn, opacity: loading || otp.length<6 ? 0.6:1}} onClick={verify} disabled={loading || otp.length<6}>
          {loading ? "Verifying…" : "Verify & Continue"}
        </button>
      </div>
    </div>
  );
}

const s = {
  page: { height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-app)" },
  card: { width:400, padding:"48px 40px", background:"var(--bg-sidebar)", borderRadius:20, border:"1px solid var(--border)", textAlign:"center" },
  iconWrap: { marginBottom:16 },
  title: { fontSize:24, fontWeight:700, marginBottom:8 },
  subtitle: { fontSize:14, color:"var(--text-secondary)", lineHeight:1.7, marginBottom:28 },
  devBanner: { background:"#1a2e1a", border:"1px solid #25d36640", borderRadius:8, padding:"8px 14px", fontSize:13, marginBottom:20, color:"var(--accent)" },
  boxes: { display:"flex", gap:10, justifyContent:"center", marginBottom:16 },
  box: { width:48, height:56, textAlign:"center", fontSize:22, fontWeight:700, background:"var(--bg-search)", border:"2px solid", borderRadius:"var(--radius-sm)", transition:"border-color .2s, color .2s", caretColor:"var(--accent)" },
  error: { color:"#f87171", fontSize:13, marginBottom:12 },
  btn: { width:"100%", padding:"14px", fontSize:15, fontWeight:600, background:"var(--accent)", color:"#fff", borderRadius:"var(--radius-md)", transition:"opacity .2s", marginTop:8 },
};

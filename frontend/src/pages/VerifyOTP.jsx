import { useState, useEffect } from "react";
import api from "../services/api";

export default function VerifyOTP({ phone, devOtp, onLogin }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill OTP when server returns it in dev mode
  useEffect(() => {
    if (devOtp) setOtp(devOtp);
  }, [devOtp]);

  async function verify() {
    const trimmed = otp.trim();
    if (!trimmed || trimmed.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/verify-otp", { phone, code: trimmed });
      onLogin(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Enter OTP</h2>
        <p style={styles.subtitle}>
          We sent a 6-digit code to <strong>{phone}</strong>
        </p>

        {devOtp && (
          <div style={styles.devBanner}>
            🛠 Dev mode — OTP auto-filled: <strong>{devOtp}</strong>
          </div>
        )}

        <input
          style={styles.input}
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoFocus
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          onClick={verify}
          disabled={loading}
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f5" },
  card: { background:"#fff", borderRadius:12, padding:"40px 36px", width:360, boxShadow:"0 2px 16px rgba(0,0,0,0.1)" },
  title: { margin:"0 0 6px", fontSize:22, fontWeight:600 },
  subtitle: { margin:"0 0 16px", color:"#666", fontSize:14 },
  devBanner: { background:"#fef9c3", border:"1px solid #fde047", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:14, color:"#854d0e" },
  input: { width:"100%", padding:"10px 12px", fontSize:22, letterSpacing:6, textAlign:"center", border:"1px solid #ddd", borderRadius:8, boxSizing:"border-box", outline:"none", marginBottom:8 },
  error: { color:"#c0392b", fontSize:13, margin:"4px 0 8px" },
  button: { width:"100%", padding:"10px", fontSize:15, fontWeight:600, background:"#2563eb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", marginTop:8 },
};

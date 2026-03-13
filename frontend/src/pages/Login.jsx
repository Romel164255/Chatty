import { useState } from "react";
import api from "../services/api";

export default function Login({ setPhone }) {
  const [phone, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOTP() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Please enter your phone number");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/request-otp", { phone: trimmed });
      // Pass both the phone and the dev OTP (if server returned it) up to parent
      setPhone(trimmed, res.data.otp || null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome to Chatty</h2>
        <p style={styles.subtitle}>Enter your phone number to get started</p>

        <input
          style={styles.input}
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhoneInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && requestOTP()}
          type="tel"
          autoFocus
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          onClick={requestOTP}
          disabled={loading}
        >
          {loading ? "Sending…" : "Send OTP"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f5" },
  card: { background:"#fff", borderRadius:12, padding:"40px 36px", width:360, boxShadow:"0 2px 16px rgba(0,0,0,0.1)" },
  title: { margin:"0 0 6px", fontSize:22, fontWeight:600 },
  subtitle: { margin:"0 0 24px", color:"#666", fontSize:14 },
  input: { width:"100%", padding:"10px 12px", fontSize:15, border:"1px solid #ddd", borderRadius:8, boxSizing:"border-box", outline:"none", marginBottom:8 },
  error: { color:"#c0392b", fontSize:13, margin:"4px 0 8px" },
  button: { width:"100%", padding:"10px", fontSize:15, fontWeight:600, background:"#2563eb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", marginTop:8 },
};

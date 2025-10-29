import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";

const RegisterPage = ({ inlineMode = false, onAuthSuccess }) => {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      toast.error("❌ Οι κωδικοί δεν ταιριάζουν.");
      return;
    }

    setLoading(true);
    try {
      const success = await register(formData.username, formData.password);

      if (success) {
        toast.success("🎉 Εγγραφή επιτυχής! Συνδέεστε...");
        const loggedIn = await login(formData.username, formData.password);

        if (loggedIn) {
          toast.success("✅ Συνδεθήκατε επιτυχώς!");

          if (inlineMode) {
            if (onAuthSuccess) onAuthSuccess();
          } else {
            navigate("/", { state: { resetHome: true } });
          }
        } else {
          toast.error("⚠️ Η σύνδεση μετά την εγγραφή απέτυχε.");
        }
      } else {
        toast.error("Αποτυχία εγγραφής χρήστη.");
      }
    } catch (err) {
      console.error("Σφάλμα εγγραφής:", err);
      toast.error("⚠️ Σφάλμα σύνδεσης με τον διακομιστή.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: inlineMode ? "auto" : "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: inlineMode ? "center" : "flex-start",
        background: inlineMode
          ? "transparent"
          : "linear-gradient(135deg, #f0f4ff, #e8edff, #fafcff)",
        padding: inlineMode ? "0" : "50px 20px",
      }}
    >
      <div style={styles.card}>
        <h2 style={styles.title}>Δημιούργησε λογαριασμό</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Όνομα χρήστη</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Π.χ. NickPap93"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="example@mail.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Κωδικός</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Επαλήθευση Κωδικού</label>
            <input
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Δημιουργία..." : "Εγγραφή"}
          </button>
        </form>

        {!inlineMode && (
          <p style={styles.footerText}>
            Έχετε ήδη λογαριασμό;{" "}
            <span
              style={styles.link}
              onClick={() => navigate("/login")}
            >
              Συνδεθείτε
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;

const styles = {
  card: {
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(12px)",
    borderRadius: "20px",
    padding: "40px 30px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  title: {
    textAlign: "center",
    fontSize: "1.8rem",
    fontWeight: "800",
    color: "#1e293b",
    background: "linear-gradient(90deg, #0078d4, #6633ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "25px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
  },
  label: {
    fontWeight: "600",
    color: "#475569",
    fontSize: "0.9rem",
    marginBottom: "4px",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "0.95rem",
    outline: "none",
    transition: "all 0.2s ease",
    backgroundColor: "#f9fafb",
  },
  button: {
    marginTop: "10px",
    padding: "12px 16px",
    borderRadius: "12px",
    background: "linear-gradient(90deg, #0078d4, #6633ff)",
    color: "white",
    fontWeight: "600",
    fontSize: "1rem",
    border: "none",
    boxShadow: "0 4px 14px rgba(102,51,255,0.2)",
    transition: "all 0.25s ease",
  },
  footerText: {
    textAlign: "center",
    fontSize: "0.9rem",
    color: "#475569",
    marginTop: "18px",
  },
  link: {
    color: "#0078d4",
    fontWeight: "600",
    cursor: "pointer",
    transition: "color 0.2s",
  },
};

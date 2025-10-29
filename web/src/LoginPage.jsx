import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { FaLock } from "react-icons/fa";

export default function LoginPage({ inlineMode = false, onAuthSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("⚠️ Συμπλήρωσε όλα τα πεδία");
      return;
    }

    const success = await login(username, password);
    if (success) {
      toast.success("✅ Επιτυχής σύνδεση!");

      if (inlineMode) {
        // Όταν είναι modal ή inline
        if (onAuthSuccess) onAuthSuccess(); // ενημερώνει το App για να κλείσει modal + redirect
      } else {
        // Κανονική πλοήγηση (αν ανοιχτεί από route)
        navigate("/", { state: { resetHome: true } });
      }
    } else {
      toast.error("❌ Αποτυχία σύνδεσης. Έλεγξε τα στοιχεία σου.");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}><FaLock style={{ color: "#FFD700", fontSize: "24px" }} /> Σύνδεση</h2>
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          type="text"
          placeholder="Όνομα χρήστη"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Κωδικός"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Σύνδεση
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: 20,
    padding: "10px 0",
  },
  title: {
    marginBottom: 20,
    color: "#1e293b",
    fontWeight: "700",
  },
  form: {
    display: "inline-flex",
    flexDirection: "column",
    width: 250,
    gap: 10,
    alignItems: "center",
  },
  input: {
    padding: 8,
    width: "100%",
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  button: {
    padding: 8,
    width: "100%",
    background: "linear-gradient(90deg, #0078d4, #6633ff)",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
    transition: "transform 0.2s ease",
  },
};

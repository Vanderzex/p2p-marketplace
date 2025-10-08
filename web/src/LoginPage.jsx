import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext"; // 👈 προσθήκη

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth(); // 👈 παίρνουμε τη login() συνάρτηση από το AuthContext

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("⚠️ Συμπλήρωσε όλα τα πεδία");
      return;
    }

    const success = await login(username, password); // ✅ καλεί τη login() από το AuthContext
    if (success) {
      navigate("/"); // Μετά τη σύνδεση πάει στην αρχική
    }
  };

  return (
    <div style={styles.container}>
      <h2>🔐 Σύνδεση</h2>
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
  container: { textAlign: "center", marginTop: 60 },
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
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
  },
};
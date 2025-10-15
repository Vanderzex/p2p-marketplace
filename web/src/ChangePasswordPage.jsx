import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ChangePasswordPage() {
  const { token, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error("Συμπλήρωσε και τους δύο κωδικούς.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/change-password/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Σφάλμα αλλαγής κωδικού");

      toast.success("🔑 Ο κωδικός άλλαξε επιτυχώς!");
      setOldPassword("");
      setNewPassword("");

      // Αυτόματη αποσύνδεση για ασφάλεια
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1>🔒 Αλλαγή Κωδικού Πρόσβασης</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="password"
          placeholder="Παλιός κωδικός"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Νέος κωδικός"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={styles.input}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            background: loading ? "#6c757d" : "#0078d4",
          }}
        >
          {loading ? "Αλλαγή..." : "Αποθήκευση"}
        </button>
      </form>

      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ⬅️ Επιστροφή στο προφίλ
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "400px",
    margin: "60px auto",
    textAlign: "center",
    background: "#f8f9fa",
    padding: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  form: { display: "flex", flexDirection: "column", gap: "10px" },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
  backButton: {
    marginTop: "15px",
    background: "#17a2b8",
    color: "white",
    border: "none",
    padding: "8px 15px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

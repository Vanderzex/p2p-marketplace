import { useAuth } from "./context/AuthContext";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const { user, token, tokenExpiry, logout } = useAuth();

  if (!user) {
    return (
      <div style={styles.container}>
        <h2>Πρέπει να συνδεθείς για να δεις το προφίλ σου</h2>
        <Link to="/login" style={styles.button}>Σύνδεση</Link>
      </div>
    );
  }

  // 🕒 Υπολογισμός χρόνου λήξης (σε λεπτά)
  let timeLeftText = "";
  if (tokenExpiry) {
    const diff = Math.max(0, tokenExpiry - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timeLeftText = `${minutes}λ ${seconds}δ`;
  }

  return (
    <div style={styles.container}>
      <h1>👤 Το προφίλ μου</h1>

      <div style={styles.card}>
        <p><strong>Όνομα χρήστη:</strong> {user.username}</p>
        {user.email && <p><strong>Email:</strong> {user.email}</p>}
        <p><strong>Token:</strong> {token ? "✅ Ενεργό" : "❌ Όχι"}</p>
        {token && tokenExpiry && (
          <p style={{ color: "#0078d4" }}>
            ⏳ Λήγει σε: <strong>{timeLeftText}</strong>
          </p>
        )}
      </div>

      <div style={styles.links}>
        <Link to="/my-items" style={styles.link}>📦 Τα αντικείμενά μου</Link>
        <Link to="/add" style={styles.link}>➕ Νέο αντικείμενο</Link>
        <button onClick={logout} style={styles.logout}>🚪 Αποσύνδεση</button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: "600px", margin: "50px auto", textAlign: "center" },
  card: {
    background: "#f8f9fa",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  links: { marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" },
  link: {
    background: "#007bff",
    color: "white",
    padding: "10px",
    borderRadius: "6px",
    textDecoration: "none",
  },
  button: {
    background: "#007bff",
    color: "white",
    padding: "10px 20px",
    borderRadius: "6px",
    textDecoration: "none",
  },
  logout: {
    background: "#dc3545",
    color: "white",
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
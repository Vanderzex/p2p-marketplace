import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, tokenExpiry, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !id || Number(id) === user?.id;

  // 🔹 Φόρτωση προφίλ (εαυτός ή άλλος)
  useEffect(() => {
    if (!token) return;
    const url = id
      ? `http://localhost:8000/api/users/${id}/`
      : `http://localhost:8000/api/me/`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setProfile)
      .catch((err) => console.error("Σφάλμα φόρτωσης προφίλ:", err));
  }, [id, token]);

  // 💬 Φόρτωση αξιολογήσεων
  useEffect(() => {
    if (!token || !user) return;
    const userId = id || user.id;

    fetch(`http://localhost:8000/api/reviews/of_user/${userId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setReviews)
      .catch(() => toast.error("⚠️ Σφάλμα φόρτωσης αξιολογήσεων"))
      .finally(() => setLoading(false));
  }, [token, user, id]);

  if (!user) {
    return (
      <div style={styles.container}>
        <h2>Πρέπει να συνδεθείς για να δεις προφίλ</h2>
        <Link to="/login" style={styles.button}>
          Σύνδεση
        </Link>
      </div>
    );
  }

  // ⏳ Υπολογισμός χρόνου λήξης token
  let timeLeftText = "";
  if (tokenExpiry) {
    const diff = Math.max(0, tokenExpiry - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timeLeftText = `${minutes}λ ${seconds}δ`;
  }

  // Υπολογισμός θετικών/αρνητικών
  const totalReviews = reviews.length;
  const positive = reviews.filter((r) => r.rating >= 4).length;
  const positivePercent =
    totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 0;

  return (
    <div style={styles.container}>
      <h1>
        👤 {isOwnProfile ? "Το προφίλ μου" : `Προφίλ χρήστη ${profile?.username || ""}`}
      </h1>

      <div style={styles.card}>
        <p>
          <strong>Όνομα χρήστη:</strong> {profile?.username || user.username}
        </p>
        {profile?.email && (
          <p>
            <strong>Email:</strong> {profile.email}
          </p>
        )}
        {isOwnProfile && (
          <>
            <p>
              <strong>Token:</strong> {token ? "✅ Ενεργό" : "❌ Όχι"}
            </p>
            {token && tokenExpiry && (
              <p style={{ color: "#0078d4" }}>
                ⏳ Λήγει σε: <strong>{timeLeftText}</strong>
              </p>
            )}
          </>
        )}

        {profile && (
          <>
            <hr />
            <p style={{ marginTop: "15px" }}>
              <strong>Μέση Αξιολόγηση:</strong>{" "}
              <StarRating value={profile.average_rating} />{" "}
              <span style={{ fontWeight: "bold" }}>
                {profile.average_rating?.toFixed(1) || "—"}
              </span>{" "}
              / 5
            </p>

            <div style={styles.reputationBarWrapper}>
              <div
                style={{
                  ...styles.reputationBar,
                  width: `${(profile.average_rating / 5) * 100}%`,
                }}
              ></div>
            </div>

            <p>
              <strong>Ολοκληρωμένες Συναλλαγές:</strong>{" "}
              {profile.total_completed_transactions || 0}
            </p>
            <p>
              <strong>Θετικές αξιολογήσεις:</strong>{" "}
              {positivePercent}% ({positive}/{totalReviews})
            </p>
          </>
        )}

        {/* 🔹 Νέο κουμπί: Προβολή αντικειμένων χρήστη */}
        {!isOwnProfile && profile && (
          <button
            onClick={() => navigate(`/user-items/${profile.username}`)}
            style={styles.viewItemsBtn}
          >
            📦 Δες τα αντικείμενα του χρήστη
          </button>
        )}
      </div>

      {/* 💬 Πρόσφατες αξιολογήσεις */}
      <div style={styles.card}>
        <h3>💬 Πρόσφατες αξιολογήσεις</h3>
        {loading ? (
          <p>Φόρτωση...</p>
        ) : reviews.length === 0 ? (
          <p>Δεν υπάρχουν αξιολογήσεις.</p>
        ) : (
          reviews
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map((r) => (
              <div key={r.id} style={styles.reviewBox}>
                <p>
                  <strong>Από:</strong> {r.reviewer?.username || "Άγνωστος"} <br />
                  ⭐ {r.rating}/5
                </p>
                {r.comment && (
                  <p style={{ fontStyle: "italic", color: "#555" }}>{r.comment}</p>
                )}
                <small style={{ color: "#888" }}>
                  {new Date(r.created_at).toLocaleDateString("el-GR")}
                </small>
                <hr />
              </div>
            ))
        )}
      </div>

      {/* 🔗 Συνδέσεις / Ενέργειες (μόνο δικό σου προφίλ) */}
      {isOwnProfile && (
        <div style={styles.links}>
          <Link to="/my-items" style={styles.link}>
            📦 Τα αντικείμενά μου
          </Link>
          <Link to="/my-transactions" style={styles.link}>
            🔁 Οι συναλλαγές μου
          </Link>
          <Link to="/add" style={styles.link}>
            ➕ Νέο αντικείμενο
          </Link>
          <button onClick={logout} style={styles.logout}>
            🚪 Αποσύνδεση
          </button>
        </div>
      )}
    </div>
  );
}

/* ⭐ Εμφάνιση αστεριών */
function StarRating({ value }) {
  const rounded = Math.round(value || 0);
  return (
    <span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rounded ? "#ffc107" : "#e4e5e9" }}>
          ★
        </span>
      ))}
    </span>
  );
}

const styles = {
  container: { maxWidth: "650px", margin: "50px auto", textAlign: "center" },
  card: {
    background: "#f8f9fa",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  reputationBarWrapper: {
    background: "#e9ecef",
    height: "10px",
    borderRadius: "5px",
    overflow: "hidden",
    margin: "8px auto 15px",
    width: "80%",
  },
  reputationBar: {
    height: "10px",
    background: "linear-gradient(90deg, #ffc107, #28a745)",
  },
  reviewBox: {
    background: "#fff",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "8px",
    textAlign: "left",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  links: {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
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
  viewItemsBtn: {
    background: "#17a2b8",
    color: "white",
    padding: "10px 15px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "10px",
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

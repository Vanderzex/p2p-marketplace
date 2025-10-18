import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";

export default function UserReviewsPage() {
  const { userId } = useParams();
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:8000/api/reviews/of_user/${userId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setReviews)
      .catch(() => toast.error("⚠️ Σφάλμα φόρτωσης αξιολογήσεων"))
      .finally(() => setLoading(false));
  }, [token, userId]);

  return (
    <div style={styles.container}>
      <h2>💬 Όλες οι αξιολογήσεις</h2>

      {loading ? (
        <p>Φόρτωση...</p>
      ) : reviews.length === 0 ? (
        <p>Δεν υπάρχουν αξιολογήσεις για αυτόν τον χρήστη.</p>
      ) : (
        reviews
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map((r) => (
            <div key={r.id} style={styles.reviewBox}>
              <p>
                <strong>Από:</strong>{" "}
                {r.reviewer ? (
                  <Link
                    to={`/profile/${r.reviewer.id}`}
                    style={{ color: "#007bff", textDecoration: "none" }}
                  >
                    {r.reviewer.username}
                  </Link>
                ) : (
                  "Άγνωστος"
                )}{" "}
                <br />
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

      <Link to={-1} style={styles.backLink}>
        ⬅️ Επιστροφή στο προφίλ
      </Link>
    </div>
  );
}

const styles = {
  container: { maxWidth: "650px", margin: "50px auto", textAlign: "center" },
  reviewBox: {
    background: "#fff",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "8px",
    textAlign: "left",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  backLink: {
    display: "inline-block",
    marginTop: "20px",
    color: "#007bff",
    fontWeight: "bold",
    textDecoration: "none",
  },
};

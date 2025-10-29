import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

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
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={styles.content}
      >
        <h2 style={styles.title}>💬 Όλες οι Αξιολογήσεις</h2>

        {loading ? (
          <p style={styles.loadingText}>Φόρτωση...</p>
        ) : reviews.length === 0 ? (
          <p style={styles.noReviews}>Δεν υπάρχουν αξιολογήσεις για αυτόν τον χρήστη.</p>
        ) : (
          reviews
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((r) => (
              <motion.div
                key={r.id}
                style={styles.reviewCard}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div style={styles.headerRow}>
                  <span>
                    <strong>Από:</strong>{" "}
                    {r.reviewer ? (
                      <Link
                        to={`/profile/${r.reviewer.id}`}
                        style={styles.reviewerLink}
                      >
                        {r.reviewer.username}
                      </Link>
                    ) : (
                      "Άγνωστος"
                    )}
                  </span>
                  <span style={styles.rating}>⭐ {r.rating}/5</span>
                </div>

                {r.comment && (
                  <p style={styles.comment}>"{r.comment}"</p>
                )}
                <small style={styles.date}>
                  {new Date(r.created_at).toLocaleDateString("el-GR")}
                </small>
              </motion.div>
            ))
        )}

        <Link to={-1} style={styles.backButton}>
          ⬅️ Επιστροφή στο προφίλ
        </Link>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(180deg, #f5f7fa 0%, #e4ebf5 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "80px",
    fontFamily: "Inter, sans-serif",
    color: "#2c2c2c",
  },

  content: {
    width: "100%",
    maxWidth: "800px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    padding: "40px 50px",
    margin: "20px",
  },

  title: {
    textAlign: "center",
    fontSize: "26px",
    fontWeight: "700",
    marginBottom: "30px",
  },

  loadingText: { textAlign: "center", fontSize: "18px", color: "#777" },
  noReviews: { textAlign: "center", fontSize: "18px", color: "#777" },

  reviewCard: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    fontSize: "16px",
  },

  reviewerLink: {
    color: "#0078d4",
    textDecoration: "none",
    fontWeight: "600",
  },

  rating: {
    background: "#ffd70022",
    color: "#c99700",
    borderRadius: "8px",
    padding: "4px 10px",
    fontWeight: "bold",
  },

  comment: {
    fontStyle: "italic",
    color: "#555",
    marginTop: "8px",
    marginBottom: "10px",
    lineHeight: "1.5",
  },

  date: { color: "#999", fontSize: "13px" },

  backButton: {
    display: "inline-block",
    marginTop: "30px",
    color: "white",
    background: "#0078d4",
    padding: "10px 20px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    transition: "background 0.2s",
  },
};

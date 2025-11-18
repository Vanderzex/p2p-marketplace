import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { FaHeart, FaBoxOpen } from "react-icons/fa";

export default function FavoritesPage() {
  const { token, authFetch, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        const res = await authFetch(
          "http://localhost:8000/api/items/favorites/"
        );
        if (!res.ok) throw new Error("Αποτυχία φόρτωσης αγαπημένων");
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error(err);
        toast.error("Δεν ήταν δυνατή η φόρτωση των αγαπημένων σου");
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [token, authFetch]);

  const handleRemove = async (e, itemId) => {
    // Μην ανοίγει το link όταν πατάμε το Χ
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await authFetch(
        `http://localhost:8000/api/items/${itemId}/toggle_favorite/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Αποτυχία αφαίρεσης");

      // Αφαιρούμε το item από τη λίστα τοπικά
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      toast.success("Αφαιρέθηκε από τα αγαπημένα");
    } catch (err) {
      console.error(err);
      toast.error("Δεν ήταν δυνατή η αφαίρεση από τα αγαπημένα");
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>Αγαπημένα αντικείμενα</h2>
          <p>Πρέπει να συνδεθείς για να δεις τα αγαπημένα σου ❤️</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p>Φόρτωση αγαπημένων...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FaHeart style={{ color: "#ff4d6d" }} />
          Τα αγαπημένα μου αντικείμενα
        </h2>
      </div>

      {items.length === 0 ? (
        <div style={styles.emptyBox}>
          <FaBoxOpen style={{ fontSize: "32px", marginBottom: "10px" }} />
          <p>Δεν έχεις προσθέσει ακόμη αντικείμενα στα αγαπημένα σου.</p>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Πήγαινε σε κάποιο αντικείμενο και πάτα το ❤️ για να το αποθηκεύσεις
            εδώ.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {items.map((item) => {
            const imageUrl = item.main_image
              ? item.main_image.startsWith("http")
                ? item.main_image
                : `http://localhost:8000${item.main_image}`
              : item.images && item.images[0]
              ? item.images[0].image.startsWith("http")
                ? item.images[0].image
                : `http://localhost:8000${item.images[0].image}`
              : null;

            return (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                style={styles.itemCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 22px rgba(15,23,42,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    styles.itemCard.boxShadow;
                }}
              >
                {/* κουμπί αφαίρεσης από αγαπημένα */}
                <div
                  style={styles.removeBtn}
                  onClick={(e) => handleRemove(e, item.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title="Αφαίρεση από τα αγαπημένα"
                >
                  ✕
                </div>

                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.title}
                    style={styles.itemImage}
                  />
                ) : (
                  <div style={styles.noImage}>Χωρίς εικόνα</div>
                )}

                <div style={styles.itemBody}>
                  <h3 style={styles.itemTitle}>{item.title}</h3>
                  <p style={styles.itemOwner}>
                    από{" "}
                    <span style={{ fontWeight: 600 }}>
                      {item.owner_username || "Άγνωστος"}
                    </span>
                  </p>
                  <p style={styles.itemMeta}>
                    {item.transaction_type === "exchange"
                      ? "Ανταλλαγή"
                      : item.transaction_type === "loan"
                      ? "Δανεισμός"
                      : "Ανταλλαγή ή Δανεισμός"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "80px 20px 30px",
    background: "#f3f4f6",
    fontFamily: "Inter, system-ui, sans-serif",
  },

  headerRow: {
    maxWidth: "1100px",
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  card: {
    maxWidth: "420px",
    margin: "80px auto",
    padding: "20px 22px",
    background: "#fff",
    borderRadius: "14px",
    boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
    textAlign: "center",
  },

  emptyBox: {
    maxWidth: "520px",
    margin: "60px auto",
    padding: "24px 26px",
    background: "#fff",
    borderRadius: "14px",
    boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
    textAlign: "center",
  },

  grid: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    justifyContent: "center",
  },

  itemCard: {
    width: "260px",
    background: "#fff",
    borderRadius: "14px",
    textDecoration: "none",
    color: "#111827",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },

  itemImage: {
    width: "100%",
    height: "220px",
    objectFit: "cover",
    background: "#ddd",
  },

  noImage: {
    width: "100%",
    height: "220px",
    background: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    fontSize: "0.9rem",
  },

  itemBody: {
    padding: "10px 10px 14px",
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },

  itemTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    margin: "0 0 6px",
    textAlign: "left",
  },

  itemOwner: {
    margin: 0,
    fontSize: "0.86rem",
    color: "#6b7280",
    textAlign: "left",
  },

  itemMeta: {
    marginTop: "6px",
    fontSize: "0.82rem",
    color: "#4b5563",
    textAlign: "left",
  },

  removeBtn: {
    position: "absolute",
    top: "10px",
    right: "10px",
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#ff4d6d",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    cursor: "pointer",
    zIndex: 5,
    transform: "scale(1)",
    transition: "transform 0.15s ease, background 0.15s ease",
  },
};

import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import AddItemForm from "./AddItemForm";
import { FaPlus, FaPen, FaTrash, FaEye } from "react-icons/fa";

export default function MyItemsPage() {
  const { user, token, authFetch } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("recent");

  const isOwnProfile = !username || username === user?.username;

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      try {
        let url;
        let headers = {};

        if (isOwnProfile) {
          // 👇 Δικό σου προφίλ → my_items
          if (!token) return;
          url = "http://localhost:8000/api/items/my_items/";
          headers = { Authorization: `Bearer ${token}` };
        } else {
          // 👇 Άλλος χρήστης → of_user/<username>/ (βλέπουμε μόνο διαθέσιμα)
          url = `http://localhost:8000/api/items/of_user/${username}/`;
          headers = token ? { Authorization: `Bearer ${token}` } : {};
        }

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error("Αποτυχία φόρτωσης αντικειμένων");

        const data = await res.json();
        const results = Array.isArray(data) ? data : data.results || [];

        // Δεν χρειάζεται άλλο client-side φιλτράρισμα
        setItems(results);
      } catch (err) {
        console.error("Σφάλμα:", err);
        toast.error("⚠️ " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [token, user, username, isOwnProfile]);

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτό το αντικείμενο;"
      )
    )
      return;
    try {
      const res = await authFetch(`http://localhost:8000/api/items/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("🗑️ Το αντικείμενο διαγράφηκε!");
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        toast.error("Αποτυχία διαγραφής.");
      }
    } catch {
      toast.error("Σφάλμα κατά τη διαγραφή.");
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (sortOption === "az") return a.title.localeCompare(b.title);
    if (sortOption === "rating") return (b.rating || 0) - (a.rating || 0);
    return b.id - a.id;
  });

  if (loading) {
    return (
      <div style={styles.skeletonContainer}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={styles.skeletonCard}></div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={styles.container}
    >
      <motion.h1
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={styles.title}
      >
        {" "}
        {isOwnProfile
          ? "Τα αντικείμενά μου"
          : `Αντικείμενα του χρήστη ${username}`}
      </motion.h1>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          style={styles.select}
        >
          <option value="recent">Νεότερα</option>
          <option value="az">Αλφαβητικά</option>
        </select>
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={styles.empty}
        >
          <p>🪄 Δεν υπάρχουν αντικείμενα αυτή τη στιγμή.</p>
          {isOwnProfile && (
            <button onClick={() => setShowModal(true)} style={styles.addButton}>
              <FaPlus style={{ marginRight: "8px" }} /> Πρόσθεσε το πρώτο σου
              αντικείμενο
            </button>
          )}
        </motion.div>
      ) : (
        <div style={styles.grid}>
          {sortedItems.map((item, index) => (
            <motion.div
              key={item.id}
              style={styles.card}
              whileHover={{ scale: 1.02, y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Εικόνα */}
              <div style={styles.imageWrapper}>
                {item.main_image ? (
                  <img
                    src={
                      item.main_image.startsWith("http")
                        ? item.main_image
                        : `http://localhost:8000${item.main_image}`
                    }
                    alt={item.title}
                    style={styles.image}
                  />
                ) : (
                  <div style={styles.placeholder}>📷 Χωρίς εικόνα</div>
                )}

                {/* Badges */}
                <div style={styles.badgeGroup}>
                  {item.transaction_type === "loan" && (
                    <div style={styles.badgeLoan}>Δανεισμός</div>
                  )}
                  {item.transaction_type === "exchange" && (
                    <div style={styles.badgeExchange}>Ανταλλαγή</div>
                  )}
                  {!item.available && (
                    <div style={styles.badgeUnavailable}>Μη διαθέσιμο</div>
                  )}
                </div>

                {/* Hover overlay */}
                <motion.div
                  className="overlay"
                  style={styles.overlay}
                  whileHover={{ opacity: 1 }}
                >
                  <Link to={`/items/${item.id}`} style={styles.overlayBtn}>
                    👁 Προβολή
                  </Link>
                </motion.div>

                {isOwnProfile && (
                  <div style={styles.cardActions}>
                    <button
                      style={styles.editBtn}
                      onClick={() => navigate(`/items/${item.id}`)}
                    >
                      <FaPen />
                    </button>

                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(item.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>

              {/* Περιγραφή */}
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{item.title}</h3>
                <p style={styles.cardDesc}>
                  {item.description?.slice(0, 90) || "—"}…
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div style={styles.actions}>
        {isOwnProfile && (
          <button onClick={() => setShowModal(true)} style={styles.addButton}>
            <FaPlus style={{ marginRight: "8px" }} /> Νέο αντικείμενο
          </button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                ✖
              </button>
              <AddItemForm
                onAddItem={(newItem) => {
                  setItems((prev) => [newItem, ...prev]);
                  setShowModal(false);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const styles = {
  container: {
    width: "100vw",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7f8ff, #edf0f8)",
    padding: "40px 30px",
    boxSizing: "border-box",
    overflow: "visible",
    fontFamily: "'Inter', sans-serif",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#222",
    marginBottom: "25px",
    textAlign: "center",
  },
  toolbar: {
    display: "flex",
    justifyContent: "flex-end",
    margin: "0 40px 30px",
  },
  select: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "30px",
    padding: "0 40px",
  },
  card: {
    background: "white",
    borderRadius: "18px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  imageWrapper: {
    width: "100%",
    height: "240px",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #e0e0e0, #f0f0f0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    color: "#666",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  overlayBtn: {
    background: "white",
    color: "#333",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "600",
    textDecoration: "none",
  },
  cardBody: {
    padding: "16px 18px 20px",
    textAlign: "left",
  },
  cardTitle: { fontSize: "18px", fontWeight: "700", color: "#222" },
  cardDesc: {
    fontSize: "14px",
    color: "#555",
    minHeight: "42px",
    marginBottom: "10px",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#666",
  },
  badgeGroup: {
    position: "absolute",
    top: "12px",
    left: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  badgeLoan: {
    background: "rgba(0, 128, 255, 0.85)",
    color: "white",
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "8px",
    fontWeight: "600",
    width: "fit-content",
  },

  badgeExchange: {
    background: "rgba(255, 165, 0, 0.9)",
    color: "white",
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "8px",
    fontWeight: "600",
    width: "fit-content",
  },

  badgeUnavailable: {
    background: "rgba(255, 0, 0, 0.85)",
    color: "white",
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "8px",
    fontWeight: "600",
    width: "fit-content",
  },
  cardActions: {
    position: "absolute",
    top: "10px",
    right: "10px",
    display: "flex",
    gap: "6px",
  },
  editBtn: {
    background: "rgba(255,255,255,0.85)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    padding: "5px 8px",
  },
  deleteBtn: {
    background: "rgba(255,255,255,0.85)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    padding: "5px 8px",
  },
  addButton: {
    display: "inline-block",
    background: "linear-gradient(90deg, #28a745, #20c997)",
    color: "white",
    padding: "10px 18px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "600",
    marginTop: "20px",
  },
  backLink: { color: "#007bff", textDecoration: "none", fontWeight: "500" },
  actions: { textAlign: "center", marginTop: "40px" },
  empty: {
    textAlign: "center",
    marginTop: "60px",
    fontSize: "17px",
    color: "#666",
  },
  skeletonContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "25px",
    padding: "60px",
  },
  skeletonCard: {
    height: "260px",
    borderRadius: "16px",
    background: "linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)",
    backgroundSize: "400% 100%",
    animation: "shimmer 1.4s ease infinite",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px 30px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
    maxWidth: "480px",
    width: "90%",
    position: "relative",
    maxHeight: "90vh",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "thin",
    scrollbarColor: "#ccc #f8f8f8",
  },

  closeBtn: {
    position: "absolute",
    top: "0px",
    right: "0px",
    background: "none",
    border: "none",
    color: "#555",
    fontSize: "1.4rem",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "color 0.2s ease",
    zIndex: 5,
  },
};

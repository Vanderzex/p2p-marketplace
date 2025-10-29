import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell,
  FaCheck,
  FaExclamationTriangle,
  FaBox,
  FaCommentDots,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  // 🔹 Φόρτωση ειδοποιήσεων
  const fetchNotifications = async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/notifications/?page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Αποτυχία φόρτωσης ειδοποιήσεων");

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : data.results
        ? data.results
        : [];

      const sorted = list.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setNotifications(sorted);
      setTotalCount(data.count || list.length);
      setPageSize(data.results ? data.results.length : 10);
    } catch (err) {
      console.error("Σφάλμα ειδοποιήσεων:", err);
      toast.error("⚠️ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [token, currentPage]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // 🔹 Μαρκάρισμα όλων ως διαβασμένων
  const markAllAsRead = async () => {
    try {
      await fetch("http://localhost:8000/api/notifications/mark_all_read/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("✔️ Όλες οι ειδοποιήσεις μαρκάρονται ως διαβασμένες");
      fetchNotifications(currentPage);
    } catch {
      toast.error("⚠️ Σφάλμα ενημέρωσης ειδοποιήσεων");
    }
  };

  // 🔹 Click handler για μετάβαση
  const handleClick = (n) => {
    try {
      if (n.type === "message") {
        if (n.item) {
          const chatUser =
            n.sender?.username || n.sender_username || "unknown";
          navigate(`/items/${n.item}?chatWith=${chatUser}`);
          toast("💬 Άνοιγμα συνομιλίας για το αντικείμενο...");
          return;
        }
        if (n.transaction) {
          const txId =
            typeof n.transaction === "object"
              ? n.transaction.id
              : n.transaction;
          navigate(`/my-transactions?chat=${txId}`);
          toast("💬 Άνοιγμα συνομιλίας για τη συναλλαγή...");
          return;
        }
        if (n.sender) {
          const chatUser =
            n.sender?.username || n.sender_username || "unknown";
          navigate(`/profile/${n.sender.id}?chatWith=${chatUser}`);
          toast("💬 Άνοιγμα συνομιλίας με τον χρήστη...");
          return;
        }
      }

      if (n.type === "transaction" && n.transaction) {
        const txId =
          typeof n.transaction === "object" ? n.transaction.id : n.transaction;
        navigate(`/my-transactions?tx=${txId}`);
        toast("📦 Προβολή συναλλαγής...");
        return;
      }

      toast("📩 Η ειδοποίηση δεν έχει συνδεδεμένο περιεχόμενο.");
    } catch (err) {
      console.error("⚠️ Σφάλμα στο handleClick:", err);
    }
  };

  // 🔹 Σελιδοποίηση
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }

    return pages.map((num, index) =>
      num === "..." ? (
        <span key={`dots-${index}`} style={styles.ellipsis}>
          ...
        </span>
      ) : (
        <button
          key={num}
          style={{
            ...styles.pageBtn,
            ...(num === currentPage ? styles.pageBtnActive : {}),
          }}
          onClick={() => setCurrentPage(num)}
        >
          {num}
        </button>
      )
    );
  };

  if (loading)
    return <p style={styles.loading}>Φόρτωση ειδοποιήσεων...</p>;

  return (
    <div style={styles.fullscreen}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          <FaBell style={{ marginRight: "8px" }} /> Κέντρο Ειδοποιήσεων
        </h1>
        <div style={styles.actions}>
          <button onClick={markAllAsRead} style={styles.markBtn}>
            <FaCheck style={{ marginRight: "6px" }} />
            Μαρκάρισε όλες ως διαβασμένες
          </button>
          <span style={styles.counter}>{totalCount} συνολικά</span>
        </div>
      </header>

      <main style={styles.listWrapper}>
        {notifications.length === 0 ? (
          <p style={styles.empty}>Δεν υπάρχουν ειδοποιήσεις.</p>
        ) : (
          <AnimatePresence>
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => handleClick(n)}
                style={{
                  ...styles.item,
                  background: n.is_read ? "white" : "#e8f3ff",
                  cursor:
                    n.item || n.transaction || n.type === "message"
                      ? "pointer"
                      : "default",
                }}
              >
                <div style={styles.itemHeader}>
                  <strong>
                    {n.sender_username || n.sender?.username || "Σύστημα"}
                  </strong>
                  <small style={styles.date}>
                    {new Date(n.created_at).toLocaleString("el-GR")}
                  </small>
                </div>

                <p style={styles.message}>
                  {n.item ? (
                    <span
                      style={{
                        color: "#007bff",
                        fontWeight: "600",
                        textDecoration: "underline",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FaCommentDots /> {n.message}
                    </span>
                  ) : n.transaction ? (
                    <span
                      style={{
                        color: "#007bff",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FaBox /> {n.message}
                    </span>
                  ) : (
                    n.message
                  )}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </main>

      {totalPages > 1 && (
        <footer style={styles.pagination}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            style={{
              ...styles.navBtn,
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <FaChevronLeft style={{ marginRight: "6px" }} />
            Προηγούμενη
          </button>

          {renderPageNumbers()}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              ...styles.navBtn,
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            Επόμενη
            <FaChevronRight style={{ marginLeft: "6px" }} />
          </button>
        </footer>
      )}
    </div>
  );
}

const styles = {
  fullscreen: {
    width: "100vw",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f5ff 0%, #e4ebf8 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "30px",
    paddingBottom: "60px",
    paddingInline: "max(2vw, 20px)",
    boxSizing: "border-box",
    overflowX: "clip",
    overflowY: "auto",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    width: "100%",
    padding: "0 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "2rem",
    color: "#1e3a8a",
    fontWeight: 700,
    margin: 0,
    display: "flex",
    alignItems: "center",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  markBtn: {
    background: "linear-gradient(90deg, #007bff, #00aaff)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.25s",
    display: "flex",
    alignItems: "center",
  },
  counter: { color: "#444", fontSize: "0.95rem" },
  listWrapper: {
    width: "100%",
    padding: "0 5%",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  item: {
    borderRadius: "12px",
    padding: "18px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.07)",
    border: "1px solid #e3e7ec",
    transition: "all 0.2s",
    width: "100%",
    maxWidth: "900px",
    alignSelf: "center",
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  message: {
    color: "#333",
    fontSize: "0.95rem",
    margin: 0,
  },
  date: { color: "#666", fontSize: "0.8rem" },
  empty: {
    color: "#777",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: "50px",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginTop: "40px",
    flexWrap: "wrap",
  },
  pageBtn: {
    padding: "8px 14px",
    borderRadius: "50%",
    border: "1px solid #007bff",
    color: "#007bff",
    background: "white",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  pageBtnActive: {
    background: "linear-gradient(90deg, #007bff, #00aaff)",
    color: "white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  navBtn: {
    padding: "8px 18px",
    borderRadius: "25px",
    border: "none",
    background: "linear-gradient(90deg, #007bff, #00aaff)",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
    display: "flex",
    alignItems: "center",
  },
  ellipsis: {
    padding: "0 8px",
    color: "#555",
    fontWeight: "bold",
  },
  loading: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#007bff",
    fontSize: "1.3rem",
  },
};

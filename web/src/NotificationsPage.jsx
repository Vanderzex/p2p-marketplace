import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // 📡 Ανάκτηση ειδοποιήσεων με αριθμό σελίδας
  const fetchNotifications = async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/notifications/?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  // 📬 Μαρκάρισμα όλων ως διαβασμένων
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

  // 🔢 Δημιουργία λίστας αριθμών σελίδων (GitHub style)
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // Πόσες να φαίνονται

    if (totalPages <= maxVisible) {
      // Αν είναι λίγες, δείξε όλες
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Αν είναι πολλές
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
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

    return pages.map((num, index) => {
      if (num === "...") {
        return (
          <span key={`dots-${index}`} style={styles.ellipsis}>
            ...
          </span>
        );
      }
      return (
        <button
          key={num}
          style={{
            ...styles.pageBtn,
            background: num === currentPage ? "#007bff" : "white",
            color: num === currentPage ? "white" : "#007bff",
            border: "1px solid #007bff",
          }}
          onClick={() => setCurrentPage(num)}
        >
          {num}
        </button>
      );
    });
  };

  if (loading) return <p style={styles.loading}>Φόρτωση ειδοποιήσεων...</p>;

  return (
    <div style={styles.container}>
      <h1>📜 Όλες οι ειδοποιήσεις</h1>

      <div style={styles.topBar}>
        <button onClick={markAllAsRead} style={styles.markBtn}>
          ✔️ Μαρκάρισε όλες ως διαβασμένες
        </button>
        <p style={styles.counter}>
          Συνολικά: <strong>{totalCount}</strong> ειδοποιήσεις
        </p>
      </div>

      {notifications.length === 0 ? (
        <p style={styles.empty}>Δεν υπάρχουν ειδοποιήσεις.</p>
      ) : (
        <ul style={styles.list}>
          {notifications.map((n) => (
            <li
              key={n.id}
              style={{
                ...styles.item,
                background: n.is_read ? "#fff" : "#e6f7ff",
              }}
            >
              <p style={{ margin: "0 0 4px 0" }}>
                <strong>{n.sender_username || "Σύστημα"}</strong> — {n.message}
              </p>
              <small style={styles.date}>
                {new Date(n.created_at).toLocaleString("el-GR")}
              </small>
            </li>
          ))}
        </ul>
      )}

      {/* 🔹 Pagination controls */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            style={{
              ...styles.pageBtn,
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ⬅️ Προηγούμενη
          </button>

          {renderPageNumbers()}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              ...styles.pageBtn,
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Επόμενη ➡️
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "40px auto",
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
  },
  loading: { textAlign: "center", marginTop: "50px" },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  markBtn: {
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    cursor: "pointer",
  },
  counter: { color: "#555", fontSize: "0.9rem" },
  list: { listStyle: "none", padding: 0 },
  item: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "10px",
    textAlign: "left",
  },
  date: { color: "#555", fontSize: "0.8rem" },
  empty: { color: "#777", fontStyle: "italic" },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
    marginTop: "20px",
    flexWrap: "wrap",
  },
  pageBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    fontWeight: "bold",
    background: "white",
    color: "#007bff",
    cursor: "pointer",
  },
  ellipsis: {
    padding: "0 8px",
    color: "#555",
    fontWeight: "bold",
  },
};

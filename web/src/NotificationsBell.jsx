import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function NotificationsBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // 📡 Ανάκτηση ειδοποιήσεων (πλήθος + λίστα)
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      // 🔢 Πλήθος αδιάβαστων
      const resCount = await fetch("http://localhost:8000/api/notifications/unread_count/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const countData = await resCount.json();
      setUnreadCount(countData.unread_count || 0);

      // 📜 Αν είναι ανοιχτό το dropdown, φέρε και τη λίστα
      if (open) {
        const resList = await fetch("http://localhost:8000/api/notifications/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resList.ok) throw new Error("Σφάλμα φόρτωσης ειδοποιήσεων");
        const listData = await resList.json();

        // ✅ Προσαρμογή σε όλες τις περιπτώσεις (pagination ή όχι)
        const list = Array.isArray(listData)
          ? listData
          : listData.results
          ? listData.results
          : [];

        // 🔹 Ταξινόμηση (πιο πρόσφατες πρώτες)
        const sorted = [...list].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // 🔹 Εμφάνιση μόνο των 5 πιο πρόσφατων
        setNotifications(sorted.slice(0, 5));
      }
    } catch (err) {
      console.error("⚠️ Σφάλμα ειδοποιήσεων:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [token, open]);

  // ✅ Μαρκάρισμα όλων ως διαβασμένων
  const markAllAsRead = async () => {
    try {
      await fetch("http://localhost:8000/api/notifications/mark_all_read/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      fetchNotifications();
    } catch {
      toast.error("⚠️ Σφάλμα ενημέρωσης ειδοποιήσεων");
    }
  };

  // 📨 Click σε ειδοποίηση
  const handleClick = (n) => {
    setOpen(false);

    // Μαρκάρουμε τη συγκεκριμένη ειδοποίηση ως διαβασμένη
    fetch(`http://localhost:8000/api/notifications/${n.id}/mark_read/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});

    if (n.transaction) {
      const txId = typeof n.transaction === "object" ? n.transaction.id : n.transaction;

      if (n.type === "message" || n.message?.includes("μήνυμα")) {
        navigate(`/my-transactions?chat=${txId}`);
        toast("💬 Άνοιγμα συνομιλίας...");
      } else if (n.type === "transaction" || n.message?.includes("συναλλαγή")) {
        navigate(`/my-transactions?transaction=${txId}`);
        toast.success("📩 Νέο αίτημα συναλλαγής!");
      } else {
        navigate(`/my-transactions?tx=${txId}`);
        toast("📩 Ενημέρωση συναλλαγής!");
      }
    } else {
      toast(n.message || "📨 Νέα ειδοποίηση");
    }
  };

  return (
    <div style={styles.wrapper}>
      <button
        style={styles.bellButton}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) fetchNotifications();
        }}
      >
        🔔
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.headerRow}>
            <h4 style={{ margin: 0 }}>Ειδοποιήσεις</h4>
            <button onClick={markAllAsRead} style={styles.markBtn}>
              ✔️ Όλες διαβασμένες
            </button>
          </div>

          {notifications.length === 0 ? (
            <p style={styles.empty}>Δεν υπάρχουν ειδοποιήσεις</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  ...styles.notification,
                  backgroundColor: n.is_read ? "#fff" : "#e6f7ff",
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>{n.sender_username || "Σύστημα"}</strong> — {n.message}
                </p>
                <small style={styles.date}>
                  {new Date(n.created_at).toLocaleString("el-GR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            ))
          )}

          {/* 🔹 Κουμπί "Δες όλες" */}
          <div style={styles.footer}>
            <button
              style={styles.viewAllBtn}
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
            >
              📜 Δες όλες τις ειδοποιήσεις
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: "relative", marginLeft: "10px" },
  bellButton: {
    position: "relative",
    fontSize: "1.6rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "white",
  },
  badge: {
    position: "absolute",
    top: "-5px",
    right: "-8px",
    background: "red",
    color: "white",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "0.75rem",
    fontWeight: "bold",
  },
  dropdown: {
    position: "absolute",
    top: "40px",
    right: 0,
    width: "340px",
    background: "#fefefe",
    border: "1px solid #ccc",
    borderRadius: "10px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    padding: "10px",
    zIndex: 1000,
    fontFamily: "Arial, sans-serif",
    color: "#222",
    display: "flex",
    flexDirection: "column",
    maxHeight: "420px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  markBtn: {
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  notification: {
    padding: "10px 0",
    borderBottom: "1px solid #eee",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  date: { color: "#555", fontSize: "0.8rem" },
  empty: {
    textAlign: "center",
    color: "#777",
    fontStyle: "italic",
    padding: "10px 0",
  },
  footer: {
    marginTop: "10px",
    borderTop: "1px solid #ddd",
    paddingTop: "8px",
    textAlign: "center",
  },
  viewAllBtn: {
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
};

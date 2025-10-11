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

  // 📡 Ανάκτηση ειδοποιήσεων (count + λίστα)
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      // 🔢 Πλήθος αδιάβαστων
      const resCount = await fetch("http://localhost:8000/api/notifications/unread_count/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const countData = await resCount.json();
      setUnreadCount(countData.unread_count || 0);

      // 📜 Αν το dropdown είναι ανοιχτό → φέρε λίστα ειδοποιήσεων
      if (open) {
        const resList = await fetch("http://localhost:8000/api/notifications/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const listData = await resList.json();
        setNotifications(listData.slice(0, 10)); // μόνο 10 πιο πρόσφατες
      }
    } catch (err) {
      console.error("⚠️ Σφάλμα ειδοποιήσεων:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // 🔁 κάθε 5s
    return () => clearInterval(interval);
  }, [token, open]);

  // 📩 Μαρκάρισμα όλων ως διαβασμένων
  const markAllAsRead = async () => {
    try {
      await fetch("http://localhost:8000/api/notifications/mark_all_read/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
    } catch {
      toast.error("⚠️ Σφάλμα ενημέρωσης ειδοποιήσεων");
    }
  };

  // 🧭 Click σε ειδοποίηση → μετάβαση στη σωστή σελίδα
  const handleClick = (n) => {
    setOpen(false);

    // ✅ Μαρκάρουμε την ειδοποίηση ως διαβασμένη
    fetch(`http://localhost:8000/api/notifications/${n.id}/mark_read/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});

    console.log("🔔 Notification clicked:", n);

    if (n.transaction) {
      // ✅ Εξασφαλίζουμε ότι είναι καθαρό ID (όχι object)
      const txId = typeof n.transaction === "object" ? n.transaction.id : n.transaction;

      if (n.type === "message" || n.message?.includes("μήνυμα")) {
        // 💬 Άνοιγμα chat
        navigate(`/my-transactions?chat=${txId}`);
        toast("💬 Άνοιγμα συνομιλίας...");
      } else if (n.type === "transaction" || n.message?.includes("συναλλαγή")) {
        // 🔁 Ειδοποίηση για νέα συναλλαγή
        navigate(`/my-transactions?transaction=${txId}`);
        toast.success("📩 Νέο αίτημα συναλλαγής!");
      } else {
        // 🧩 Άλλη ειδοποίηση σχετική με συναλλαγή
        navigate(`/my-transactions?tx=${txId}`);
        toast("📩 Ενημέρωση συναλλαγής!");
      }
    } else {
      // 🔹 Γενική ειδοποίηση χωρίς συναλλαγή
      toast(n.message || "📨 Νέα ειδοποίηση");
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* 🔔 Εικονίδιο ειδοποιήσεων */}
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

      {/* 📜 Drop-down με ειδοποιήσεις */}
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
                <p style={{ margin: 0, cursor: "pointer" }}>
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
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    marginLeft: "10px",
  },
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
    color: "#222", // ✅ Βασικό χρώμα κειμένου
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
  notificationHover: {
    backgroundColor: "#f5f5f5",
  },
  date: {
    color: "#555",
    fontSize: "0.8rem",
  },
  empty: {
    textAlign: "center",
    color: "#777",
    fontStyle: "italic",
    padding: "10px 0",
  },
};


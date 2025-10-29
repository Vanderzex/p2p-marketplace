import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell,
  FaBellSlash,
  FaCommentDots,
  FaExchangeAlt,
  FaStar,
  FaBullhorn,
  FaInbox,
  FaCheck,
} from "react-icons/fa";

export default function NotificationsBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [open, setOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const resCount = await fetch(
        "http://localhost:8000/api/notifications/unread_count/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const countData = await resCount.json();
      const newUnread = countData.unread_count || 0;

      const resMsgs = await fetch(
        "http://localhost:8000/api/chat/unread_count/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const msgData = await resMsgs.json();
      const newMsgs = msgData.unread_count || 0;

      if (newUnread > unreadCount || newMsgs > unreadMsgs) {
        setAnimate(true);
        toast.success("🔔 Νέα ειδοποίηση ή μήνυμα!");
        setTimeout(() => setAnimate(false), 2000);
      }

      setUnreadCount(newUnread);
      setUnreadMsgs(newMsgs);

      if (open) {
        const resList = await fetch(
          "http://localhost:8000/api/notifications/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const listData = await resList.json();
        const list = Array.isArray(listData)
          ? listData
          : listData.results || [];
        const sorted = [...list].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setNotifications(sorted.slice(0, 5));
      }
    } catch (err) {
      console.error("⚠️ Σφάλμα ειδοποιήσεων:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, [token, open]);

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

  const handleClick = (n) => {
    setOpen(false);

    fetch(`http://localhost:8000/api/notifications/${n.id}/mark_read/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});

    try {
      if (n.type === "message") {
        const chatUser = n.sender?.username || n.sender_username || "";

        if (n.item) {
          navigate(`/items/${n.item}?chatWith=${chatUser}`);
          toast("Άνοιγμα συνομιλίας για το αντικείμενο...");
          return;
        }

        if (n.transaction) {
          const txId =
            typeof n.transaction === "object"
              ? n.transaction.id
              : n.transaction;
          navigate(`/my-transactions?chat=${txId}`);
          toast("Άνοιγμα συνομιλίας στη συναλλαγή...");
          return;
        }

        if (n.sender) {
          navigate(`/profile/${n.sender.id}?chatWith=${chatUser}`);
          toast("Άνοιγμα συνομιλίας με τον χρήστη...");
          return;
        }
      }

      if (n.type === "transaction" && n.transaction) {
        const txId =
          typeof n.transaction === "object" ? n.transaction.id : n.transaction;
        navigate(`/my-transactions?tx=${txId}`);
        toast.success("Προβολή συναλλαγής!");
        return;
      }

      if (
        n.type === "review" ||
        n.message?.toLowerCase().includes("αξιολόγηση")
      ) {
        navigate(`/profile/${n.sender_username}`);
        toast("⭐ Προβολή αξιολόγησης");
        return;
      }

      toast(n.message || "📢 Νέα ειδοποίηση");
    } catch (err) {
      console.error("⚠️ Σφάλμα κατά το άνοιγμα ειδοποίησης:", err);
    }
  };

  const totalUnread = unreadCount + unreadMsgs;

  return (
    <div style={styles.wrapper}>
      {/* 🔔 Καμπάνα */}
      <motion.button
        style={{
          ...styles.bellButton,
          animation: animate
            ? "ring 0.7s ease-in-out infinite alternate"
            : "none",
        }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) fetchNotifications();
        }}
      >
        {totalUnread > 0 ? (
          <FaBell size={22} color="#ffd43b" />
        ) : (
          <FaBellSlash size={22} color="#fff" />
        )}

        {totalUnread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={styles.badge}
          >
            {totalUnread}
          </motion.span>
        )}
      </motion.button>

      {/* 🔽 Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={styles.dropdown}
          >
            <div style={styles.headerRow}>
              <h4 style={{ margin: 0, fontWeight: "600" }}>Ειδοποιήσεις</h4>
              <button onClick={markAllAsRead} style={styles.markBtn}>
                <FaCheck style={{ marginRight: "6px", color: "#0078d4" }} />
                Όλες διαβασμένες
              </button>
            </div>

            <div style={styles.list}>
              {notifications.length === 0 ? (
                <p style={styles.empty}>
                  <FaInbox style={{ marginRight: "6px", color: "#999" }} />
                  Δεν υπάρχουν ειδοποιήσεις
                </p>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    whileHover={{ backgroundColor: "#f1f8ff" }}
                    style={{
                      ...styles.notification,
                      backgroundColor: n.is_read ? "transparent" : "#e9f4ff",
                    }}
                  >
                    <div style={styles.notifIcon}>{getIcon(n.type)}</div>
                    <div>
                      <p style={styles.message}>
                        <strong>{n.sender_username || "Σύστημα"}</strong> —{" "}
                        {n.item ? (
                          <span
                            style={{
                              color: "#0078d4",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <FaCommentDots style={{ marginRight: "5px" }} />{" "}
                            {n.message}
                          </span>
                        ) : (
                          n.message
                        )}
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
                  </motion.div>
                ))
              )}
            </div>

            <div style={styles.footer}>
              <button
                style={styles.viewAllBtn}
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
              >
                Δες όλες τις ειδοποιήσεις
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>
        {`
          @keyframes ring {
            0% { transform: rotate(0); }
            25% { transform: rotate(12deg); }
            50% { transform: rotate(0deg); }
            75% { transform: rotate(-12deg); }
            100% { transform: rotate(0); }
          }
        `}
      </style>
    </div>
  );
}

function getIcon(type) {
  switch (type) {
    case "message":
      return <FaCommentDots color="#0078d4" />;
    case "transaction":
      return <FaExchangeAlt color="#22c55e" />;
    case "review":
      return <FaStar color="#facc15" />;
    default:
      return <FaBullhorn color="#888" />;
  }
}

const styles = {
  wrapper: { position: "relative", marginLeft: "12px" },
  bellButton: {
    position: "relative",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "white",
    outline: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: "-3px",
    right: "-4px",
    background: "linear-gradient(135deg, #ff4b2b, #ff416c)",
    color: "white",
    borderRadius: "50%",
    width: "18px",
    height: "18px",
    fontSize: "0.7rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    boxShadow: "0 0 6px rgba(0,0,0,0.3)",
  },
  dropdown: {
    position: "absolute",
    top: "45px",
    right: 0,
    width: "360px",
    backdropFilter: "blur(12px)",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: "14px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
    padding: "14px",
    zIndex: 1000,
    fontFamily: "Inter, sans-serif",
    color: "#222",
    display: "flex",
    flexDirection: "column",
    maxHeight: "450px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  markBtn: {
    background: "none",
    border: "none",
    color: "#0078d4",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    marginBottom: "10px",
    paddingRight: "2px",
  },
  notification: {
    display: "flex",
    gap: "10px",
    padding: "10px",
    borderRadius: "10px",
    marginBottom: "6px",
    cursor: "pointer",
    transition: "0.2s",
  },
  notifIcon: { fontSize: "1.2rem", flexShrink: 0 },
  message: { margin: 0, fontSize: "0.9rem", fontWeight: "500" },
  date: { color: "#555", fontSize: "0.8rem" },
  empty: {
    textAlign: "center",
    color: "#777",
    fontStyle: "italic",
    padding: "16px 0",
  },
  footer: {
    borderTop: "1px solid rgba(0,0,0,0.1)",
    paddingTop: "8px",
    textAlign: "center",
  },
  viewAllBtn: {
    background: "linear-gradient(135deg, #0078d4, #00b4ff)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "500",
    transition: "0.2s",
    width: "100%",
  },
};

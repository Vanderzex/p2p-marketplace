import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";

export default function ChatBox({ receiverId, transactionId }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // 🧩 Επιλογή σωστού endpoint
  const fetchUrl = transactionId
    ? `http://localhost:8000/api/chat/transaction/${transactionId}/`
    : `http://localhost:8000/api/chat/thread/${receiverId}/`;

  // 📩 Φόρτωση μηνυμάτων
  useEffect(() => {
    if (!token || (!receiverId && !transactionId)) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Αν το response δεν είναι 2xx → error
        if (!res.ok) {
          const txt = await res.text();
          console.error("❌ Chat API error:", res.status, txt);
          throw new Error("Σφάλμα φόρτωσης μηνυμάτων");
        }

        // ✅ Διαβάζουμε με ασφάλεια το JSON
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          console.warn("⚠️ Απροσδόκητη απάντηση από API:", data);
          setMessages([]);
        }
      } catch (err) {
        console.error("⚠️ Σφάλμα φόρτωσης συνομιλίας:", err);
        // Δεν κάνουμε toast αν απλά δεν υπάρχουν μηνύματα
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [token, receiverId, transactionId]);

  // ✉️ Αποστολή νέου μηνύματος
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch("http://localhost:8000/api/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver: receiverId,
          text: newMessage,
          transaction: transactionId || null,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("❌ Chat API send error:", res.status, txt);
        throw new Error("Αποτυχία αποστολής μηνύματος");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Σφάλμα αποστολής μηνύματος");
    }
  };

  return (
    <div style={styles.chatContainer}>
      <h3>💬 Συνομιλία</h3>

      {loading ? (
        <p>Φόρτωση...</p>
      ) : (
        <div style={styles.messagesBox}>
          {messages.length === 0 ? (
            <p style={{ color: "#777" }}>Δεν υπάρχουν μηνύματα.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  ...styles.message,
                  alignSelf: m.sender === user?.id ? "flex-end" : "flex-start",
                  backgroundColor:
                    m.sender === user?.id ? "#d1f7c4" : "#e4e6eb",
                }}
              >
                <p style={styles.msgText}>{m.text}</p>
                <small style={styles.msgInfo}>
                  {m.sender_username} •{" "}
                  {new Date(m.created_at).toLocaleTimeString("el-GR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            ))
          )}
        </div>
      )}

      {/* ✉️ Πεδίο αποστολής */}
      <form onSubmit={handleSend} style={styles.inputBox}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Πληκτρολόγησε μήνυμα..."
          style={styles.input}
        />
        <button type="submit" style={styles.sendBtn}>
          ➤
        </button>
      </form>
    </div>
  );
}

const styles = {
  chatContainer: {
    background: "#fff",
    borderRadius: "10px",
    padding: "15px",
    maxWidth: "600px",
    margin: "20px auto",
    display: "flex",
    flexDirection: "column",
  },
  messagesBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "400px",
    overflowY: "auto",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "#f9f9f9",
  },
  message: {
    padding: "8px 12px",
    borderRadius: "10px",
    maxWidth: "80%",
    fontSize: "0.95em",
  },
  msgText: { margin: 0 },
  msgInfo: { color: "#555", fontSize: "0.75em" },
  inputBox: {
    display: "flex",
    marginTop: "10px",
  },
  input: {
    flex: 1,
    padding: "8px",
    borderRadius: "8px 0 0 8px",
    border: "1px solid #ccc",
    outline: "none",
  },
  sendBtn: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "0 8px 8px 0",
    padding: "0 15px",
    cursor: "pointer",
  },
};

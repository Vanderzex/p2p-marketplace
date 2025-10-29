import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";
import {
  FaComments,
  FaPaperPlane,
  FaExclamationTriangle,
  FaTimesCircle,
} from "react-icons/fa";

export default function ChatBox({ receiverId, transactionId, itemId }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Επιλογή σωστού endpoint
  const fetchUrl = transactionId
    ? `http://localhost:8000/api/chat/transaction/${transactionId}/`
    : `http://localhost:8000/api/chat/thread/${receiverId}/`;

  // Φόρτωση μηνυμάτων
  useEffect(() => {
    if (!token || (!receiverId && !transactionId)) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error("❌ Chat API error:", res.status);
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        }
      } catch (err) {
        console.error("⚠️ Σφάλμα φόρτωσης συνομιλίας:", err);
      }
    };

    // φόρτωσε μια φορά και μετά κάνε polling
    fetchMessages();
    setLoading(false); // σταματά η ένδειξη "Φόρτωση..."

    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [token, receiverId, transactionId]);

  useEffect(() => {
    const box = document.getElementById("messagesBox");
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  // Αποστολή νέου μηνύματος
  const handleSend = async (e) => {
    e.preventDefault();
    console.log("🟢 sender:", user?.id, "receiver:", receiverId);
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
          item: itemId || null,
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
      <h3><FaComments/> Συνομιλία</h3>

      {loading ? (
        <p>Φόρτωση...</p>
      ) : (
        <div id="messagesBox" style={styles.messagesBox}>
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

      {/* Πεδίο αποστολής */}
      <form onSubmit={handleSend} style={styles.inputBox}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Πληκτρολόγησε μήνυμα..."
          style={styles.input}
        />
        <button type="submit" style={styles.sendBtn}>
          <FaPaperPlane/>
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
    display: "flex",
    flexDirection: "column",
    flex: 1, 
    minHeight: 0, 
  },

  messagesBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1, 
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

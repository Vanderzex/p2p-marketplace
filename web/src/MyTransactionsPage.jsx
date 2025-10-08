import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";

export default function MyTransactionsPage() {
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [itemsByUser, setItemsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔹 Φόρτωση συναλλαγών
  const fetchTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/transactions/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Σφάλμα φόρτωσης");
      const data = await res.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error("Σφάλμα:", err);
      setError("Αποτυχία φόρτωσης συναλλαγών");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  // 🔹 Φόρτωση αντικειμένων ενός χρήστη (για ανταλλαγή)
  const loadUserItems = async (userId) => {
    if (itemsByUser[userId]) return;
    try {
      const res = await fetch(`http://localhost:8000/api/items/?owner_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItemsByUser((prev) => ({ ...prev, [userId]: data }));
    } catch {
      toast.error("⚠️ Αποτυχία φόρτωσης αντικειμένων χρήστη");
    }
  };

  // 🔹 Ενημέρωση συναλλαγής (PATCH)
  const handleAction = async (id, body) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Αποτυχία ενημέρωσης");
      }

      toast.success("✅ Η συναλλαγή ενημερώθηκε!");
      fetchTransactions();
    } catch (err) {
      console.error("Σφάλμα ενημέρωσης:", err);
      toast.error(err.message || "⚠️ Πρόβλημα κατά την ενημέρωση");
    }
  };

  if (loading) return <p>Φόρτωση συναλλαγών...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const incoming = transactions.filter((t) => t.owner_username === user?.username);
  const outgoing = transactions.filter((t) => t.requester_username === user?.username);

  return (
    <div style={styles.container}>
      <h1>📬 Οι συναλλαγές μου</h1>

      {/* Εισερχόμενα αιτήματα */}
      <section style={styles.section}>
        <h2>📥 Εισερχόμενα αιτήματα</h2>
        {incoming.length === 0 ? (
          <p>Δεν υπάρχουν εισερχόμενα αιτήματα.</p>
        ) : (
          incoming.map((tx) => (
            <TransactionCard
              key={tx.id}
              tx={tx}
              user={user}
              handleAction={handleAction}
              loadUserItems={loadUserItems}
              itemsByUser={itemsByUser}
            />
          ))
        )}
      </section>

      {/* Εξερχόμενα αιτήματα */}
      <section style={styles.section}>
        <h2>📤 Εξερχόμενα αιτήματα</h2>
        {outgoing.length === 0 ? (
          <p>Δεν υπάρχουν εξερχόμενα αιτήματα.</p>
        ) : (
          outgoing.map((tx) => (
            <div key={tx.id} style={styles.card}>
              <p>
                <strong>Προς:</strong> {tx.owner_username}
              </p>
              <p>
                <strong>Αντικείμενο:</strong> {tx.item_title}
              </p>
              <p>
                <strong>Τύπος:</strong> {renderType(tx.transaction_type)}
              </p>
              <p>
                <strong>Κατάσταση:</strong> {renderStatus(tx.status)}
              </p>

              {tx.status === "pending" && (
                <button
                  style={styles.cancelButton}
                  onClick={() => handleAction(tx.id, { status: "cancelled" })}
                >
                  🚫 Ακύρωση
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/** 🧩 Κάρτα εισερχόμενης συναλλαγής */
function TransactionCard({ tx, handleAction, loadUserItems, itemsByUser }) {
  const [selectedItem, setSelectedItem] = useState("");
  const [dates, setDates] = useState({ start_date: "", end_date: "" });
  const [chosenType, setChosenType] = useState(null);

  // Αν είναι either → εμφανίζονται δύο κουμπιά επιλογής
  const handleChooseType = (type) => {
    setChosenType(type);
    if (type === "exchange") loadUserItems(tx.requester);
  };

  return (
    <div style={styles.card}>
      <p>
        <strong>Από:</strong> {tx.requester_username}
      </p>
      <p>
        <strong>Αντικείμενο:</strong> {tx.item_title}
      </p>
      <p>
        <strong>Τύπος:</strong> {renderType(tx.transaction_type)}
      </p>
      <p>
        <strong>Μήνυμα:</strong> {tx.message || "—"}
      </p>
      <p>
        <strong>Κατάσταση:</strong> {renderStatus(tx.status)}
      </p>

      {tx.status === "pending" && (
        <>
          {/* 🔸 either: επιλογή μεταξύ ανταλλαγής και δανεισμού */}
          {tx.transaction_type === "either" && !chosenType && (
            <div style={{ marginBottom: "10px" }}>
              <p>Ορίστε πώς θέλετε να προχωρήσετε:</p>
              <button
                style={styles.choiceButton}
                onClick={() => handleChooseType("exchange")}
              >
                🔁 Αποδοχή ως Ανταλλαγή
              </button>
              <button
                style={styles.choiceButton}
                onClick={() => handleChooseType("loan")}
              >
                🤝 Αποδοχή ως Δανεισμό
              </button>
            </div>
          )}

          {/* 🔹 Ανταλλαγή */}
          {(tx.transaction_type === "exchange" ||
            (tx.transaction_type === "either" && chosenType === "exchange")) && (
            <>
              <label>Επιλέξτε αντικείμενο για ανταλλαγή:</label>
              <select
                style={styles.select}
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="">-- Επιλέξτε --</option>
                {(itemsByUser[tx.requester] || []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.title}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* 🔹 Δανεισμός */}
          {(tx.transaction_type === "loan" ||
            (tx.transaction_type === "either" && chosenType === "loan")) && (
            <div>
              <label>Έναρξη:</label>
              <input
                type="date"
                value={dates.start_date}
                onChange={(e) => setDates({ ...dates, start_date: e.target.value })}
              />
              <label>Λήξη:</label>
              <input
                type="date"
                value={dates.end_date}
                onChange={(e) => setDates({ ...dates, end_date: e.target.value })}
              />
            </div>
          )}

          {/* 🔘 Κουμπιά αποδοχής / απόρριψης */}
          <div style={styles.buttonsRow}>
            <button
              style={styles.acceptButton}
              onClick={() => {
                if (tx.transaction_type === "exchange" || chosenType === "exchange") {
                  if (!selectedItem) return toast.error("Επιλέξτε αντικείμενο!");
                  handleAction(tx.id, {
                    status: "accepted",
                    requested_item_id: selectedItem,
                    chosen_type: "exchange",
                  });
                } else if (tx.transaction_type === "loan" || chosenType === "loan") {
                  if (!dates.start_date || !dates.end_date)
                    return toast.error("Ορίστε ημερομηνίες δανεισμού!");
                  handleAction(tx.id, {
                    status: "accepted",
                    start_date: dates.start_date,
                    end_date: dates.end_date,
                    chosen_type: "loan",
                  });
                }
              }}
            >
              ✅ Αποδοχή
            </button>
            <button
              style={styles.rejectButton}
              onClick={() => handleAction(tx.id, { status: "rejected" })}
            >
              ❌ Απόρριψη
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 🧠 Helpers
function renderStatus(status) {
  switch (status) {
    case "pending":
      return "⏳ Σε εκκρεμότητα";
    case "accepted":
      return "✅ Αποδεκτή";
    case "rejected":
      return "❌ Απορριφθείσα";
    case "cancelled":
      return "🚫 Ακυρωμένη";
    default:
      return status;
  }
}

function renderType(type) {
  switch (type) {
    case "exchange":
      return "🔁 Ανταλλαγή";
    case "loan":
      return "🤝 Δανεισμός";
    case "either":
      return "🔁🤝 Ανταλλαγή ή Δανεισμός";
    default:
      return type;
  }
}

// 🎨 Styling
const styles = {
  container: { padding: "20px", maxWidth: "800px", margin: "0 auto" },
  section: { marginBottom: "30px" },
  card: {
    background: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "15px",
  },
  select: { width: "100%", padding: "6px", marginTop: "6px" },
  buttonsRow: { display: "flex", gap: "10px", marginTop: "10px" },
  acceptButton: {
    background: "green",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  rejectButton: {
    background: "red",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  cancelButton: {
    background: "gray",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
  choiceButton: {
    background: "#0078d4",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "8px",
  },
};

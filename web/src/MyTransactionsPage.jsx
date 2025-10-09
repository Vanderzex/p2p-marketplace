import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";

export default function MyTransactionsPage() {
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [itemsByUser, setItemsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Φόρτωση συναλλαγών
  const fetchTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/transactions/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Σφάλμα φόρτωσης συναλλαγών");
      const data = await res.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error("Σφάλμα:", err);
      setError("⚠️ Αποτυχία φόρτωσης συναλλαγών");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  // Φόρτωση αντικειμένων αιτούντα με βάση το username
  const loadRequesterItems = async (username) => {
    if (!username || itemsByUser[username]) return;
    try {
      const res = await fetch(`http://localhost:8000/api/items/of_user/${username}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItemsByUser((prev) => ({ ...prev, [username]: data }));
    } catch {
      toast.error("⚠️ Αποτυχία φόρτωσης αντικειμένων του αιτούντος");
    }
  };

  // PATCH ενημέρωση κατάστασης (loan)
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Αποτυχία ενημέρωσης");
      toast.success("✅ Η συναλλαγή ενημερώθηκε!");
      fetchTransactions();
    } catch (err) {
      console.error("Σφάλμα ενημέρωσης:", err);
      toast.error(err.message || "⚠️ Πρόβλημα κατά την ενημέρωση");
    }
  };

  // Επιλογή αντικειμένου για ανταλλαγή (ιδιοκτήτης)
  const handleSelectExchangeItem = async (id, selectedItemId) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/transactions/${id}/select_exchange_item/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ selected_item_id: selectedItemId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Αποτυχία επιλογής αντικειμένου");
      toast.success("✅ Επιλέχθηκε αντικείμενο για ανταλλαγή!");
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || "⚠️ Πρόβλημα κατά την επιλογή");
    }
  };

  // Απόρριψη από ιδιοκτήτη
  const handleOwnerRejectExchange = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${id}/owner_reject_exchange/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Αποτυχία απόρριψης ανταλλαγής");
      toast.success("❌ Η ανταλλαγή απορρίφθηκε από τον ιδιοκτήτη!");
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || "⚠️ Πρόβλημα κατά την απόρριψη ανταλλαγής");
    }
  };

  // Ο αιτών αποδέχεται την ανταλλαγή
  const handleConfirmExchange = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${id}/confirm_exchange/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Αποτυχία αποδοχής ανταλλαγής");
      toast.success("✅ Αποδέχτηκες την ανταλλαγή!");
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || "⚠️ Πρόβλημα κατά την αποδοχή ανταλλαγής");
    }
  };

  // Ο αιτών απορρίπτει την ανταλλαγή
  const handleRejectExchange = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${id}/reject_exchange/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Αποτυχία απόρριψης ανταλλαγής");
      toast.success("🚫 Η ανταλλαγή απορρίφθηκε από τον αιτούντα!");
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || "⚠️ Πρόβλημα κατά την απόρριψη ανταλλαγής");
    }
  };

  // Ολοκλήρωση συναλλαγής
  const handleMarkCompleted = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${id}/mark_completed/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Αποτυχία ολοκλήρωσης συναλλαγής");
      toast.success("🏁 Η συναλλαγή ολοκληρώθηκε!");
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || "⚠️ Πρόβλημα κατά την ολοκλήρωση");
    }
  };

  // Αποδοχή όρων (loan)
  const handleAcceptTerms = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${id}/accept_terms/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Αποτυχία αποδοχής όρων");
      toast.success("✅ Αποδέχτηκες τους όρους!");
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || "⚠️ Πρόβλημα κατά την αποδοχή όρων");
    }
  };

  if (loading) return <p>Φόρτωση συναλλαγών...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const incoming = transactions.filter((t) => t.owner_username === user?.username);
  const outgoing = transactions.filter((t) => t.requester_username === user?.username);

  return (
    <div style={styles.container}>
      <h1>📬 Οι συναλλαγές μου</h1>

      {/* Εισερχόμενα */}
      <section style={styles.section}>
        <h2>📥 Εισερχόμενα αιτήματα</h2>
        {incoming.length === 0 ? (
          <p>Δεν υπάρχουν εισερχόμενα αιτήματα.</p>
        ) : (
          incoming.map((tx) => (
            <TransactionCard
              key={tx.id}
              tx={tx}
              handleAction={handleAction}
              handleSelectExchangeItem={handleSelectExchangeItem}
              handleOwnerRejectExchange={handleOwnerRejectExchange}
              handleMarkCompleted={handleMarkCompleted}
              loadRequesterItems={loadRequesterItems}
              itemsByUser={itemsByUser}
              user={user}
            />
          ))
        )}
      </section>

      {/* Εξερχόμενα */}
      <section style={styles.section}>
        <h2>📤 Εξερχόμενα αιτήματα</h2>
        {outgoing.length === 0 ? (
          <p>Δεν υπάρχουν εξερχόμενα αιτήματα.</p>
        ) : (
          outgoing.map((tx) => (
            <OutgoingCard
              key={tx.id}
              tx={tx}
              handleConfirmExchange={handleConfirmExchange}
              handleRejectExchange={handleRejectExchange}
              handleAcceptTerms={handleAcceptTerms}
              handleMarkCompleted={handleMarkCompleted}
              user={user}
            />
          ))
        )}
      </section>
    </div>
  );
}

/** Εισερχόμενη κάρτα (Owner) */
function TransactionCard({
  tx,
  handleAction,
  handleSelectExchangeItem,
  handleOwnerRejectExchange,
  handleMarkCompleted,
  loadRequesterItems,
  itemsByUser,
  user,
}) {
  const [selectedItem, setSelectedItem] = useState("");
  const [dates, setDates] = useState({ start_date: tx.start_date || "", end_date: tx.end_date || "" });

  const isOwner = tx.owner_username === user?.username;

  useEffect(() => {
    if (tx.transaction_type === "exchange") loadRequesterItems(tx.requester_username);
  }, [tx]);

  return (
    <div style={styles.card}>
      <p><strong>Από:</strong> {tx.requester_username}</p>
      <p><strong>Τύπος:</strong> {renderType(tx.transaction_type)}</p>
      <p><strong>Κατάσταση:</strong> {renderStatus(tx.status)}</p>

      {/* Ανταλλαγή */}
      {isOwner && tx.transaction_type === "exchange" && tx.status === "pending" && (
        <>
          <label>Επίλεξε αντικείμενο του αιτούντος:</label>
          <select
            style={styles.select}
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
          >
            <option value="">-- Επιλέξτε --</option>
            {(itemsByUser[tx.requester_username] || []).map((it) => (
              <option key={it.id} value={it.id}>{it.title}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              style={styles.acceptButton}
              onClick={() => {
                if (!selectedItem) return toast.error("Επιλέξτε αντικείμενο!");
                handleSelectExchangeItem(tx.id, selectedItem);
              }}
            >
              Αποδοχή Ανταλλαγής
            </button>
            <button
              style={styles.rejectButton}
              onClick={() => handleOwnerRejectExchange(tx.id)}
            >
              ❌ Απόρριψη
            </button>
          </div>
        </>
      )}

      {/* Δανεισμός */}
      {tx.transaction_type === "loan" && isOwner && tx.status === "pending" && (
        <>
          <div style={{ marginTop: "10px" }}>
            <label>📅 Έναρξη:</label>
            <input
              type="date"
              value={dates.start_date}
              onChange={(e) => setDates((prev) => ({ ...prev, start_date: e.target.value }))}
              style={styles.dateInput}
            />
            <label>📅 Λήξη:</label>
            <input
              type="date"
              value={dates.end_date}
              onChange={(e) => setDates((prev) => ({ ...prev, end_date: e.target.value }))}
              style={styles.dateInput}
            />
          </div>
          <button
            style={styles.acceptButton}
            onClick={() => {
              if (!dates.start_date || !dates.end_date)
                return toast.error("Ορίστε ημερομηνίες δανεισμού!");
              handleAction(tx.id, {
                status: "pending_terms",
                start_date: dates.start_date,
                end_date: dates.end_date,
              });
            }}
          >
            ✅ Αποδοχή Δανεισμού
          </button>
        </>
      )}

      {/* Ολοκλήρωση */}
      {isOwner && tx.status === "accepted" && (
        <button style={styles.returnButton} onClick={() => handleMarkCompleted(tx.id)}>
          🏁 Ολοκλήρωση
        </button>
      )}
    </div>
  );
}

/** Εξερχόμενη κάρτα (Requester) */
function OutgoingCard({ tx, handleConfirmExchange, handleRejectExchange, handleAcceptTerms, handleMarkCompleted }) {
  return (
    <div style={styles.card}>
      <p><strong>Προς:</strong> {tx.owner_username}</p>
      <p><strong>Τύπος:</strong> {renderType(tx.transaction_type)}</p>
      <p><strong>Κατάσταση:</strong> {renderStatus(tx.status)}</p>

      {/* Επιβεβαίωση ή Απόρριψη Ανταλλαγής */}
      {tx.transaction_type === "exchange" && tx.status === "pending_confirmation" && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={styles.acceptButton} onClick={() => handleConfirmExchange(tx.id)}>
            ✅ Αποδέχομαι
          </button>
          <button style={styles.rejectButton} onClick={() => handleRejectExchange(tx.id)}>
            ❌ Απόρριψη
          </button>
        </div>
      )}

      {/* Όροι δανεισμού */}
      {tx.status === "pending_terms" && (
        <button style={styles.acceptButton} onClick={() => handleAcceptTerms(tx.id)}>
          ✅ Αποδέχομαι τους όρους
        </button>
      )}

      {tx.status === "returned_by_requester" && (
        <p style={{ color: "orange" }}>⏳ Αναμονή επιβεβαίωσης ιδιοκτήτη</p>
      )}

      {tx.status === "completed" && (
        <p style={{ color: "green" }}>🏁 Ολοκληρωμένη συναλλαγή</p>
      )}
    </div>
  );
}

// Helpers
function renderStatus(status) {
  switch (status) {
    case "pending": return "⏳ Σε εκκρεμότητα";
    case "pending_terms": return "📝 Εκκρεμεί αποδοχή όρων";
    case "pending_confirmation": return "🔁 Αναμονή επιβεβαίωσης αιτούντα";
    case "accepted": return "✅ Ενεργή";
    case "returned_by_requester": return "📦 Δηλώθηκε επιστροφή";
    case "rejected": return "❌ Απορριφθείσα";
    case "cancelled": return "🚫 Ακυρωμένη";
    case "completed": return "🏁 Ολοκληρωμένη";
    default: return status;
  }
}

function renderType(type) {
  switch (type) {
    case "exchange": return "🔁 Ανταλλαγή";
    case "loan": return "🤝 Δανεισμός";
    case "either": return "🔁🤝 Ανταλλαγή ή Δανεισμός";
    default: return type;
  }
}

// Styling
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
  acceptButton: {
    background: "green",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
  rejectButton: {
    background: "red",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
  returnButton: {
    background: "#007bff",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
};

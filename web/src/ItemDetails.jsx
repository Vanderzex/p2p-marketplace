import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, authFetch } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState(null);

  // Transaction state
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Φόρτωση αντικειμένου
  const fetchItem = () => {
    fetch(`http://localhost:8000/api/items/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setItem(data);
        setEditedItem(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Σφάλμα φόρτωσης αντικειμένου:", err);
        setError("Αποτυχία φόρτωσης αντικειμένου 😢");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const isOwner = user?.username === item?.owner;

  // Διαγραφή αντικειμένου
  const handleDelete = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (!window.confirm("Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτό το αντικείμενο;")) return;

    try {
      const response = await authFetch(`http://localhost:8000/api/items/${id}/`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        toast.success("🗑️ Το αντικείμενο διαγράφηκε!");
        navigate("/");
      } else if (response.status === 403) {
        toast.error("🚫 Δεν έχεις δικαίωμα διαγραφής αυτού του αντικειμένου");
      } else {
        toast.error("❌ Αποτυχία διαγραφής αντικειμένου");
      }
    } catch (err) {
      console.error("Σφάλμα διαγραφής:", err);
      toast.error("❌ Σφάλμα κατά τη διαγραφή");
    }
  };

  // Upload εικόνας
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setNewImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleUploadImage = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (!newImage) return toast.error("❌ Επίλεξε μια εικόνα πρώτα");

    const formData = new FormData();
    formData.append("image", newImage);

    try {
      const response = await fetch(`http://localhost:8000/api/items/${id}/upload_image/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success("📸 Η εικόνα ανέβηκε!");
      setNewImage(null);
      setPreview(null);
      fetchItem();
    } catch (err) {
      console.error("Σφάλμα upload:", err);
      toast.error("❌ Αποτυχία ανεβάσματος εικόνας");
    }
  };

  // Ενημέρωση αντικειμένου
  const handleSave = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");

    const formData = new FormData();
    formData.append("title", editedItem.title);
    formData.append("description", editedItem.description);
    formData.append("transaction_type", editedItem.transaction_type);
    formData.append("available", editedItem.available);
    if (newImage) formData.append("main_image", newImage);

    try {
      const response = await authFetch(`http://localhost:8000/api/items/${id}/`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        toast.error("❌ Αποτυχία ενημέρωσης αντικειμένου");
        return;
      }

      toast.success("✏️ Το αντικείμενο ενημερώθηκε!");
      setIsEditing(false);
      fetchItem();
    } catch (err) {
      console.error("Σφάλμα ενημέρωσης:", err);
      toast.error("❌ Σφάλμα κατά την ενημέρωση αντικειμένου");
    }
  };

  // Αποστολή αιτήματος συναλλαγής
  const handleSendTransaction = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (isOwner) return toast.error("Δεν μπορείς να στείλεις αίτημα στο δικό σου αντικείμενο!");

    if (transactionType === "loan" && item.terms && !acceptedTerms) {
      return toast.error("Πρέπει να αποδεχτείς τους όρους πριν την αποστολή!");
    }

    try {
      const response = await authFetch("http://localhost:8000/api/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: item.id,
          transaction_type: transactionType,
          message,
          start_date: transactionType === "loan" ? startDate : null,
          end_date: transactionType === "loan" ? endDate : null,
          terms: transactionType === "loan" ? item.terms : null,
          borrower_accepted_terms: transactionType === "loan" ? acceptedTerms : false,
        }),
      });

      if (response.ok) {
        toast.success("📩 Το αίτημα στάλθηκε επιτυχώς!");
        setShowTransactionForm(false);
        setMessage("");
        setStartDate("");
        setEndDate("");
        setAcceptedTerms(false);
      } else {
        const data = await response.json();
        toast.error(Object.values(data)[0] || "❌ Μη έγκυρα δεδομένα.");
      }
    } catch (err) {
      console.error("Σφάλμα:", err);
      toast.error("⚠️ Πρόβλημα κατά την αποστολή αιτήματος.");
    }
  };

  if (loading) return <p style={styles.loading}>Φόρτωση...</p>;
  if (error) return <p style={styles.error}>{error}</p>;
  if (!item) return <p>Το αντικείμενο δεν βρέθηκε.</p>;

  const mainImageUrl = preview
    ? preview
    : item.main_image
    ? item.main_image.startsWith("http")
      ? item.main_image
      : `http://localhost:8000${item.main_image}`
    : null;

  // Επιλογές τύπου συναλλαγής
  const availableOptions = [];
  if (item.transaction_type === "exchange") {
    availableOptions.push({ value: "exchange", label: "🔁 Ανταλλαγή" });
  } else if (item.transaction_type === "loan") {
    availableOptions.push({ value: "loan", label: "🤝 Δανεισμός" });
  } else if (item.transaction_type === "either") {
    availableOptions.push(
      { value: "exchange", label: "🔁 Ανταλλαγή" },
      { value: "loan", label: "🤝 Δανεισμός" }
    );
  }

  return (
    <div style={styles.container}>
      <h1>🔍 Λεπτομέρειες Αντικειμένου</h1>

      <div style={styles.imageContainer}>
        {mainImageUrl ? (
          <img src={mainImageUrl} alt={item.title} style={styles.image} />
        ) : (
          <div style={styles.noImage}>Χωρίς κύρια εικόνα</div>
        )}
      </div>

      <div style={styles.card}>
        <h2>{item.title}</h2>
        <p>{item.description}</p>

        {item.transaction_type === "loan" && item.terms && (
          <div style={styles.termsBox}>
            <h3>📜 Όροι Δανεισμού</h3>
            <p style={styles.termsText}>{item.terms}</p>
          </div>
        )}

        <p>
          <strong>Τύπος:</strong>{" "}
          {item.transaction_type === "exchange"
            ? "🔁 Ανταλλαγή"
            : item.transaction_type === "loan"
            ? "🤝 Δανεισμός"
            : "🔁🤝 Ανταλλαγή ή Δανεισμός"}
        </p>
        <p>
          <strong>Κατάσταση:</strong> {item.available ? "✅ Διαθέσιμο" : "❌ Μη διαθέσιμο"}
        </p>
        <p>
          <strong>Ιδιοκτήτης:</strong> {item.owner || "Άγνωστος"}
        </p>

        {isOwner && (
          <div style={styles.buttonsRow}>
            <button onClick={() => setIsEditing(true)} style={styles.editButton}>
              ✏️ Επεξεργασία
            </button>
            <button onClick={handleDelete} style={styles.deleteButton}>
              🗑️ Διαγραφή
            </button>
          </div>
        )}
      </div>

      {/* Φόρμα συναλλαγής */}
      {!isOwner && item.available && (
        <div style={styles.transactionSection}>
          {showTransactionForm ? (
            <form onSubmit={handleSendTransaction} style={styles.form}>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">-- Επιλογή τύπου --</option>
                {availableOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Ανταλλαγή */}
              {transactionType === "exchange" && (
                <p style={{ marginBottom: "10px", textAlign: "left", color: "#444" }}>
                  Ο ιδιοκτήτης θα επιλέξει ποιο από τα αντικείμενά σου επιθυμεί για ανταλλαγή.
                </p>
              )}

              {/* Δανεισμός */}
              {transactionType === "loan" && (
                <>
                  <div style={{ marginBottom: "10px" }}>
                    <label>Ημερομηνία Έναρξης:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      style={styles.inputDate}
                    />
                    <label>Ημερομηνία Λήξης:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      style={styles.inputDate}
                    />
                  </div>

                  {item.terms && (
                    <label style={{ display: "block", textAlign: "left", marginBottom: "10px" }}>
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        required
                      />{" "}
                      Αποδέχομαι τους όρους δανεισμού
                    </label>
                  )}
                </>
              )}

              <textarea
                placeholder="Προαιρετικό μήνυμα..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={styles.textarea}
              />

              <div style={styles.buttonsRow}>
                <button
                  type="submit"
                  style={{
                    ...styles.saveButton,
                    opacity: item.terms && transactionType === "loan" && !acceptedTerms ? 0.6 : 1,
                    cursor:
                      item.terms && transactionType === "loan" && !acceptedTerms
                        ? "not-allowed"
                        : "pointer",
                  }}
                  disabled={item.terms && transactionType === "loan" && !acceptedTerms}
                >
                  📩 Αποστολή
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransactionForm(false)}
                  style={styles.cancelButton}
                >
                  ✖️ Άκυρο
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowTransactionForm(true)} style={styles.requestButton}>
              📩 Αίτημα συναλλαγής
            </button>
          )}
        </div>
      )}

      {isOwner && (
        <div style={{ marginTop: "20px" }}>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <button onClick={handleUploadImage} style={styles.uploadButton}>
            📸 Ανέβασε επιπλέον εικόνα
          </button>
        </div>
      )}

      <Link to="/" style={styles.backLink}>
        ← Επιστροφή στη λίστα
      </Link>
    </div>
  );
}

// Styling
const styles = {
  container: { maxWidth: "600px", margin: "50px auto", textAlign: "center", fontFamily: "Arial, sans-serif" },
  imageContainer: { marginBottom: "15px" },
  image: { width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "10px" },
  noImage: { width: "100%", height: "200px", borderRadius: "10px", background: "#e0e0e0", display: "flex", justifyContent: "center", alignItems: "center", color: "#666" },
  termsBox: { background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "10px", padding: "15px", marginBottom: "15px", textAlign: "left" },
  termsText: { whiteSpace: "pre-wrap", fontSize: "0.95rem", color: "#333" },
  card: { background: "#f7f7f7", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", padding: "20px" },
  form: { background: "#f7f7f7", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", padding: "20px" },
  textarea: { width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc", minHeight: "60px" },
  select: { width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc" },
  inputDate: { width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc" },
  buttonsRow: { display: "flex", justifyContent: "space-between", gap: "10px" },
  editButton: { flex: 1, background: "#0275d8", color: "white", border: "none", borderRadius: "6px", padding: "8px" },
  deleteButton: { flex: 1, background: "#d9534f", color: "white", border: "none", borderRadius: "6px", padding: "8px" },
  saveButton: { flex: 1, background: "#28a745", color: "white", border: "none", borderRadius: "6px", padding: "8px" },
  cancelButton: { flex: 1, background: "#6c757d", color: "white", border: "none", borderRadius: "6px", padding: "8px" },
  requestButton: { background: "#007bff", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", marginTop: "20px" },
  uploadButton: { marginTop: "10px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "#17a2b8", color: "white", cursor: "pointer" },
  backLink: { display: "inline-block", marginTop: "20px", textDecoration: "none", color: "#0078d4", fontWeight: "bold" },
  loading: { textAlign: "center", marginTop: "50px" },
  error: { color: "red", textAlign: "center", marginTop: "50px" },
  transactionSection: { marginTop: "25px" },
};

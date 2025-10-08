import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState(null);

  // 🆕 Transaction state
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState("exchange");
  const [message, setMessage] = useState("");

  // 🔹 Φόρτωση αντικειμένου
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

  // 🔹 Διαγραφή αντικειμένου
  const handleDelete = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (!window.confirm("Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτό το αντικείμενο;")) return;

    try {
      const response = await fetch(`http://localhost:8000/api/items/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

  // 🔹 Επιλογή & Upload νέας εικόνας
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

  // 🔹 Ενημέρωση αντικειμένου
  const handleSave = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");

    const formData = new FormData();
    formData.append("title", editedItem.title);
    formData.append("description", editedItem.description);
    formData.append("transaction_type", editedItem.transaction_type);
    formData.append("available", editedItem.available);
    if (newImage) formData.append("main_image", newImage);

    try {
      const response = await fetch(`http://localhost:8000/api/items/${id}/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
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

  // 🆕 Αποστολή αιτήματος συναλλαγής
  const handleSendTransaction = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (isOwner) return toast.error("Δεν μπορείς να στείλεις αίτημα στο δικό σου αντικείμενο!");

    try {
      const response = await fetch("http://localhost:8000/api/transactions/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          item: item.id, // ✅ σωστό όνομα field σύμφωνα με model Transaction
          transaction_type: transactionType,
          message,
        }),
      });

      if (response.ok) {
        toast.success("📩 Το αίτημα στάλθηκε επιτυχώς!");
        setShowTransactionForm(false);
        setMessage("");
      } else if (response.status === 400) {
        const data = await response.json();
        toast.error(data.error || "❌ Μη έγκυρα δεδομένα.");
      } else if (response.status === 403) {
        toast.error("🚫 Δεν έχεις δικαίωμα για αυτή τη συναλλαγή.");
      } else {
        toast.error("❌ Σφάλμα αποστολής αιτήματος.");
      }
    } catch (err) {
      console.error("Σφάλμα:", err);
      toast.error("⚠️ Πρόβλημα κατά την αποστολή αιτήματος.");
    }
  };

  // 🧭 Loading / Error states
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

      {item.images && item.images.length > 0 && (
        <div style={styles.gallery}>
          {item.images.map((img) => (
            <img
              key={img.id}
              src={img.image.startsWith("http") ? img.image : `http://localhost:8000${img.image}`}
              alt="Gallery"
              style={styles.galleryImage}
            />
          ))}
        </div>
      )}

      <div style={styles.card}>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <p>
          <strong>Τύπος:</strong>{" "}
          {item.transaction_type === "exchange" ? "🔁 Ανταλλαγή" : "🤝 Δανεισμός"}
        </p>
        <p>
          <strong>Κατάσταση:</strong>{" "}
          {item.available ? "✅ Διαθέσιμο" : "❌ Μη διαθέσιμο"}
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

      {/* 🆕 Φόρμα συναλλαγής */}
      {!isOwner && item.available && (
        <div style={styles.transactionSection}>
          {showTransactionForm ? (
            <form onSubmit={handleSendTransaction} style={styles.form}>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                style={styles.select}
              >
                <option value="exchange">🔁 Ανταλλαγή</option>
                <option value="loan">🤝 Δανεισμός</option>
              </select>
              <textarea
                placeholder="Προαιρετικό μήνυμα..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={styles.textarea}
              />
              <div style={styles.buttonsRow}>
                <button type="submit" style={styles.saveButton}>
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
            <button
              onClick={() => setShowTransactionForm(true)}
              style={styles.requestButton}
            >
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

// 🎨 Styling (πρέπει να είναι στο ΤΕΛΟΣ)
const styles = {
  container: { maxWidth: "600px", margin: "50px auto", textAlign: "center", fontFamily: "Arial, sans-serif" },
  imageContainer: { marginBottom: "15px" },
  image: { width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "10px" },
  gallery: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px", marginBottom: "20px" },
  galleryImage: { width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px" },
  noImage: { width: "100%", height: "200px", borderRadius: "10px", background: "#e0e0e0", display: "flex", justifyContent: "center", alignItems: "center", color: "#666" },
  card: { background: "#f7f7f7", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", padding: "20px" },
  form: { background: "#f7f7f7", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", padding: "20px" },
  textarea: { width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc", minHeight: "60px" },
  select: { width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc" },
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

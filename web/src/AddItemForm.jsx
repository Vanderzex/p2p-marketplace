import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * AddItemForm
 * Φόρμα προσθήκης νέου αντικειμένου (με JWT έλεγχο & προεπισκόπηση εικόνας)
 * Οι όροι διάθεσης εμφανίζονται μόνο για "loan" ή "either"
 */
export default function AddItemForm({ onAddItem }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState("exchange");
  const [category, setCategory] = useState("other");
  const [deliveryMethod, setDeliveryMethod] = useState("in_person"); // 🆕 νέο state
  const [terms, setTerms] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Αν δεν είναι συνδεδεμένος redirect
  if (!isAuthenticated) {
    toast.error("⚠️ Πρέπει να συνδεθείς για να προσθέσεις αντικείμενο!");
    navigate("/login");
    return null;
  }

  // Επιλογή εικόνας + προεπισκόπηση
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  // Υποβολή φόρμας
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast.error("⚠️ Συμπλήρωσε όλα τα υποχρεωτικά πεδία!");
      return;
    }

    const formData = new FormData();
    formData.append("title", name);
    formData.append("description", description);
    formData.append("transaction_type", transactionType);
    formData.append("category", category);
    formData.append("delivery_method", deliveryMethod); // 🆕 προστέθηκε
    formData.append("available", true);

    // Μόνο αν είναι loan ή either αποστέλλονται οι όροι
    if ((transactionType === "loan" || transactionType === "either") && terms.trim()) {
      formData.append("terms", terms.trim());
    }

    if (image) formData.append("main_image", image);

    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/items/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        toast.error("🔒 Δεν έχεις δικαίωμα πρόσβασης (unauthorized)");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Απάντηση:", errorText);
        throw new Error(`HTTP ${response.status}`);
      }

      const savedItem = await response.json();
      onAddItem(savedItem);
      toast.success("✅ Το αντικείμενο προστέθηκε με επιτυχία!");

      // Επαναφορά φόρμας
      setName("");
      setDescription("");
      setTransactionType("exchange");
      setCategory("other");
      setDeliveryMethod("in_person"); // 🆕 reset
      setTerms("");
      setImage(null);
      setPreview(null);
    } catch (err) {
      console.error("Σφάλμα αποστολής:", err);
      toast.error("❌ Αποτυχία αποθήκευσης αντικειμένου");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form} encType="multipart/form-data">
      <h2 style={{ textAlign: "center" }}>Προσθήκη Αντικειμένου</h2>

      <label style={styles.label}>Όνομα αντικειμένου *</label>
      <input
        type="text"
        placeholder="Π.χ. Βιβλίο, Επιτραπέζιο, Κάμερα..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.input}
      />

      <label style={styles.label}>Περιγραφή *</label>
      <textarea
        placeholder="Περιέγραψε το αντικείμενο και την κατάστασή του..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={styles.textarea}
      />

      <label style={styles.label}>Τύπος συναλλαγής *</label>
      <select
        value={transactionType}
        onChange={(e) => setTransactionType(e.target.value)}
        style={styles.select}
      >
        <option value="exchange">🔁 Ανταλλαγή</option>
        <option value="loan">🤝 Δανεισμός</option>
        <option value="either">🔁🤝 Ανταλλαγή ή Δανεισμός</option>
      </select>

      {/* Κατηγορία αντικειμένου */}
      <label style={styles.label}>Κατηγορία *</label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={styles.select}
      >
        <option value="electronics">💻 Ηλεκτρονικά</option>
        <option value="books">📚 Βιβλία</option>
        <option value="clothing">👕 Ρούχα</option>
        <option value="furniture">🪑 Έπιπλα</option>
        <option value="sports">⚽ Αθλητικά</option>
        <option value="tools">🔧 Εργαλεία</option>
        <option value="other">📦 Άλλο</option>
      </select>

      {/* Τρόπος Παράδοσης */}
      <label style={styles.label}>Τρόπος Παράδοσης *</label>
      <select
        value={deliveryMethod}
        onChange={(e) => setDeliveryMethod(e.target.value)}
        style={styles.select}
      >
        <option value="in_person">🤝 Χέρι με χέρι</option>
        <option value="shipping">📦 Αποστολή με courier</option>
        <option value="pickup_point">📍 Σημείο συνάντησης</option>
        <option value="other">📋 Άλλο</option>
      </select>

      {/* Όροι διάθεσης — εμφανίζονται μόνο για loan ή either */}
      {(transactionType === "loan" || transactionType === "either") && (
        <>
          <label style={styles.label}>Όροι διάθεσης (προαιρετικά)</label>
          <textarea
            placeholder="Π.χ. Επιστροφή εντός 7 ημερών, χωρίς φθορές..."
            value={terms}
            onChange={(e) => setTerms(e.target.value.slice(0, 500))}
            style={styles.textarea}
          />
          <p style={styles.charCounter}>{terms.length}/500</p>
        </>
      )}

      <label style={styles.label}>Εικόνα αντικειμένου (προαιρετικά)</label>
      <input type="file" accept="image/*" onChange={handleImageChange} style={styles.fileInput} />

      {/* Προεπισκόπηση εικόνας */}
      {preview && (
        <div style={styles.previewContainer}>
          <img src={preview} alt="Προεπισκόπηση" style={styles.previewImage} />
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setImage(null);
            }}
            style={styles.removeButton}
          >
            ✖️ Αφαίρεση
          </button>
        </div>
      )}

      <button type="submit" style={styles.button} disabled={loading}>
        {loading ? "Αποστολή..." : "Προσθήκη Αντικειμένου"}
      </button>
    </form>
  );
}

// Styling
const styles = {
  form: {
    background: "#f5f5f5",
    padding: "20px",
    borderRadius: "10px",
    margin: "0 auto 25px",
    width: "340px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  label: {
    fontWeight: "bold",
    marginBottom: "5px",
    display: "block",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    marginBottom: "5px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    minHeight: "60px",
  },
  charCounter: {
    textAlign: "right",
    fontSize: "0.8rem",
    color: "#666",
    marginBottom: "10px",
  },
  select: {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  fileInput: {
    width: "100%",
    marginBottom: "10px",
  },
  previewContainer: {
    textAlign: "center",
    marginBottom: "10px",
  },
  previewImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "8px",
  },
  removeButton: {
    background: "#d9534f",
    color: "white",
    border: "none",
    borderRadius: "5px",
    padding: "5px 8px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  button: {
    width: "100%",
    background: "#0078d4",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

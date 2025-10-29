import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import {
  FaExchangeAlt,
  FaHandHoldingHeart,
  FaLayerGroup,
  FaLaptop,
  FaBook,
  FaTshirt,
  FaCouch,
  FaDumbbell,
  FaTools,
  FaBoxOpen,
  FaHandshake,
  FaTruck,
  FaMapMarkerAlt,
  FaEllipsisH,
  FaImage,
} from "react-icons/fa";

/**
 * AddItemForm
 * Εμφανίζεται inline (χωρίς redirect) και καλεί onAddItem(savedItem)
 * μετά από επιτυχή αποθήκευση.
 */
export default function AddItemForm({ onAddItem }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState("exchange");
  const [category, setCategory] = useState("other");
  const [deliveryMethod, setDeliveryMethod] = useState("in_person");
  const [terms, setTerms] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const { token, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    toast.error("⚠️ Πρέπει να συνδεθείς για να προσθέσεις αντικείμενο!");
    return null;
  }

  // Επιλογή εικόνας
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  // Υποβολή
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
    formData.append("delivery_method", deliveryMethod);
    formData.append("available", true);

    if (
      (transactionType === "loan" || transactionType === "either") &&
      terms.trim()
    ) {
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Απάντηση:", errorText);
        throw new Error(`HTTP ${response.status}`);
      }

      const savedItem = await response.json();
      toast.success("✅ Το αντικείμενο προστέθηκε με επιτυχία!");
      onAddItem(savedItem);

      // Επαναφορά φόρμας
      setName("");
      setDescription("");
      setTransactionType("exchange");
      setCategory("other");
      setDeliveryMethod("in_person");
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
    <form
      onSubmit={handleSubmit}
      style={styles.form}
      encType="multipart/form-data"
    >
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

      <label style={styles.label}>
        <FaExchangeAlt style={styles.icon} /> Τύπος συναλλαγής *
      </label>
      <select
        value={transactionType}
        onChange={(e) => setTransactionType(e.target.value)}
        style={styles.select}
      >
        <option value="exchange">Ανταλλαγή</option>
        <option value="loan">Δανεισμός</option>
        <option value="either">Ανταλλαγή ή Δανεισμός</option>
      </select>

      <label style={styles.label}>
        <FaLaptop style={styles.icon} /> Κατηγορία *
      </label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={styles.select}
      >
        <option value="electronics">Ηλεκτρονικά</option>
        <option value="books">Βιβλία</option>
        <option value="clothing">Ρούχα</option>
        <option value="furniture">Έπιπλα</option>
        <option value="sports">Αθλητικά</option>
        <option value="tools">Εργαλεία</option>
        <option value="other">Άλλο</option>
      </select>

      <label style={styles.label}>
        <FaTruck style={styles.icon} /> Τρόπος Παράδοσης *
      </label>
      <select
        value={deliveryMethod}
        onChange={(e) => setDeliveryMethod(e.target.value)}
        style={styles.select}
      >
        <option value="in_person">Χέρι με χέρι</option>
        <option value="shipping">Αποστολή με courier</option>
        <option value="pickup_point">Σημείο συνάντησης</option>
        <option value="other">Άλλο</option>
      </select>

      {(transactionType === "loan" || transactionType === "either") && (
        <>
          <label style={styles.label}>
            <FaHandHoldingHeart style={styles.icon} /> Όροι διάθεσης
            (προαιρετικά)
          </label>
          <textarea
            placeholder="Π.χ. Επιστροφή εντός 7 ημερών, χωρίς φθορές..."
            value={terms}
            onChange={(e) => setTerms(e.target.value.slice(0, 500))}
            style={styles.textarea}
          />
          <p style={styles.charCounter}>{terms.length}/500</p>
        </>
      )}

      <label style={styles.label}>
        <FaImage style={styles.icon} /> Εικόνα αντικειμένου (προαιρετικά)
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={styles.fileInput}
      />

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
    background: "white",
    padding: "32px 36px",
    borderRadius: "18px",
    margin: "0 auto",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
    fontFamily: "Inter, sans-serif",
    transition: "all 0.3s ease",
  },
  label: {
    fontWeight: "600",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#2b2b2b",
    fontSize: "0.95rem",
  },
  icon: { color: "#0078d4", fontSize: "1rem" },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "14px",
    borderRadius: "10px",
    border: "1px solid #d0d7de",
    background: "#fafbfc",
    fontSize: "0.95rem",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "10px",
    borderRadius: "10px",
    border: "1px solid #d0d7de",
    background: "#fafbfc",
    fontSize: "0.95rem",
    minHeight: "70px",
    outline: "none",
    fontFamily: "Inter, sans-serif",  
    fontWeight: "500",                
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "14px",
    borderRadius: "10px",
    border: "1px solid #d0d7de",
    background: "#fafbfc",
    fontSize: "0.95rem",
    outline: "none",
  },
  fileInput: {
    width: "100%",
    marginBottom: "14px",
    padding: "8px",
    background: "#fafbfc",
    borderRadius: "10px",
    border: "1px dashed #ccc",
    cursor: "pointer",
  },
  previewContainer: {
    textAlign: "center",
    marginBottom: "14px",
  },
  previewImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "10px",
    marginBottom: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
  },
  removeButton: {
    background: "#ff5c5c",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  charCounter: {
    textAlign: "right",
    fontSize: "0.8rem",
    color: "#777",
    marginBottom: "10px",
  },
  button: {
    width: "100%",
    background: "linear-gradient(90deg, #0078d4, #005bb5)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    boxShadow: "0 4px 14px rgba(0,118,255,0.3)",
    transition: "all 0.25s ease",
  },
};

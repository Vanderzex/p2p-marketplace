import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * AddItemForm
 * Φόρμα προσθήκης νέου αντικειμένου (με JWT έλεγχο & προεπισκόπηση εικόνας)
 */
export default function AddItemForm({ onAddItem }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState("exchange");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Αν δεν είναι συνδεδεμένος → redirect
  if (!isAuthenticated) {
    toast.error("⚠️ Πρέπει να συνδεθείς για να προσθέσεις αντικείμενο!");
    navigate("/login");
    return null;
  }

  // 🔹 Επιλογή εικόνας + προεπισκόπηση
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    } else {
      setPreview(null);
    }
  };

  // 🔹 Υποβολή φόρμας
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !description) {
      toast.error("⚠️ Συμπλήρωσε όλα τα πεδία!");
      return;
    }

    const formData = new FormData();
    formData.append("title", name);
    formData.append("description", description);
    formData.append("transaction_type", transactionType);
    formData.append("available", true);
    if (image) formData.append("main_image", image);

    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/items/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        toast.error("🔒 Δεν έχεις δικαίωμα πρόσβασης (unauthorized)");
        navigate("/login");
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const savedItem = await response.json();
      onAddItem(savedItem);
      toast.success("✅ Το αντικείμενο προστέθηκε με επιτυχία!");

      // Επαναφορά φόρμας
      setName("");
      setDescription("");
      setTransactionType("exchange");
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
      <h2>Προσθήκη Αντικειμένου</h2>

      <input
        type="text"
        placeholder="Όνομα αντικειμένου"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.input}
      />

      <textarea
        placeholder="Περιγραφή"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={styles.textarea}
      />

      {/* 🔹 Επέκταση επιλογών τύπου συναλλαγής */}
      <select
        value={transactionType}
        onChange={(e) => setTransactionType(e.target.value)}
        style={styles.select}
      >
        <option value="exchange">🔁 Ανταλλαγή</option>
        <option value="loan">🤝 Δανεισμός</option>
        <option value="either">🔁🤝 Ανταλλαγή ή Δανεισμός</option>
      </select>

      <input type="file" accept="image/*" onChange={handleImageChange} style={styles.fileInput} />

      {/* ✅ Προεπισκόπηση εικόνας */}
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
        {loading ? "Αποστολή..." : "Προσθήκη"}
      </button>
    </form>
  );
}

// 🎨 Styling
const styles = {
  form: {
    background: "#f5f5f5",
    padding: "15px",
    borderRadius: "10px",
    margin: "0 auto 25px",
    width: "320px",
    textAlign: "left",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
    marginBottom: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    minHeight: "60px",
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
  },
};

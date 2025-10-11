import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

import AddItemForm from "./AddItemForm";
import ItemDetails from "./ItemDetails";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import ProfilePage from "./ProfilePage";
import MyItemsPage from "./MyItemsPage";
import MyTransactionsPage from "./MyTransactionsPage";

// Ειδοποιήσεις
import NotificationsBell from "./NotificationsBell";

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/items/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error("Σφάλμα φόρτωσης:", err);
        setError("Αποτυχία σύνδεσης με το backend 😢");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleAddItem = (newItem) => {
    setItems((prev) => [...prev, newItem]);
    setSuccessMessage("✅ Το αντικείμενο προστέθηκε!");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  return (
    <>
      {/* Navbar */}
      <div style={styles.navbar}>
        <Link to="/" style={styles.logo}>
          🛒 P2P Marketplace
        </Link>

        <div style={styles.navLinks}>
          {isAuthenticated ? (
            <>
              <Link to="/my-items" style={styles.link}>
                📦 Τα αντικείμενά μου
              </Link>
              <Link to="/my-transactions" style={styles.link}>
                🔁 Συναλλαγές
              </Link>

              {/* Bell εμφανίζεται μόνο όταν είσαι συνδεδεμένος */}
              <NotificationsBell />

              <Link to={`/profile/${user?.id}`} style={styles.link}>
                👤 {user?.username}
              </Link>
              <button onClick={logout} style={styles.logoutBtn}>
                🚪 Αποσύνδεση
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link}>
                Σύνδεση
              </Link>
              <Link to="/register" style={styles.link}>
                Εγγραφή
              </Link>
            </>
          )}
        </div>
      </div>

      <Toaster position="top-center" />

      {/* Routes */}
      <Routes>
        {/* Αρχική σελίδα */}
        <Route
          path="/"
          element={
            <HomePage
              items={items}
              loading={loading}
              error={error}
              onAddItem={handleAddItem}
              successMessage={successMessage}
            />
          }
        />

        {/* Προβολή αντικειμένου */}
        <Route path="/items/:id" element={<ItemDetails />} />

        {/* Login / Register */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Προσθήκη αντικειμένου */}
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <AddItemForm onAddItem={handleAddItem} />
            </ProtectedRoute>
          }
        />

        {/* Προφίλ */}
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Τα αντικείμενά μου */}
        <Route
          path="/my-items"
          element={
            <ProtectedRoute>
              <MyItemsPage />
            </ProtectedRoute>
          }
        />

        {/* Αντικείμενα άλλου χρήστη */}
        <Route
          path="/user-items/:username"
          element={<MyItemsPage />}
        />

        {/* Οι συναλλαγές μου */}
        <Route
          path="/my-transactions"
          element={
            <ProtectedRoute>
              <MyTransactionsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

/** Κεντρική σελίδα */
function HomePage({ items, loading, error, onAddItem, successMessage }) {
  return (
    <div style={styles.container}>
      {successMessage && <div style={styles.banner}>{successMessage}</div>}

      <h1 style={styles.title}>📦 P2P Marketplace</h1>
      <p style={styles.subtitle}>Κάνε click σε ένα αντικείμενο για λεπτομέρειες</p>

      <AddItemForm onAddItem={onAddItem} />

      {loading && <p>Φόρτωση...</p>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && !error && (
        <div style={styles.list}>
          {items.length === 0 ? (
            <p>Δεν υπάρχουν αντικείμενα ακόμα.</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                style={{
                  ...styles.card,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <small>
                  {item.transaction_type === "exchange"
                    ? "🔁 Ανταλλαγή"
                    : "🤝 Δανεισμός"}
                </small>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Styling
const styles = {
  navbar: {
    background: "#0078d4",
    color: "white",
    padding: "10px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  logo: {
    textDecoration: "none",
    color: "white",
    fontWeight: "bold",
    fontSize: "18px",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },
  link: {
    textDecoration: "none",
    color: "white",
    fontWeight: "bold",
  },
  logoutBtn: {
    background: "white",
    color: "#0078d4",
    border: "none",
    borderRadius: "4px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  container: {
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
    marginTop: "40px",
  },
  banner: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "10px 0",
    fontWeight: "bold",
    textAlign: "center",
    zIndex: 1000,
  },
  title: { fontSize: "2rem", color: "#0078d4" },
  subtitle: { color: "#555", marginBottom: "20px" },
  list: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "20px",
    marginTop: "30px",
  },
  card: {
    background: "#f7f7f7",
    borderRadius: "10px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    padding: "15px",
    width: "250px",
    textAlign: "left",
    cursor: "pointer",
    transition: "transform 0.15s ease-in-out",
  },
  error: { color: "red", fontWeight: "bold" },
};

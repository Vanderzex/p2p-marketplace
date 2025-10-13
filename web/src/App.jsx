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
import NotificationsBell from "./NotificationsBell";
import NotificationsPage from "./NotificationsPage";

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/items/");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Σφάλμα φόρτωσης:", err);
      setError("Αποτυχία σύνδεσης με το backend 😢");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (newItem) => {
    setItems((prev) => [...prev, newItem]);
    setSuccessMessage("✅ Το αντικείμενο προστέθηκε!");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  return (
    <>
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

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              items={items}
              setItems={setItems}
              loading={loading}
              error={error}
              onAddItem={handleAddItem}
              successMessage={successMessage}
            />
          }
        />
        <Route path="/items/:id" element={<ItemDetails />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <AddItemForm onAddItem={handleAddItem} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-items"
          element={
            <ProtectedRoute>
              <MyItemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/user-items/:username" element={<MyItemsPage />} />
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

/** 🏠 Κεντρική σελίδα με αναζήτηση & φίλτρα */
function HomePage({ items, setItems, loading, error, onAddItem, successMessage }) {
  const [query, setQuery] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [category, setCategory] = useState(""); // 🆕 νέο φίλτρο κατηγορίας
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxDistance, setMaxDistance] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const { token } = useAuth();

  // ✅ Αυτόματο fetch τοποθεσίας από backend (/api/me/)
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!token) return;
      try {
        const res = await fetch("http://localhost:8000/api/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setUserCoords({ lat: data.latitude, lon: data.longitude });
          console.log("✅ Φορτώθηκε τοποθεσία από backend:", data.latitude, data.longitude);
        }
      } catch (err) {
        console.error("Σφάλμα φόρτωσης τοποθεσίας χρήστη:", err);
      }
    };

    fetchUserLocation();
  }, [token]);

  // 📍 Εναλλακτική: χρήση geolocation
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Ο browser σου δεν υποστηρίζει geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        setUserCoords(coords);
        toast.success("📍 Τοποθεσία αποθηκεύτηκε!");
      },
      () => toast.error("Αποτυχία λήψης τοποθεσίας 😢")
    );
  };

  // 🔍 Αναζήτηση με φίλτρα
  const fetchFilteredItems = async () => {
    setIsSearching(true);
    console.log("🌍 Sending filters:", {
      userCoords,
      maxDistance,
      query,
      transactionType,
      category,
      onlyAvailable,
    });

    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (transactionType) params.append("transaction_type", transactionType);
      if (category) params.append("category", category); // 🆕 προσθήκη στο URL
      if (onlyAvailable) params.append("available", "true");
      if (userCoords && maxDistance) {
        params.append("lat", userCoords.lat);
        params.append("lon", userCoords.lon);
        params.append("max_distance", maxDistance);
      }

      const url = `http://localhost:8000/api/items/?${params.toString()}`;
      console.log("🔗 URL που στέλνεται:", url);

      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Σφάλμα φίλτρων:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={styles.container}>
      {successMessage && <div style={styles.banner}>{successMessage}</div>}

      <h1 style={styles.title}>📦 P2P Marketplace</h1>
      <p style={styles.subtitle}>Αναζήτησε, φίλτραρε και εξερεύνησε αντικείμενα κοντά σου</p>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Αναζήτηση..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          style={styles.select}
        >
          <option value="">Όλοι οι τύποι</option>
          <option value="exchange">Ανταλλαγή</option>
          <option value="loan">Δανεισμός</option>
        </select>

        {/* 🆕 Dropdown κατηγορίας */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.select}
        >
          <option value="">Όλες οι κατηγορίες</option>
          <option value="electronics">Ηλεκτρονικά</option>
          <option value="books">Βιβλία</option>
          <option value="clothing">Ρούχα</option>
          <option value="furniture">Έπιπλα</option>
          <option value="sports">Αθλητικά</option>
          <option value="tools">Εργαλεία</option>
          <option value="other">Άλλο</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
            style={{ marginRight: "6px" }}
          />
          Μόνο διαθέσιμα
        </label>

        <button onClick={getUserLocation} style={{ ...styles.button, marginLeft: "10px" }}>
          📍 Χρήση τοποθεσίας
        </button>

        <input
          type="number"
          placeholder="Απόσταση (km)"
          value={maxDistance}
          onChange={(e) => setMaxDistance(e.target.value)}
          style={{ ...styles.searchInput, width: "140px" }}
        />

        <button
          onClick={fetchFilteredItems}
          style={{ ...styles.button, background: "#0078d4", color: "white" }}
        >
          🔎 Αναζήτηση
        </button>
      </div>

      <AddItemForm onAddItem={onAddItem} />

      {loading || isSearching ? (
        <p>Φόρτωση...</p>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : !Array.isArray(items) || items.length === 0 ? (
        <p>Δεν βρέθηκαν αντικείμενα.</p>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
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
                {!item.available && (
                  <span style={{ color: "red", marginLeft: "4px" }}>
                    (Μη διαθέσιμο)
                  </span>
                )}
              </small>

              {/* 🆕 Εμφάνιση κατηγορίας */}
              <p style={{ marginTop: "4px", color: "#666" }}>
                🏷️ Κατηγορία: <strong>{item.category}</strong>
              </p>

              {item.distance_km && (
                <p style={{ marginTop: "6px", color: "#007bff" }}>
                  📍 Απόσταση: <strong>{item.distance_km} km</strong>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// 🎨 Styling
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
  logo: { textDecoration: "none", color: "white", fontWeight: "bold", fontSize: "18px" },
  navLinks: { display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" },
  link: { textDecoration: "none", color: "white", fontWeight: "bold" },
  logoutBtn: {
    background: "white",
    color: "#0078d4",
    border: "none",
    borderRadius: "4px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  container: { fontFamily: "Arial, sans-serif", textAlign: "center", marginTop: "40px", padding: "20px" },
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
  filters: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  searchInput: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    width: "220px",
  },
  select: { padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc" },
  list: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px", marginTop: "30px" },
  card: {
    background: "#f7f7f7",
    borderRadius: "10px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    padding: "15px",
    width: "250px",
    textAlign: "left",
    cursor: "pointer",
  },
  button: { padding: "6px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" },
  error: { color: "red", fontWeight: "bold" },
};

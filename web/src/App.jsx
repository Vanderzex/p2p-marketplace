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
import ChangePasswordPage from "./ChangePasswordPage";
import { useLocation } from "react-router-dom";
import UserReviewsPage from "./UserReviewsPage";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, Parallax } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ItemsProvider } from "./context/ItemsContext";

import { motion } from "framer-motion";
import {
  FaBell,
  FaBellSlash,
  FaSearch,
  FaShoppingBag,
  FaExchangeAlt,
  FaHandshake,
  FaStar,
  FaFolder,
  FaEye,
  FaFire,
  FaCheck,
  FaMapMarkerAlt,
  FaTimes,
  FaBoxOpen,
} from "react-icons/fa";

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();

  const { user, logout, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [redirectAfterAuth, setRedirectAfterAuth] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [location.state?.refreshItems]);

  
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
      {/* Navbar */}
      <header style={styles.navbar}>
        <div style={styles.navbarLeft}>
          <Link
            to="/"
            state={{ resetHome: true }}
            style={styles.logo}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(135deg, #0078d4 0%, #6633ff 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "900",
                  fontSize: "16px",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
                }}
              >
                <FaBoxOpen style={{ fontSize: "18px" }} />
              </div>

              <span
                style={{
                  fontWeight: 700,
                  fontSize: "20px",
                  letterSpacing: "-0.5px",
                  background: "linear-gradient(90deg, #ffffff, #e0e0ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                P2P <span style={{ fontWeight: 400 }}>Marketplace</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile toggle */}
        <div style={styles.burger} onClick={() => setMenuOpen((prev) => !prev)}>
          ☰
        </div>

        <nav
          style={{
            ...styles.navLinks,
            ...(menuOpen ? styles.navLinksOpen : {}),
          }}
        >
          {isAuthenticated ? (
            <>
              <Link
                to="/my-items"
                style={styles.link}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Τα αντικείμενά μου
              </Link>

              <Link
                to="/my-transactions"
                style={styles.link}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Συναλλαγές
              </Link>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <NotificationsBell />
              </div>

              {/* Προφίλ με avatar */}
              <Link
                to={`/profile/${user?.id}`}
                style={styles.profileSection}
                onClick={() => setMenuOpen(false)} 
              >
                <img
                  src={
                    user?.profile_image
                      ? user.profile_image.startsWith("http")
                        ? user.profile_image
                        : `http://localhost:8000${user.profile_image}`
                      : "/default-avatar.png"
                  }
                  alt="avatar"
                  style={styles.userAvatar}
                  onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                />
                <span style={styles.usernameText}>{user?.username}</span>
              </Link>

              <button
                onClick={logout}
                style={styles.logoutBtn}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                Αποσύνδεση
              </button>
            </>
          ) : (
            <>
              <button
                style={{
                  ...styles.link,
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAuthMode("login");
                  setRedirectAfterAuth(location.pathname); // αποθηκεύει τη σελίδα
                  setShowAuth(true);
                }}
              >
                Σύνδεση
              </button>
              <button
                style={{
                  ...styles.link,
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAuthMode("register");
                  setRedirectAfterAuth(location.pathname); // αποθηκεύει τη σελίδα
                  setShowAuth(true);
                }}
              >
                Εγγραφή
              </button>
            </>
          )}
        </nav>
      </header>

      {showAuth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowAuth(false)} // click έξω για κλείσιμο
        >
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: "white",
              padding: "30px 40px",
              borderRadius: "14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              width: "90%",
              maxWidth: "450px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Κουμπί κλεισίματος */}
            <button
              onClick={() => setShowAuth(false)}
              style={{
                position: "absolute",
                top: "-16px", 
                right: "-16px",  
                background: "white",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                fontSize: "18px",
                fontWeight: "bold",
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f1f5f9")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              ✕
            </button>

            {authMode === "login" ? (
              <>
                <LoginPage
                  inlineMode
                  onAuthSuccess={() => {
                    setShowAuth(false); // Κλείνει το modal
                    if (redirectAfterAuth) navigate(redirectAfterAuth);
                  }}
                />
                <p style={{ textAlign: "center", marginTop: "10px" }}>
                  Δεν έχεις λογαριασμό;{" "}
                  <button
                    style={{
                      color: "#0078d4",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setAuthMode("register")}
                  >
                    Εγγράψου
                  </button>
                </p>
              </>
            ) : (
              <>
                <RegisterPage
                  inlineMode
                  onAuthSuccess={() => {
                    setShowAuth(false); // Κλείνει το modal
                    if (redirectAfterAuth) navigate(redirectAfterAuth);
                  }}
                />
                <p style={{ textAlign: "center", marginTop: "10px" }}>
                  Έχεις ήδη λογαριασμό;{" "}
                  <button
                    style={{
                      color: "#0078d4",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setAuthMode("login")}
                  >
                    Συνδέσου
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Μπάρα κατηγοριών κάτω από το navbar */}
      {location.pathname === "/" && (
        <div style={styles.categoryBar}>
          {[
            //{ key: "", label: "Όλες" },
            { key: "electronics", label: "Ηλεκτρονικά" },
            { key: "books", label: "Βιβλία" },
            { key: "clothing", label: "Ρούχα" },
            { key: "furniture", label: "Έπιπλα" },
            { key: "sports", label: "Αθλητικά" },
            { key: "tools", label: "Εργαλεία" },
            { key: "other", label: "Άλλο" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                // στέλνεται event στο HomePage για φιλτράρισμα
                window.dispatchEvent(
                  new CustomEvent("selectCategory", { detail: cat.key })
                );
              }}
              style={{
                ...styles.categoryButton,
                //...(category === cat.key ? styles.categoryButtonActive : {}),
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

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
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-reviews/:userId"
          element={
            <ProtectedRoute>
              <UserReviewsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

/** Κεντρική σελίδα με αναζήτηση & φίλτρα */
function HomePage({
  items,
  setItems,
  loading,
  error,
  onAddItem,
  successMessage,
}) {
  const [query, setQuery] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [category, setCategory] = useState(""); 
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxDistance, setMaxDistance] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [minRating, setMinRating] = useState("");

  const { token } = useAuth();
  const auth = useAuth();
  const user = auth?.user;

  const [popularItems, setPopularItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const location = useLocation();
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    // Πλήρες reset σελίδας όταν ζητηθεί (π.χ. logo ή επιστροφή)
    if (location.state?.resetHome) {
      console.log("🔁 Reset Home triggered");
      setResetting(true); 
      setQuery("");
      setTransactionType("");
      setCategory("");
      setOnlyAvailable(false);
      setMaxDistance("");
      setMinRating("");
      setShowFilters(false);
      setHasSearched(false);
      sessionStorage.removeItem("searchState");

      // ✅ Παράλληλο fetch για προτεινόμενα και δημοφιλή
      Promise.all([
        fetch("http://localhost:8000/api/items/").then((r) => r.json()),
        fetch("http://localhost:8000/api/items/popular/").then((r) => r.json()),
      ])
        .then(([allItems, popular]) => {
          setItems(Array.isArray(allItems) ? allItems : allItems.results || []);
          setPopularItems(
            Array.isArray(popular) ? popular : popular.results || []
          );
        })
        .catch((err) =>
          console.error("Σφάλμα επαναφόρτωσης αντικειμένων:", err)
        )
        .finally(() => {
          setResetting(false); // σταματάει το reset
          window.history.replaceState({}, ""); // καθαρίζει το state
        });
    }

    // Επαναφορά προηγούμενης αναζήτησης
    if (location.state?.returnToSearch && location.state?.searchState) {
      console.log("🔍 Returning to previous search");
      const s = location.state.searchState;
      setQuery(s.query || "");
      setTransactionType(s.transactionType || "");
      setCategory(s.category || "");
      setOnlyAvailable(s.onlyAvailable || false);
      setMaxDistance(s.maxDistance || "");
      setMinRating(s.minRating || "");
      setShowFilters(true);
      setHasSearched(true);
      setItems(s.items || []);
    }
  }, [location.state]);

  useEffect(() => {
    // Αν υπάρχει state από το ItemDetails
    if (location.state?.fromSearch && location.state?.searchState) {
      const data = location.state.searchState;
      setQuery(data.query || "");
      setTransactionType(data.transactionType || "");
      setCategory(data.category || "");
      setOnlyAvailable(data.onlyAvailable || false);
      setMaxDistance(data.maxDistance || "");
      setMinRating(data.minRating || "");
      setItems(Array.isArray(data.items) ? data.items : []);
      setHasSearched(true);
      setShowFilters(true);
      return;
    }

    // Αλλιώς αν υπάρχει αποθηκευμένη αναζήτηση στο sessionStorage
    const saved = sessionStorage.getItem("searchState");
    if (saved) {
      const data = JSON.parse(saved);
      setQuery(data.query || "");
      setTransactionType(data.transactionType || "");
      setCategory(data.category || "");
      setOnlyAvailable(data.onlyAvailable || false);
      setMaxDistance(data.maxDistance || "");
      setMinRating(data.minRating || "");
      setItems(Array.isArray(data.items) ? data.items : []);
      if (data.hasSearched || (data.items && data.items.length > 0)) {
        setHasSearched(true);
        setShowFilters(true);
      }
    }
  }, []);

  useEffect(() => {
    const fetchPopularItems = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/items/popular/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPopularItems(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Σφάλμα φόρτωσης δημοφιλών αντικειμένων:", err);
      }
    };

    fetchPopularItems();
  }, []);

  // Αυτόματο fetch τοποθεσίας από backend (/api/me/)
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
          console.log("✅ Φορτώθηκε τοποθεσία:", data.latitude, data.longitude);
        }
      } catch (err) {
        console.error("Σφάλμα φόρτωσης τοποθεσίας χρήστη:", err);
      }
    };

    fetchUserLocation();
  }, [token]);

  // Εναλλακτική: χρήση geolocation
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Ο browser σου δεν υποστηρίζει geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        toast.success("📍 Τοποθεσία αποθηκεύτηκε!");
      },
      () => toast.error("Αποτυχία λήψης τοποθεσίας 😢")
    );
  };

  // Αναζήτηση με φίλτρα
  const fetchFilteredItems = async () => {
    setIsSearching(true);
    if (maxDistance && !userCoords) {
      toast.error("📍 Δεν έχει οριστεί τοποθεσία χρήστη.");
      setIsSearching(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (transactionType) params.append("transaction_type", transactionType);
      if (category) params.append("category", category);
      if (onlyAvailable) params.append("available", "true");
      if (minRating) params.append("min_rating", minRating);
      if (userCoords && maxDistance) {
        params.append("lat", userCoords.lat);
        params.append("lon", userCoords.lon);
        params.append("max_distance", maxDistance);
      }

      const url = `http://localhost:8000/api/items/?${params.toString()}`;
      console.log("🔗 URL:", url);

      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Σφάλμα φίλτρων:", err);
      toast.error("Αποτυχία αναζήτησης 😢");
    } finally {
      setIsSearching(false);
    }
  };

  // Αποθήκευση των δεδομένων αναζήτησης στο sessionStorage
  useEffect(() => {
    const searchState = {
      hasSearched,
      query,
      transactionType,
      category,
      onlyAvailable,
      maxDistance,
      minRating,
      items,
    };
    sessionStorage.setItem("searchState", JSON.stringify(searchState));
  }, [
    hasSearched,
    query,
    transactionType,
    category,
    onlyAvailable,
    maxDistance,
    minRating,
    items,
  ]);

  // ΕΝΑ ενιαίο applyFilters που δέχεται overrides για ασφαλή, σωστή αναζήτηση
  const applyFilters = async (overrides = {}) => {
    const nextQuery = overrides.query ?? query;
    const nextType = overrides.transactionType ?? transactionType;
    const nextCategory = overrides.category ?? category;
    const nextOnlyAvailable = overrides.onlyAvailable ?? onlyAvailable;
    const nextMaxDistance = overrides.maxDistance ?? maxDistance;
    const nextMinRating = overrides.minRating ?? minRating;
    const nextUserCoords = overrides.userCoords ?? userCoords;

    setIsSearching(true);

    if (nextMaxDistance && !nextUserCoords) {
      toast.error("📍 Δεν έχει οριστεί τοποθεσία χρήστη.");
      setIsSearching(false);
      return;
    }

    try {
      const params = new URLSearchParams();

      if (nextQuery) params.append("search", nextQuery);
      if (nextType) params.append("transaction_type", nextType);
      if (nextCategory) params.append("category", nextCategory);
      if (nextOnlyAvailable) params.append("available", "true");
      if (nextMinRating) params.append("min_rating", nextMinRating);

      if (nextUserCoords && nextMaxDistance) {
        params.append("lat", nextUserCoords.lat);
        params.append("lon", nextUserCoords.lon);
        params.append("max_distance", nextMaxDistance);
      }

      const url = `http://localhost:8000/api/items/?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Σφάλμα φίλτρων:", err);
      toast.error("Αποτυχία αναζήτησης 😢");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const handleCategorySelect = (e) => {
      const selectedCat = e.detail;
      setCategory(selectedCat);
      setHasSearched(true);

      //  περνάει την επιλεγμένη κατηγορία στη συνάρτηση
      applyFilters({ category: selectedCat });

      toast.success(
        selectedCat ? `Φιλτράρισμα: ${selectedCat}` : "Όλες οι κατηγορίες"
      );
    };

    window.addEventListener("selectCategory", handleCategorySelect);
    return () =>
      window.removeEventListener("selectCategory", handleCategorySelect);
  }, []);

  return (
    <div style={styles.container}>
      {successMessage && <div style={styles.banner}>{successMessage}</div>}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={styles.heroHeader}
      >
        {/*<h1 style={styles.heroTitle}>P2P Marketplace</h1>*/}
        <h1 style={styles.heroTitle}>
          <span
            style={{
              display: "inline-block",
              background: "linear-gradient(90deg, #1e3a8a, #4338ca, #6d28d9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 900,
              letterSpacing: "-0.5px",
              marginRight: "4px",
            }}
          >
            🛍 P2P
          </span>
          <span
            style={{
              display: "inline-block",
              background: "linear-gradient(90deg, #0f172a, #334155, #1e3a8a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 800,
            }}
          >
            Marketplace
          </span>
        </h1>

        <p style={styles.heroSubtitle}>
          <FaSearch /> Αντάλλαξε, δανείσου και ανακάλυψε αντικείμενα στην
          περιοχή σου
        </p>
      </motion.div>

      <div style={styles.wrapper}>
        {/* Μπάρα αναζήτησης + φίλτρα */}
        <div style={styles.centerSearchSection}>
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={styles.searchOuterWrapper}
          >
            <div
              style={{ position: "relative", width: "100%", maxWidth: "900px" }}
            >
              <div style={styles.searchContainer}>
                <div style={styles.searchInputWrapper}>
                  <span style={styles.searchIcon}>
                    <FaSearch />{" "}
                  </span>
                  <input
                    type="text"
                    placeholder="Αναζήτησε αντικείμενα, κατηγορίες ή χρήστες..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={styles.modernSearchInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setHasSearched(true);
                        applyFilters();
                        if (!showFilters) setShowFilters(true);
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!query.trim()) {
                      toast.error(
                        "Πληκτρολόγησε κάτι πριν κάνεις αναζήτηση 🔍"
                      );
                      return;
                    }
                    setHasSearched(true);
                    applyFilters();
                    if (!showFilters) setShowFilters(true);
                  }}
                  style={styles.modernSearchButton}
                >
                  Αναζήτηση
                </button>
              </div>

              {/* Πλαϊνή μπάρα φίλτρων */}
              {showFilters && (
                <motion.div
                  initial={{ x: -120, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -120, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={styles.filterSidebar}
                >
                  {/* Κουμπί “Χ” πάνω δεξιά */}
                  <button
                    onClick={() => setShowFilters(false)}
                    style={styles.closeFilterButton}
                    title="Κλείσιμο φίλτρων"
                  >
                    <FaTimes />
                  </button>
                  <h3 style={{ marginBottom: "10px" }}>Φίλτρα</h3>

                  <label style={styles.filterLabel}>Τύπος συναλλαγής</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Όλοι οι τύποι</option>
                    <option value="exchange">Ανταλλαγή</option>
                    <option value="loan">Δανεισμός</option>
                  </select>

                  <label style={styles.filterLabel}>Κατηγορία</label>
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

                  <label style={styles.filterLabel}>Ελάχιστη βαθμολογία</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Όλες</option>
                    <option value="1">1 ⭐+</option>
                    <option value="2">2 ⭐+</option>
                    <option value="3">3 ⭐+</option>
                    <option value="4">4 ⭐+</option>
                    <option value="4.5">4.5 ⭐+</option>
                  </select>

                  <label style={styles.filterLabel}>
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      style={{ marginRight: "6px" }}
                    />
                    Μόνο διαθέσιμα
                  </label>

                  <label style={styles.filterLabel}>Απόσταση (km)</label>
                  <input
                    type="number"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(e.target.value)}
                    style={{ ...styles.searchInput, width: "100%" }}
                  />

                  <button
                    onClick={applyFilters}
                    style={{
                      ...styles.button,
                      background: "#0078d4",
                      color: "white",
                      marginTop: "10px",
                    }}
                  >
                    <FaSearch /> Εφαρμογή φίλτρων
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Περιεχόμενο */}
        {loading || isSearching || resetting ? (
          <p style={{ marginTop: "40px", color: "#475569", fontWeight: "500" }}>
            Φόρτωση αντικειμένων...
          </p>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : !Array.isArray(items) || items.length === 0 ? (
          <p style={{ color: "#666", marginTop: "40px" }}>
            Δεν υπάρχουν αντικείμενα αυτή τη στιγμή.
          </p>
        ) : hasSearched ? (
          <>
            {/* Αποτελέσματα Αναζήτησης */}
            <h2 style={styles.sectionTitle}>Αποτελέσματα Αναζήτησης</h2>
            {(() => {
              const filteredResults = items.filter(
                (item) => item.owner_username !== user?.username
              );
              return (
                <p style={styles.subtitleSmall}>
                  Βρέθηκαν {filteredResults.length}{" "}
                  {filteredResults.length === 1 ? "αντικείμενο" : "αντικείμενα"}{" "}
                  που ταιριάζουν
                </p>
              );
            })()}

            <div style={styles.resultsList}>
              {items
                .filter((item) => item.owner_username !== user?.username)
                .map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01, backgroundColor: "#f9fafb" }}
                    transition={{ duration: 0.25 }}
                    style={styles.resultCard}
                  >
                    <Link
                      to={`/items/${item.id}`}
                      state={{
                        fromSearch: true,
                        searchState: {
                          hasSearched,
                          query,
                          transactionType,
                          category,
                          onlyAvailable,
                          maxDistance,
                          minRating,
                          items,
                        },
                      }}
                      style={styles.resultLink}
                    >
                      <img
                        src={
                          item.main_image
                            ? item.main_image
                            : item.images?.length
                            ? `http://localhost:8000${item.images[0].image}`
                            : "/placeholder.jpg"
                        }
                        alt={item.title}
                        style={styles.resultImage}
                      />

                      <div style={styles.resultInfo}>
                        <h3 style={styles.resultTitle}>{item.title}</h3>
                        <p style={styles.resultCategory}>
                          <FaFolder
                            style={{ marginRight: "6px", color: "#64748b" }}
                          />
                          {item.category || "Χωρίς κατηγορία"}
                        </p>

                        <p style={styles.resultDescription}>
                          {item.description
                            ? item.description.slice(0, 120) + "..."
                            : "Χωρίς περιγραφή."}
                        </p>

                        <div style={styles.resultMeta}>
                          <span
                            style={{
                              ...styles.resultTag,
                              background:
                                item.transaction_type === "exchange"
                                  ? "#D1FAE5"
                                  : "#DBEAFE",
                              color:
                                item.transaction_type === "exchange"
                                  ? "#065F46"
                                  : "#1E40AF",
                            }}
                          >
                            {item.transaction_type === "exchange" ? (
                              <>
                                <FaExchangeAlt style={{ marginRight: "4px" }} />{" "}
                                Ανταλλαγή
                              </>
                            ) : (
                              <>
                                <FaHandshake style={{ marginRight: "4px" }} />{" "}
                                Δανεισμός
                              </>
                            )}
                          </span>

                          {item.rating_avg && (
                            <span style={styles.resultRating}>
                              <FaStar
                                style={{ color: "#fbbf24", marginRight: "4px" }}
                              />
                              {item.rating_avg}
                            </span>
                          )}
                        </div>

                        {/* 👤 Πληροφορίες χρήστη */}
                        <div style={styles.resultUser}>
                          <Link
                            to={`/profile/${item.owner_id}`} // χρησιμοποιεί το id
                            style={styles.userLink}
                            onClick={(e) => e.stopPropagation()} // αποτρέπει το click από το να ανοίγει το item
                          >
                            <img
                              src={
                                item.owner_profile_image
                                  ? item.owner_profile_image.startsWith("http")
                                    ? item.owner_profile_image
                                    : `http://localhost:8000${item.owner_profile_image}`
                                  : "/default-avatar.png"
                              }
                              alt={item.owner_username}
                              style={styles.userAvatar}
                            />
                            <span style={styles.userName}>
                              {item.owner_username}
                            </span>
                          </Link>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
            </div>
          </>
        ) : (
          <>
            {/* Προτεινόμενα αντικείμενα */}
            <h2 style={styles.sectionTitleGradient}>
              ✨ Προτεινόμενα αντικείμενα
            </h2>
            <p style={styles.subtitleSoft}>Εξερεύνησε νέες προσφορές</p>

            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={25}
              slidesPerView={"auto"}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 3000, pauseOnMouseEnter: true }}
              loop={true}
              style={{
                paddingBottom: "50px",
                maxWidth: "1100px",
                margin: "0 auto",
              }}
            >
              {items
                .filter(
                  (item) =>
                    item.available && item.owner_username !== user?.username
                )
                .slice(0, 10)
                .map((item) => (
                  <SwiperSlide key={item.id} style={{ width: "260px" }}>
                    <motion.div
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Link
                        to={`/items/${item.id}`}
                        state={{ fromHome: true }}
                        style={styles.carouselCard}
                      >
                        <div style={styles.carouselImageWrapper}>
                          <img
                            src={
                              item.main_image
                                ? item.main_image
                                : item.images?.length
                                ? `http://localhost:8000${item.images[0].image}`
                                : "/placeholder.jpg"
                            }
                            alt={item.title}
                            style={styles.carouselImage}
                          />

                          <div style={styles.imageOverlay}></div>

                          {/* Ετικέτα τύπου */}
                          <span
                            style={{
                              ...styles.resultTag,
                              background:
                                item.transaction_type === "exchange"
                                  ? "#D1FAE5"
                                  : "#DBEAFE",
                              color:
                                item.transaction_type === "exchange"
                                  ? "#065F46"
                                  : "#1E40AF",
                            }}
                          >
                            {item.transaction_type === "exchange" ? (
                              <>
                                <FaExchangeAlt style={{ marginRight: "4px" }} />{" "}
                                Ανταλλαγή
                              </>
                            ) : (
                              <>
                                <FaHandshake style={{ marginRight: "4px" }} />{" "}
                                Δανεισμός
                              </>
                            )}
                          </span>
                        </div>

                        <div style={styles.carouselInfo}>
                          <h3 style={styles.carouselTitle}>{item.title}</h3>
                          <p style={styles.carouselCategory}>
                            {item.category || "Χωρίς κατηγορία"}
                          </p>

                          {/* Πληροφορίες Χρήστη */}
                          <div style={styles.userRow}>
                            <img
                              src={
                                item.owner_profile_image
                                  ? item.owner_profile_image.startsWith("http")
                                    ? item.owner_profile_image
                                    : `http://localhost:8000${item.owner_profile_image}`
                                  : "/default-avatar.png"
                              }
                              alt={item.owner_username}
                              style={styles.userAvatarSmall}
                            />
                            <span style={styles.userNameSmall}>
                              {item.owner_username}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  </SwiperSlide>
                ))}
            </Swiper>

            {/* Δημοφιλή αντικείμενα */}
            <h2 style={styles.sectionTitleGradient}>🔥 Δημοφιλή αντικείμενα</h2>
            <p style={styles.subtitleSoft}>
              Τα αντικείμενα με τις περισσότερες προβολές
            </p>

            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={25}
              slidesPerView={"auto"}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 3500, pauseOnMouseEnter: true }}
              loop={true}
              style={{
                paddingBottom: "50px",
                maxWidth: "1100px",
                margin: "0 auto",
              }}
            >
              {popularItems
                .filter(
                  (item) =>
                    item.available && item.owner_username !== user?.username
                )
                .map((item) => (
                  <SwiperSlide key={item.id} style={{ width: "260px" }}>
                    <motion.div
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Link
                        to={`/items/${item.id}`}
                        state={{ fromHome: true }}
                        style={styles.carouselCard}
                      >
                        <div style={styles.carouselImageWrapper}>
                          <img
                            src={
                              item.main_image
                                ? item.main_image
                                : item.images?.length
                                ? `http://localhost:8000${item.images[0].image}`
                                : "/placeholder.jpg"
                            }
                            alt={item.title}
                            style={styles.carouselImage}
                          />

                          <div style={styles.imageOverlay}></div>

                          {/* Ετικέτα “Δημοφιλές” */}
                          <span
                            style={{
                              ...styles.itemTag,
                              background: "rgba(239,68,68,0.9)",
                            }}
                          >
                            <FaFire style={{ marginRight: "5px" }} /> Δημοφιλές
                          </span>
                        </div>

                        <div style={styles.carouselInfo}>
                          <h3 style={styles.carouselTitle}>{item.title}</h3>
                          <p style={styles.carouselCategory}>
                            {item.category || "Χωρίς κατηγορία"}
                          </p>

                          {/* Προβολές */}
                          <div style={styles.viewsRow}>
                            <FaEye
                              style={{ marginRight: "5px", color: "#475569" }}
                            />
                            <span style={styles.viewsText}>
                              {item.views} προβολές
                            </span>
                          </div>

                          {/* Χρήστης */}
                          <div style={styles.userRow}>
                            <img
                              src={
                                item.owner_profile_image
                                  ? item.owner_profile_image.startsWith("http")
                                    ? item.owner_profile_image
                                    : `http://localhost:8000${item.owner_profile_image}`
                                  : "/default-avatar.png"
                              }
                              alt={item.owner_username}
                              style={styles.userAvatarSmall}
                            />
                            <span style={styles.userNameSmall}>
                              {item.owner_username}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  </SwiperSlide>
                ))}
            </Swiper>
          </>
        )}
      </div>
    </div>
  );
}

// Styling
const styles = {
  navbar: {
    position: "sticky",
    top: 0,
    left: 0,
    width: "100%",
    zIndex: 1000,
    backdropFilter: "blur(12px)",
    background:
      "linear-gradient(90deg, rgba(0,120,212,0.9), rgba(102,51,255,0.9))",
    color: "white",
    padding: "14px 5vw", 
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: 0,
    boxSizing: "border-box", // αποφυγή overflow
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    borderBottom: "1px solid rgba(255,255,255,0.15)",
    transition: "all 0.3s ease",
  },

  navbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  logo: {
    textDecoration: "none",
    color: "white",
    fontWeight: "700",
    fontSize: "22px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "transform 0.3s ease",
    whiteSpace: "nowrap",
  },

  burger: {
    display: "none",
    fontSize: "26px",
    cursor: "pointer",
    color: "white",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    transition: "all 0.3s ease",
  },

  // Responsive εμφάνιση όταν το menu είναι ανοιχτό
  navLinksOpen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    position: "absolute",
    top: "65px",
    right: "5vw", 
    background: "rgba(15,15,15,0.95)",
    borderRadius: "10px",
    padding: "12px 18px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    zIndex: 999,
    minWidth: "180px",
    backdropFilter: "blur(10px)",
  },

  link: {
    textDecoration: "none",
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    fontSize: "0.95rem",
    padding: "6px 12px",
    borderRadius: "8px",
    transition: "background 0.3s, color 0.3s, transform 0.2s",
    whiteSpace: "nowrap",
  },

  logoutBtn: {
    background: "rgba(255,255,255,0.9)",
    color: "#0078d4",
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.9rem",
    transition: "background 0.3s, transform 0.2s",
  },

  userAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(255,255,255,0.4)",
    boxShadow: "0 0 4px rgba(0,0,0,0.2)",
  },

  usernameText: {
    color: "white",
    fontWeight: "600",
    whiteSpace: "nowrap",
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis", 
  },

  profileSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    color: "white",
    fontWeight: "600",
    fontSize: "0.95rem",
    padding: "6px 10px",
    borderRadius: "8px",
    transition: "background 0.3s, transform 0.2s",
  },

  // Κύρια σελίδα
  container: {
    fontFamily: "Inter, Arial, sans-serif",
    position: "relative",
    width: "100vw", // καλύπτει όλο το πλάτος της οθόνης
    minHeight: "100vh",
    margin: 0,
    padding: "40px 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    textAlign: "center",
    overflowX: "hidden", // αποφυγή scroll δεξιά
    boxSizing: "border-box",
  },

  banner: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    backgroundColor: "#22c55e",
    color: "white",
    padding: "10px 0",
    fontWeight: "bold",
    textAlign: "center",
    zIndex: 1000,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },

  title: {
    fontSize: "2.2rem",
    color: "#1e293b",
    fontWeight: "700",
    marginBottom: "10px",
  },

  subtitle: {
    color: "#475569",
    marginBottom: "30px",
    fontSize: "1.1rem",
  },

  subtitleSmall: {
    color: "#64748b",
    marginBottom: "15px",
    fontSize: "0.95rem",
  },

  // Φίλτρα
  filters: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    background: "white",
    borderRadius: "12px",
    padding: "15px 20px",
    marginBottom: "40px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },

  searchInput: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    width: "220px",
    fontSize: "0.95rem",
  },

  select: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "white",
    fontSize: "0.95rem",
  },

  button: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "transform 0.2s, background 0.3s",
    background: "#0078d4",
    color: "white",
  },

  // Λίστα αντικειμένων / κάρτες
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    justifyContent: "center",
    marginTop: "40px",
    maxWidth: "1100px",
    marginLeft: "auto",
    marginRight: "auto",
  },

  card: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    padding: "15px",
    width: "250px",
    textAlign: "left",
    cursor: "pointer",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
  },

  carouselCard: {
    display: "block",
    background: "white",
    borderRadius: "12px",
    overflow: "hidden",
    textDecoration: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    color: "#111",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },

  gridCard: {
    background: "white",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    textDecoration: "none",
    color: "#111",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },

  cardImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
    borderRadius: "12px 12px 0 0",
    transition: "transform 0.4s ease",
  },

  // Wrapper για sliders
  wrapper: {
    width: "100%",
    maxWidth: "1300px", 
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "40px",
    boxSizing: "border-box",
  },

  sectionTitle: {
    fontSize: "1.6rem",
    fontWeight: "700",
    color: "#1e293b",
    marginTop: "40px",
    marginBottom: "10px",
  },

  error: {
    color: "#dc2626",
    fontWeight: "600",
    background: "#fee2e2",
    padding: "8px 16px",
    borderRadius: "8px",
  },
  searchBar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },

  filterSidebar: {
    position: "fixed",
    left: "40px",
    top: "160px",
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "220px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    textAlign: "left",
    zIndex: 100,
  },

  filterLabel: {
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "#334155",
    marginTop: "5px",
  },
  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    width: "100%",
    maxWidth: "900px",
    marginTop: "20px",
  },

  resultCard: {
    display: "flex",
    alignItems: "center",
    background: "white",
    borderRadius: "14px",
    padding: "14px 18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
  },
  resultCardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  },

  resultLink: {
    display: "flex",
    textDecoration: "none",
    color: "inherit",
    width: "100%",
    alignItems: "center",
  },

  resultImage: {
    width: "140px",
    height: "140px",
    borderRadius: "8px",
    objectFit: "cover",
    marginRight: "15px",
    flexShrink: 0,
  },

  resultInfo: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },

  resultTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1e293b",
  },

  resultCategory: {
    color: "#64748b",
    fontSize: "0.9rem",
    marginBottom: "6px",
  },

  resultDescription: {
    fontSize: "0.95rem",
    color: "#475569",
    lineHeight: "1.4",
  },

  resultMeta: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  resultTag: {
    fontSize: "0.8rem",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "500",
  },

  resultRating: {
    background: "rgba(251,191,36,0.15)",
    color: "#b45309",
    padding: "2px 6px",
    borderRadius: "6px",
    fontWeight: "600",
    fontSize: "0.85rem",
  },
  resultUser: {
    display: "flex",
    alignItems: "center",
    marginTop: "8px",
    gap: "8px",
  },

  userLink: {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    color: "#2563eb",
    fontWeight: "500",
    fontSize: "0.9rem",
    transition: "color 0.2s ease",
  },

  userLinkHover: {
    color: "#1e40af",
  },

  userAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(255,255,255,0.4)",
    boxShadow: "0 0 4px rgba(0,0,0,0.25)",
    backgroundColor: "#f3f4f6", 
    flexShrink: 0,
  },

  userName: {
    marginLeft: "6px",
  },

  categoryBar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    overflowX: "auto",
    whiteSpace: "nowrap",
    width: "100%",
    background: "#f3f4f6",
    borderBottom: "1px solid #e2e8f0",
    padding: "10px 16px",
    position: "sticky",
    top: 0, 
    zIndex: 99,
    boxShadow: "inset 0 -1px 0 #e5e7eb",
  },
  categoryButton: {
    background: "transparent",
    border: "none",
    color: "#374151",
    fontWeight: "500",
    fontSize: "0.95rem",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  categoryButtonActive: {
    background: "#0078d4",
    color: "white",
    fontWeight: "600",
  },
  // Νέα μπάρα αναζήτησης (glassmorphism look)
  searchContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    width: "100%",
    maxWidth: "800px", 
    background: "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(12px)",
    borderRadius: "60px", 
    padding: "16px 24px", 
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    transition: "all 0.3s ease",
  },

  searchInputWrapper: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    background: "rgba(255,255,255,0.7)",
    borderRadius: "50px",
    padding: "8px 14px",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)",
    transition: "all 0.25s ease",
  },

  searchIcon: {
    marginRight: "10px",
    fontSize: "1.2rem",
    color: "#475569",
    opacity: 0.7,
  },

  modernSearchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "1rem",
    background: "transparent",
    color: "#1e293b",
  },

  modernSearchButton: {
    background: "linear-gradient(90deg, #0078d4, #6633ff)",
    border: "none",
    color: "white",
    fontWeight: "600",
    fontSize: "1rem",
    padding: "10px 22px",
    borderRadius: "50px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  modernSearchButtonHover: {
    transform: "scale(1.05)",
    background: "linear-gradient(90deg, #0062cc, #5a2aff)",
  },
  fontFamily: "'Inter', system-ui, sans-serif",

  // Νέες βελτιωμένες κάρτες για το slider
  carouselCard: {
    display: "flex",
    flexDirection: "column",
    background: "white",
    borderRadius: "18px",
    overflow: "hidden",
    textDecoration: "none",
    color: "#111",
    boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
    height: "100%",
    minHeight: "360px", 
  },

  carouselImageWrapper: {
    position: "relative",
    width: "100%",
    height: "200px",
    overflow: "hidden",
  },

  carouselImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.4s ease",
  },

  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
  },

  itemTag: {
    position: "absolute",
    top: "10px",
    left: "10px",
    color: "white",
    fontWeight: "600",
    fontSize: "0.8rem",
    padding: "4px 10px",
    borderRadius: "8px",
    backdropFilter: "blur(8px)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },

  carouselInfo: {
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    flex: 1,
  },

  carouselTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "4px",
  },

  carouselCategory: {
    fontSize: "0.9rem",
    color: "#64748b",
    marginBottom: "12px",
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "auto",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "10px",
  },

  userAvatarSmall: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #e2e8f0",
  },

  userNameSmall: {
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "#334155",
  },
  closeFilterButton: {
    position: "absolute",
    top: "8px",
    right: "10px",
    background: "transparent",
    border: "none",
    color: "#475569",
    fontSize: "1.3rem",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  filterTitle: {
    marginBottom: "14px",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "left",
  },

  heroHeader: {
    textAlign: "center",
    marginBottom: "40px",
    marginTop: "10px",
  },

  heroTitle: {
    fontSize: "2.8rem",
    fontWeight: "800",
    color: "#1e293b", 
    letterSpacing: "-1px",
    marginBottom: "10px",
  },

  heroSubtitle: {
    fontSize: "1.15rem",
    color: "#475569",
    marginTop: "8px",
    fontWeight: "500",
    maxWidth: "600px",
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: "1.5",
  },
  sectionTitleGradient: {
    fontSize: "1.8rem",
    fontWeight: "800",
    background: "linear-gradient(90deg, #1e3a8a, #4338ca, #6d28d9)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginTop: "40px",
    marginBottom: "10px",
    textAlign: "center",
    letterSpacing: "-0.5px",
    textShadow: "0 3px 12px rgba(67, 56, 202, 0.25)", 
  },

  subtitleSoft: {
    color: "#64748b",
    marginBottom: "25px",
    fontSize: "1rem",
    textAlign: "center",
    fontWeight: "500",
  },
};

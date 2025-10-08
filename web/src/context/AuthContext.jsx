import { createContext, useContext, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode"; 

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const refreshingRef = useRef(false); // αποτρέπει διπλά refresh

  // Αρχικοποίηση
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      setToken(storedToken);

      const decoded = jwtDecode(storedToken);
      setTokenExpiry(decoded.exp * 1000);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setLoading(false);
      } else {
        fetch("http://localhost:8000/api/me/", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setUser(data);
              localStorage.setItem("user", JSON.stringify(data));
            }
          })
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Login
  const login = async (username, password) => {
    try {
      const response = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        toast.error("❌ Λάθος όνομα ή κωδικός");
        return false;
      }

      const data = await response.json();

      localStorage.setItem("token", data.access);
      localStorage.setItem("refresh", data.refresh);
      setToken(data.access);

      const decoded = jwtDecode(data.access);
      setTokenExpiry(decoded.exp * 1000);

      const meRes = await fetch("http://localhost:8000/api/me/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });

      if (!meRes.ok) throw new Error("Αποτυχία φόρτωσης στοιχείων χρήστη");
      const meData = await meRes.json();

      setUser(meData);
      localStorage.setItem("user", JSON.stringify(meData));

      toast.success("✅ Συνδέθηκες επιτυχώς!");
      return true;
    } catch (err) {
      console.error("Σφάλμα login:", err);
      toast.error("⚠️ Πρόβλημα κατά τη σύνδεση");
      return false;
    }
  };

  // Εγγραφή
  const register = async (username, password) => {
    try {
      const response = await fetch("http://localhost:8000/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) throw new Error("Αποτυχία εγγραφής");
      toast.success("🎉 Εγγραφήκατε επιτυχώς! Συνδεθείτε τώρα.");
      return true;
    } catch (err) {
      console.error("Σφάλμα εγγραφής:", err);
      toast.error("❌ Αποτυχία εγγραφής χρήστη");
      return false;
    }
  };

  // Refresh token
  const refreshToken = async () => {
    if (refreshingRef.current) return; // αποφυγή πολλαπλών refresh
    refreshingRef.current = true;

    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      refreshingRef.current = false;
      return logout();
    }

    try {
      toast.loading("🔄 Ανανέωση token...", { id: "refresh" });

      const response = await fetch("http://localhost:8000/api/token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) throw new Error("Αποτυχία ανανέωσης token");
      const data = await response.json();

      localStorage.setItem("token", data.access);
      setToken(data.access);

      const decoded = jwtDecode(data.access);
      setTokenExpiry(decoded.exp * 1000);

      toast.dismiss("refresh");
      toast.success("✅ Το token ανανεώθηκε!");
    } catch (err) {
      console.error("Σφάλμα refresh token:", err);
      toast.dismiss("refresh");
      toast.error("⏳ Το token έληξε. Συνδέσου ξανά.");
      logout();
    } finally {
      refreshingRef.current = false;
    }
  };

  // Έξυπνο Auto-Refresh κάθε 30s
 useEffect(() => {
  if (!tokenExpiry) return;

  const interval = setInterval(() => {
    const now = Date.now();
    const timeLeft = tokenExpiry - now;

    if (timeLeft <= 0) {
      toast.error("⏳ Το token έληξε. Συνδέσου ξανά.");
      logout();
      clearInterval(interval);
    } 
    else if (timeLeft < 60 * 1000 && !refreshingRef.current) {
      const secondsLeft = Math.floor(timeLeft / 1000);
      toast(`🕐 Το token λήγει σε ${secondsLeft} δευτ.`, { id: "countdown" });

      if (secondsLeft <= 10) {
        // 🔄 Ξεκίνα ανανέωση στα τελευταία 10 δευτ.
        toast.loading("🔄 Ανανέωση token...", { id: "refresh" });
        refreshToken()
          .then(() => {
            toast.dismiss("refresh");
            toast.success("✅ Το token ανανεώθηκε!");
            toast.dismiss("countdown");
          })
          .catch(() => {
            toast.dismiss("refresh");
            toast.error("⚠️ Αποτυχία ανανέωσης token");
          });
      }
    }
  }, 1000); // έλεγχος κάθε 1 δευτερόλεπτο για καλύτερο countdown

  return () => clearInterval(interval);
}, [tokenExpiry]);

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    setTokenExpiry(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    toast("👋 Αποσυνδεθήκατε");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tokenExpiry,
        login,
        register,
        logout,
        refreshToken,
        isAuthenticated: !!user,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

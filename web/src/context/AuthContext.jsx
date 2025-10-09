import { createContext, useContext, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const refreshingRef = useRef(false);

  // 🔹 Αρχικοποίηση από localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      setToken(storedToken);

      try {
        const decoded = jwtDecode(storedToken);
        setTokenExpiry(decoded.exp * 1000);
      } catch (err) {
        console.warn("⚠️ Μη έγκυρο token, καθαρισμός...");
        logout();
        return;
      }

      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setLoading(false);
      } else {
        fetch("http://localhost:8000/api/me/", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${storedToken}`,
          },
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

  // 🔐 Είσοδος χρήστη
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

      // Φόρτωση στοιχείων χρήστη
      const meRes = await fetch("http://localhost:8000/api/me/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access}`,
        },
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

  // 🧾 Εγγραφή
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

  // ♻️ Refresh token
  const refreshToken = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      refreshingRef.current = false;
      return logout();
    }

    try {
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

      toast.success("✅ Το token ανανεώθηκε!");
    } catch (err) {
      console.error("Σφάλμα refresh token:", err);
      toast.error("⏳ Το token έληξε. Συνδέσου ξανά.");
      logout();
    } finally {
      refreshingRef.current = false;
    }
  };

  // ⏱️ Έλεγχος & auto refresh
  useEffect(() => {
    if (!tokenExpiry) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = tokenExpiry - now;

      if (timeLeft <= 0) {
        toast.error("⏳ Το token έληξε. Συνδέσου ξανά.");
        logout();
        clearInterval(interval);
      } else if (timeLeft < 30 * 1000 && !refreshingRef.current) {
        refreshToken();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tokenExpiry]);

  // 🚪 Αποσύνδεση
  const logout = () => {
    setUser(null);
    setToken(null);
    setTokenExpiry(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    toast("👋 Αποσυνδεθήκατε");
  };

  // 🧩 ΝΕΟ: Helper για fetch με αυτόματο Authorization & retry
  const authFetch = async (url, options = {}) => {
    if (!token) throw new Error("No auth token available");

    let headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    console.log("🔑 Χρήση token:", token?.slice(0, 20) + "...");

    let res = await fetch(url, { ...options, headers });

    // Αν το token έληξε, κάνε refresh και ξαναδοκίμασε
    if (res.status === 401) {
      console.warn("🔁 Token πιθανόν έληξε, ανανέωση...");
      await refreshToken();

      const newToken = localStorage.getItem("token");
      headers = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };

      res = await fetch(url, { ...options, headers });
    }

    return res;
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
        authFetch, // 🔒 ασφαλής fetch για προστατευμένα endpoints
        isAuthenticated: !!user,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

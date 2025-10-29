// src/context/ItemsContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const ItemsContext = createContext();

export function ItemsProvider({ children }) {
  const { token } = useAuth();
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("itemsCache");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);

  // ✅ Φόρτωση αντικειμένων (μία φορά ή όταν αλλάξει χρήστης)
  useEffect(() => {
    if (!token && items.length === 0) fetchItemsPublic();
    else if (token && items.length === 0) fetchItemsAuth();
  }, [token]);

  const fetchItemsPublic = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/items/");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
      localStorage.setItem("itemsCache", JSON.stringify(data));
    } catch (err) {
      console.error("❌ Σφάλμα φόρτωσης public items:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemsAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/items/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
      localStorage.setItem("itemsCache", JSON.stringify(data));
    } catch (err) {
      console.error("❌ Σφάλμα φόρτωσης authenticated items:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshItems = async () => {
    localStorage.removeItem("itemsCache");
    setItems([]);
    if (token) await fetchItemsAuth();
    else await fetchItemsPublic();
  };

  return (
    <ItemsContext.Provider value={{ items, setItems, refreshItems, loading }}>
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  return useContext(ItemsContext);
}

import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function MyItemsPage() {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:8000/api/items/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setItems(data.filter((item) => item.owner === user.username));
        setLoading(false);
      })
      .catch(() => toast.error("Αποτυχία φόρτωσης αντικειμένων"));
  }, [token, user]);

  if (loading) return <p>Φόρτωση...</p>;

  return (
    <div style={styles.container}>
      <h1>📦 Τα αντικείμενά μου</h1>
      {items.length === 0 ? (
        <p>Δεν έχεις προσθέσει ακόμη αντικείμενα.</p>
      ) : (
        <ul style={styles.list}>
          {items.map((item) => (
            <li key={item.id} style={styles.card}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link to={`/items/${item.id}`}>Προβολή</Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/add" style={styles.addButton}>➕ Νέο αντικείμενο</Link>
      <Link to="/profile" style={styles.backLink}>← Επιστροφή στο προφίλ</Link>
    </div>
  );
}

const styles = {
  container: { maxWidth: "600px", margin: "50px auto", textAlign: "center" },
  list: { listStyle: "none", padding: 0 },
  card: {
    background: "#f8f9fa",
    margin: "10px 0",
    borderRadius: "10px",
    padding: "15px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  addButton: {
    display: "inline-block",
    marginTop: "20px",
    padding: "8px 16px",
    background: "#007bff",
    color: "white",
    borderRadius: "6px",
    textDecoration: "none",
  },
  backLink: {
    display: "block",
    marginTop: "10px",
    color: "#007bff",
    textDecoration: "none",
  },
};
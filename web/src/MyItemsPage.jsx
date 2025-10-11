import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

export default function MyItemsPage() {
  const { user, token } = useAuth();
  const { username } = useParams(); // 🆕 αν υπάρχει στη διεύθυνση, βλέπουμε άλλον χρήστη
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !username || username === user?.username;

  useEffect(() => {
    if (!token || !user) return;

    const fetchItems = async () => {
      try {
        let url = "http://localhost:8000/api/items/";
        let headers = { Authorization: `Bearer ${token}` };

        if (!isOwnProfile) {
          // Αν βλέπουμε άλλον χρήστη, χρησιμοποίησε το public endpoint
          url = `http://localhost:8000/api/items/of_user/${username}/`;
          headers = {}; // Δεν απαιτεί authentication
        }

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error("Αποτυχία φόρτωσης αντικειμένων");
        const data = await res.json();

        const filtered = isOwnProfile
          ? data.filter(
              (item) =>
                item.owner === user.username ||
                item.owner_username === user.username ||
                item.owner?.username === user.username
            )
          : data;

        setItems(filtered);
      } catch (err) {
        console.error("Σφάλμα:", err);
        toast.error("⚠️ " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [token, user, username, isOwnProfile]);

  if (loading) return <p style={styles.loading}>Φόρτωση αντικειμένων...</p>;

  return (
    <div style={styles.container}>
      <h1>
        📦 {isOwnProfile ? "Τα αντικείμενά μου" : `Αντικείμενα του χρήστη ${username}`}
      </h1>

      {items.length === 0 ? (
        <p>Δεν υπάρχουν διαθέσιμα αντικείμενα.</p>
      ) : (
        <ul style={styles.list}>
          {items.map((item) => (
            <li key={item.id} style={styles.card}>
              {item.main_image && (
                <img
                  src={`http://localhost:8000${item.main_image}`}
                  alt={item.title}
                  style={styles.image}
                />
              )}
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link to={`/items/${item.id}`}>Προβολή</Link>
            </li>
          ))}
        </ul>
      )}

      {/* Εμφάνιση κουμπιών μόνο για το δικό σου προφίλ */}
      {isOwnProfile && (
        <>
          <Link to="/add" style={styles.addButton}>
            ➕ Νέο αντικείμενο
          </Link>
          <Link to="/profile" style={styles.backLink}>
            ← Επιστροφή στο προφίλ
          </Link>
        </>
      )}

      {/* Αν είναι άλλος χρήστης */}
      {!isOwnProfile && (
        <Link to={`/profile/${username}`} style={styles.backLink}>
          ← Επιστροφή στο προφίλ χρήστη
        </Link>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: "650px", margin: "50px auto", textAlign: "center" },
  loading: { textAlign: "center", marginTop: "60px" },
  list: { listStyle: "none", padding: 0 },
  card: {
    background: "#f8f9fa",
    margin: "10px 0",
    borderRadius: "10px",
    padding: "15px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  image: {
    width: "100%",
    height: "160px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "8px",
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

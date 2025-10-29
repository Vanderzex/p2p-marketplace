import { useAuth } from "./context/AuthContext";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";

/**
 * ProtectedRoute
 * Ελέγχει αν ο χρήστης είναι συνδεδεμένος (JWT)
 * Αν όχι, παραμένει στην ίδια σελίδα και αποθηκεύει το path για επιστροφή.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Αποθήκευση τρέχουσας σελίδας για αυτόματη επιστροφή μετά το login
    localStorage.setItem("lastVisitedPath", location.pathname);

    // Μήνυμα προς τον χρήστη
    toast("🔐 Η συνεδρία σου έληξε — συνδέσου για να συνεχίσεις");

    // Αντί για redirect, απλά δεν δείχνει τη σελίδα
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          color: "#333",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <h2 style={{ marginBottom: "10px" }}>🔒 Απαιτείται σύνδεση</h2>
        <p style={{ maxWidth: "400px", color: "#666" }}>
          Η συνεδρία σου έληξε ή δεν έχεις συνδεθεί. Κάνε login για να συνεχίσεις
          από το ίδιο σημείο.
        </p>
      </div>
    );
  }

  return children;
}

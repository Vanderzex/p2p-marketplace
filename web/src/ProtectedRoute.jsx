import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

/**
 * ProtectedRoute
 * Ελέγχει αν ο χρήστης είναι συνδεδεμένος (έχει JWT token)
 * Αν όχι → Redirect στη σελίδα Login
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
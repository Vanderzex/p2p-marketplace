// src/utils/auth.js

// Αποθηκεύει το JWT token στο localStorage
export function saveToken(token) {
    localStorage.setItem("token", token);
  }
  
  // Διαγράφει το token (π.χ. κατά το logout)
  export function removeToken() {
    localStorage.removeItem("token");
  }
  
  // Επιστρέφει το token από το localStorage
  export function getToken() {
    return localStorage.getItem("token");
  }
  
  // Επιστρέφει headers για authenticated requests
  export function getAuthHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  
  // Ελέγχει αν ο χρήστης είναι συνδεδεμένος
  export function isAuthenticated() {
    return !!getToken();
  }
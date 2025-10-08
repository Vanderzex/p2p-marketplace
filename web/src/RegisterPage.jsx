import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth(); // 👈 από AuthContext

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      toast.error("❌ Οι κωδικοί δεν ταιριάζουν.");
      return;
    }

    setLoading(true);
    try {
      // 🔹 Κλήση στο /api/register/ μέσω του AuthContext
      const success = await register(formData.username, formData.password);

      if (success) {
        toast.success("🎉 Εγγραφή επιτυχής! Συνδέεστε...");
        // ✅ Προαιρετικά: αυτόματο login
        const loggedIn = await login(formData.username, formData.password);
        if (loggedIn) {
          navigate("/");
        } else {
          navigate("/login");
        }
      } else {
        toast.error("Αποτυχία εγγραφής χρήστη.");
      }
    } catch (err) {
      console.error("Σφάλμα εγγραφής:", err);
      toast.error("⚠️ Σφάλμα σύνδεσης με τον διακομιστή.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Εγγραφή</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-semibold">Όνομα χρήστη</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Κωδικός</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Επαλήθευση Κωδικού</label>
            <input
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Δημιουργία..." : "Εγγραφή"}
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          Έχετε ήδη λογαριασμό;{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            Συνδεθείτε
          </span>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
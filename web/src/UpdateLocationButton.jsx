import { useAuth } from "./context/AuthContext";
import toast from "react-hot-toast";

export default function UpdateLocationButton() {
  const { token } = useAuth();

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Το geolocation δεν υποστηρίζεται στον browser σου.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch("http://localhost:8000/api/users/update_location/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
          });

          if (!res.ok) throw new Error("Αποτυχία ενημέρωσης τοποθεσίας");
          toast.success("Η τοποθεσία σου ενημερώθηκε επιτυχώς!");
        } catch (err) {
          toast.error("Σφάλμα: " + err.message);
        }
      },
      (error) => {
        if (error.code === 1) toast.error("Δεν δόθηκε άδεια πρόσβασης στην τοποθεσία.");
        else toast.error("Αποτυχία λήψης τοποθεσίας.");
      }
    );
  };

  return (
    <button onClick={handleUpdateLocation} className="bg-blue-500 text-white px-4 py-2 rounded">
      📍 Ενημέρωση Τοποθεσίας
    </button>
  );
}

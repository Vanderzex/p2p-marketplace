import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, tokenExpiry, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isOwnProfile = !id || Number(id) === user?.id;

  // Φόρτωση προφίλ
  useEffect(() => {
    if (!token) return;
    const url = id
      ? `http://localhost:8000/api/users/${id}/`
      : `http://localhost:8000/api/me/`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setProfile)
      .catch((err) => console.error("Σφάλμα φόρτωσης προφίλ:", err));
  }, [id, token]);

  // Φόρτωση αξιολογήσεων
  useEffect(() => {
    if (!token || !user) return;
    const userId = id || user.id;

    fetch(`http://localhost:8000/api/reviews/of_user/${userId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setReviews)
      .catch(() => toast.error("⚠️ Σφάλμα φόρτωσης αξιολογήσεων"))
      .finally(() => setLoading(false));
  }, [token, user, id]);

  // Ενημέρωση τοποθεσίας
  const handleUpdateLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Το geolocation δεν υποστηρίζεται στον browser σου.");
      return;
    }

    if (profile?.latitude && profile?.longitude) {
      const confirmChange = window.confirm(
        "Έχεις ήδη αποθηκευμένη τοποθεσία. Θες να την ενημερώσεις;"
      );
      if (!confirmChange) return;
    }

    setUpdatingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await resp.json();
          const location_name =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.state ||
            "Άγνωστη περιοχή";

          const res = await fetch(
            "http://localhost:8000/api/users/update_location/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ latitude, longitude, location_name }),
            }
          );

          if (!res.ok) throw new Error("Αποτυχία ενημέρωσης τοποθεσίας");

          toast.success("Η τοποθεσία σου ενημερώθηκε επιτυχώς!");
          setProfile((prev) => ({
            ...prev,
            latitude,
            longitude,
            location_name,
          }));
        } catch (err) {
          toast.error("Σφάλμα: " + err.message);
        } finally {
          setUpdatingLocation(false);
        }
      },
      (error) => {
        setUpdatingLocation(false);
        if (error.code === 1)
          toast.error("Δεν δόθηκε άδεια πρόσβασης στην τοποθεσία.");
        else toast.error("Αποτυχία λήψης τοποθεσίας.");
      }
    );
  };

  // Upload φωτογραφίας προφίλ (μόνιμη αποθήκευση)
  const handleImageUpload = async () => {
    if (!profileImage) return toast.error("Επίλεξε πρώτα μια εικόνα.");
    setUploadingImage(true);

    const formData = new FormData();
    formData.append("profile_image", profileImage);

    try {
      const res = await fetch(
        "http://localhost:8000/api/upload-profile-image/",
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Σφάλμα αποστολής εικόνας");

      // Αντί για προσωρινό blob, χρησιμοποίησε το URL από το backend
      toast.success("✅ Φωτογραφία αποθηκεύτηκε επιτυχώς!");
      setProfile((prev) => ({
        ...prev,
        //profile_image: `http://localhost:8000${data.profile_image}`,
        profile_image_url: data.profile_image,
      }));
    } catch (err) {
      toast.error("Σφάλμα: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <h2>Πρέπει να συνδεθείς για να δεις προφίλ</h2>
        <Link to="/login" style={styles.button}>
          Σύνδεση
        </Link>
      </div>
    );
  }

  // Υπολογισμός χρόνου λήξης token
  let timeLeftText = "";
  if (tokenExpiry) {
    const diff = Math.max(0, tokenExpiry - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timeLeftText = `${minutes}λ ${seconds}δ`;
  }

  // Υπολογισμός θετικών αξιολογήσεων
  const totalReviews = reviews.length;
  const positive = reviews.filter((r) => r.rating >= 4).length;
  const positivePercent =
    totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 0;

  return (
    <div style={styles.container}>
      <h1>
        👤{" "}
        {isOwnProfile
          ? "Το προφίλ μου"
          : `Προφίλ χρήστη ${profile?.username || ""}`}
      </h1>

      <div style={styles.card}>
        {/* Φωτογραφία Προφίλ */}
        {profile?.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt="profile"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "10px",
            }}
          />
        ) : (
          <p>Δεν υπάρχει φωτογραφία προφίλ</p>
        )}

        {isOwnProfile && (
          <div style={{ marginBottom: "15px" }}>
            {/* 🆕 Κουμπί που εμφανίζει το input */}
            {!profileImage || profileImage === "UPLOADED" ? (
              <button
                onClick={() => setProfileImage("PENDING")}
                style={{
                  ...styles.link,
                  background: "#007bff",
                  marginBottom: "6px",
                }}
              >
                {profile?.profile_image_url
                  ? "📸 Αλλαγή Εικόνας"
                  : "📸 Ανέβασμα Εικόνας"}
              </button>
            ) : null}

            {/* 🆕 Input + Επιβεβαίωση */}
            {profileImage === "PENDING" && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileImage(e.target.files[0])}
                />
                <button
                  onClick={async () => {
                    // Αν δεν υπάρχει εικόνα → ακυρώνουμε χωρίς αποστολή
                    if (!profileImage || profileImage === "PENDING") {
                      setProfileImage("UPLOADED");
                      return;
                    }

                    // Διαφορετικά προχωράμε σε αποστολή
                    await handleImageUpload();
                    setProfileImage("UPLOADED");
                  }}
                  disabled={uploadingImage}
                  style={{
                    ...styles.link,
                    background: uploadingImage ? "#6c757d" : "#28a745",
                    marginTop: "6px",
                  }}
                >
                  {uploadingImage ? "Ανέβασμα..." : "✅ Επιβεβαίωση"}
                </button>
              </>
            )}
          </div>
        )}

        <p>
          <strong>Όνομα χρήστη:</strong> {profile?.username || user.username}
        </p>

        {profile?.email && (
          <p>
            <strong>Email:</strong> {profile.email}
          </p>
        )}

        {/* Τοποθεσία */}
        {profile?.latitude && profile?.longitude ? (
          <p style={{ marginTop: "10px" }}>
            <strong>Τοποθεσία:</strong>{" "}
            <span style={{ color: "#007bff", fontWeight: "bold" }}>
              {profile.location_name || "Άγνωστη περιοχή"}
            </span>{" "}
            <small style={{ color: "#666" }}>
              ({profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)})
            </small>
          </p>
        ) : (
          <p style={{ marginTop: "10px", color: "#888" }}>
            <strong>Τοποθεσία:</strong> — Δεν έχει οριστεί
          </p>
        )}

        {isOwnProfile && (
          <>
            <p>
              <strong>Token:</strong> {token ? "✅ Ενεργό" : "❌ Όχι"}
            </p>
            {token && tokenExpiry && (
              <p style={{ color: "#0078d4" }}>
                ⏳ Λήγει σε: <strong>{timeLeftText}</strong>
              </p>
            )}

            {/* Κουμπί ενημέρωσης τοποθεσίας */}
            <button
              onClick={handleUpdateLocation}
              disabled={updatingLocation}
              style={{
                ...styles.link,
                background: updatingLocation ? "#6c757d" : "#28a745",
                marginTop: "10px",
              }}
            >
              {updatingLocation ? "Ενημέρωση..." : "📍 Ενημέρωση Τοποθεσίας"}
            </button>
          </>
        )}

        {/* Στατιστικά */}
        {profile && (
          <>
            <hr />
            <p style={{ marginTop: "15px" }}>
              <strong>Μέση Αξιολόγηση:</strong>{" "}
              <StarRating value={profile.average_rating} />{" "}
              <span style={{ fontWeight: "bold" }}>
                {profile.average_rating?.toFixed(1) || "—"}
              </span>{" "}
              / 5
            </p>

            <div style={styles.reputationBarWrapper}>
              <div
                style={{
                  ...styles.reputationBar,
                  width: `${(profile.average_rating / 5) * 100}%`,
                }}
              ></div>
            </div>

            <p>
              <strong>Ολοκληρωμένες Συναλλαγές:</strong>{" "}
              {profile.total_completed_transactions || 0}
            </p>
            <p>
              <strong>Θετικές αξιολογήσεις:</strong> {positivePercent}% (
              {positive}/{totalReviews})
            </p>
          </>
        )}

        {!isOwnProfile && profile && (
          <button
            onClick={() => navigate(`/user-items/${profile.username}`)}
            style={styles.viewItemsBtn}
          >
            📦 Δες τα αντικείμενα του χρήστη
          </button>
        )}
      </div>

      {/* Πρόσφατες αξιολογήσεις */}
      <div style={styles.card}>
        <h3>💬 Πρόσφατες αξιολογήσεις</h3>
        {loading ? (
          <p>Φόρτωση...</p>
        ) : reviews.length === 0 ? (
          <p>Δεν υπάρχουν αξιολογήσεις.</p>
        ) : (
          reviews
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map((r) => (
              <div key={r.id} style={styles.reviewBox}>
                <p>
                  <strong>Από:</strong>{" "}
                  {r.reviewer ? (
                    <Link
                      to={`/profile/${r.reviewer.id}`}
                      style={{
                        color: "#007bff",
                        textDecoration: "none",
                        fontWeight: "bold",
                      }}
                    >
                      {r.reviewer.username}
                    </Link>
                  ) : (
                    "Άγνωστος"
                  )}{" "}
                  <br />⭐ {r.rating}/5
                </p>
                {r.comment && (
                  <p style={{ fontStyle: "italic", color: "#555" }}>
                    {r.comment}
                  </p>
                )}
                <small style={{ color: "#888" }}>
                  {new Date(r.created_at).toLocaleDateString("el-GR")}
                </small>
                <hr />
              </div>
            ))
        )}

        {/* Κουμπί για όλες τις αξιολογήσεις */}
        {reviews.length > 0 && (
          <Link
            to={`/user-reviews/${id || user.id}`}
            style={{
              display: "inline-block",
              marginTop: "10px",
              color: "#007bff",
              fontWeight: "bold",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            ➕ Δες όλες τις αξιολογήσεις
          </Link>
        )}
      </div>

      {/* Συνδέσεις / Ενέργειες */}
      {isOwnProfile && (
        <div style={styles.links}>
          <Link to="/my-items" style={styles.link}>
            📦 Τα αντικείμενά μου
          </Link>
          <Link to="/my-transactions" style={styles.link}>
            🔁 Οι συναλλαγές μου
          </Link>
          <Link to="/add" style={styles.link}>
            ➕ Νέο αντικείμενο
          </Link>
          <Link to="/change-password" style={styles.link}>
            🔑 Αλλαγή Κωδικού
          </Link>
          <button onClick={logout} style={styles.logout}>
            🚪 Αποσύνδεση
          </button>
        </div>
      )}
    </div>
  );
}

/* Εμφάνιση αστεριών */
function StarRating({ value }) {
  const rounded = Math.round(value || 0);
  return (
    <span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rounded ? "#ffc107" : "#e4e5e9" }}>
          ★
        </span>
      ))}
    </span>
  );
}

/* Στυλ */
const styles = {
  container: { maxWidth: "650px", margin: "50px auto", textAlign: "center" },
  card: {
    background: "#f8f9fa",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  reputationBarWrapper: {
    background: "#e9ecef",
    height: "10px",
    borderRadius: "5px",
    overflow: "hidden",
    margin: "8px auto 15px",
    width: "80%",
  },
  reputationBar: {
    height: "10px",
    background: "linear-gradient(90deg, #ffc107, #28a745)",
  },
  reviewBox: {
    background: "#fff",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "8px",
    textAlign: "left",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  links: {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  link: {
    background: "#007bff",
    color: "white",
    padding: "10px",
    borderRadius: "6px",
    textDecoration: "none",
    cursor: "pointer",
  },
  button: {
    background: "#007bff",
    color: "white",
    padding: "10px 20px",
    borderRadius: "6px",
    textDecoration: "none",
  },
  viewItemsBtn: {
    background: "#17a2b8",
    color: "white",
    padding: "10px 15px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "10px",
  },
  logout: {
    background: "#dc3545",
    color: "white",
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

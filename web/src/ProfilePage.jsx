import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import ChatBox from "./ChatBox";

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
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState(null);
  const [showImageForm, setShowImageForm] = useState(false);

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
    if (!profileImage) {
      toast.error("Επίλεξε πρώτα μια εικόνα.");
      return;
    }

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

      toast.success("✅ Φωτογραφία αποθηκεύτηκε επιτυχώς!");

      setProfile((prev) => ({
        ...prev,
        profile_image_url: data.profile_image, //
      }));

      setProfileImage(null);
      setShowImageForm(false);
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
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const totalReviews = safeReviews.length;
  const positive = safeReviews.filter((r) => r.rating >= 4).length;
  const positivePercent =
    totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 0;

  return (
    <div style={styles.container}>
      <div style={styles.profileHeader}>
        <div style={styles.headerIconWrapper}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.6}
            stroke="#007bff"
            style={styles.headerIcon}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a9.75 9.75 0 0115 0"
            />
          </svg>
        </div>

        <div>
          <h1 style={styles.profileTitle}>
            {isOwnProfile
              ? "Το προφίλ μου"
              : `Προφίλ χρήστη ${profile?.username || ""}`}
          </h1>
          <p style={styles.profileSubtitle}>
            Εδώ μπορείς να δεις τις πληροφορίες και τις αξιολογήσεις του χρήστη
          </p>
        </div>
      </div>

      {/* Ενότητα Προφίλ */}
      <motion.section
        style={styles.section}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h2
          style={styles.sectionTitle}
          onMouseEnter={(e) => (e.target.style.color = "#007bff")}
          onMouseLeave={(e) => (e.target.style.color = "#333")}
        >
          Προφίλ
        </h2>

        <div style={styles.card}>
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
                border: "3px solid #007bff",
              }}
            />
          ) : (
            <p>Δεν υπάρχει φωτογραφία προφίλ</p>
          )}

          {isOwnProfile && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "-10px",
                marginBottom: "10px",
                gap: "6px",
              }}
            >
              {/* 1ο βήμα: κουμπί "Επιλογή εικόνας" */}
              {!showImageForm && (
                <button
                  onClick={() => setShowImageForm(true)}
                  style={{
                    ...styles.link,
                    background: "#007bff",
                    color: "white",
                    fontSize: "0.9rem",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {profile?.profile_image_url
                    ? "Αλλαγή Εικόνας"
                    : "Ανέβασμα Εικόνας"}
                </button>
              )}

              {/* 2ο βήμα: μόλις πατηθεί, εμφανίζεται input + αποθήκευση + ακύρωση */}
              {showImageForm && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImage(e.target.files[0] || null)}
                  />

                  <button
                    onClick={handleImageUpload}
                    disabled={uploadingImage || !profileImage}
                    style={{
                      ...styles.link,
                      background: uploadingImage ? "#6c757d" : "#28a745",
                      marginTop: "6px",
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                      cursor:
                        uploadingImage || !profileImage
                          ? "not-allowed"
                          : "pointer",
                      opacity: uploadingImage || !profileImage ? 0.8 : 1,
                    }}
                  >
                    {uploadingImage ? "Ανέβασμα..." : "✅ Αποθήκευση εικόνας"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowImageForm(false);
                      setProfileImage(null);
                    }}
                    style={{
                      ...styles.link,
                      fontSize: "0.8rem",
                      color: "#555",
                    }}
                  >
                    Ακύρωση
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
              <p
                style={{
                  marginTop: "-8px",
                  color: "#555",
                  fontSize: "0.95rem",
                }}
              ></p>
              <strong>Email:</strong> {profile.email}
            </p>
          )}

          {profile?.latitude && profile?.longitude ? (
            <p style={{ marginTop: "10px" }}>
              <strong>Τοποθεσία:</strong>{" "}
              <span style={{ color: "#007bff", fontWeight: "bold" }}>
                {profile.location_name || "Άγνωστη περιοχή"}
              </span>
            </p>
          ) : (
            <p style={{ marginTop: "10px", color: "#888" }}>
              <strong>Τοποθεσία:</strong> — Δεν έχει οριστεί
            </p>
          )}

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
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "10px",
                justifyContent: "center",
                marginTop: "10px",
              }}
            >
              <button
                onClick={() => navigate(`/user-items/${profile.username}`)}
                style={styles.modernBtnSecondary}
              >
                Αντικείμενα
              </button>

              <button
                onClick={() => setShowChat(true)}
                style={styles.modernBtnPrimary}
              >
                Μήνυμα
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Ενότητα Αξιολογήσεων */}
      <motion.section
        style={styles.section}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      >
        <h2
          style={styles.sectionTitle}
          onMouseEnter={(e) => (e.target.style.color = "#007bff")}
          onMouseLeave={(e) => (e.target.style.color = "#333")}
        >
          Αξιολογήσεις
        </h2>

        <div style={styles.card}>
          {loading ? (
            <p>Φόρτωση...</p>
          ) : reviews.length === 0 ? (
            <p>Δεν υπάρχουν αξιολογήσεις.</p>
          ) : (
            safeReviews
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 5)

              .map((r, i) => (
                <motion.div
                  key={r.id}
                  style={styles.reviewBox}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                >
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
                </motion.div>
              ))
          )}

          {safeReviews.length > 0 && (
            <Link
              to={`/user-reviews/${id || user.id}`}
              style={styles.modernBtnSecondarySmall}
              onMouseEnter={(e) => (e.target.style.background = "#e8ebef")}
              onMouseLeave={(e) => (e.target.style.background = "#f0f2f5")}
            >
              Δες όλες τις αξιολογήσεις
            </Link>
          )}
        </div>
      </motion.section>

      {/* Ενότητα Ενέργειες */}
      {isOwnProfile && (
        <motion.section
          style={styles.section}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        >
          <h2
            style={styles.sectionTitle}
            onMouseEnter={(e) => (e.target.style.color = "#007bff")}
            onMouseLeave={(e) => (e.target.style.color = "#333")}
          >
            Ενέργειες
          </h2>

          <div style={styles.links}>
            {/* Αλλαγή Κωδικού */}
            <Link
              to="/change-password"
              style={styles.link}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0056b3")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#007bff")}
            >
              Αλλαγή Κωδικού
            </Link>

            {/* Ενημέρωση Τοποθεσίας */}
            <button
              onClick={handleUpdateLocation}
              disabled={updatingLocation}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = updatingLocation
                  ? "#007bff"
                  : "#0056b3")
              }
              onMouseLeave={(e) => (e.currentTarget.style.color = "#007bff")}
              style={{
                ...styles.link,
                color: "#007bff",
                cursor: updatingLocation ? "not-allowed" : "pointer",
                opacity: updatingLocation ? 0.6 : 1,
                background: "none",
                border: "none",
              }}
            >
              {updatingLocation ? "Ενημέρωση..." : "Ενημέρωση Τοποθεσίας"}
            </button>
          </div>
        </motion.section>
      )}

      {showChat && profile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowChat(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              width: "90%",
              maxWidth: "500px",
              height: "70vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowChat(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              ❌
            </button>

            {/* ChatBox */}
            <ChatBox receiverId={profile.id} />
          </div>
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
  container: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(180deg, #f9f9fb 0%, #edf0f3 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: "60px",
    fontFamily: "Inter, sans-serif",
    color: "#2d2d2d",
    overflowX: "hidden",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "30px 40px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: "850px",
    marginBottom: "30px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "25px",
    alignItems: "center",
    transition: "transform 0.2s ease, box-shadow 0.3s ease",
  },

  profileImage: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    border: "3px solid #007bff",
    objectFit: "cover",
    marginBottom: "10px",
    boxShadow: "0 0 20px rgba(0,123,255,0.15)",
  },

  reputationBarWrapper: {
    background: "#e9ecef",
    height: "8px",
    borderRadius: "5px",
    overflow: "hidden",
    margin: "8px auto 15px",
    width: "80%",
  },

  reputationBar: {
    height: "8px",
    background: "linear-gradient(90deg, #4f8bf9, #28a745)",
  },

  reviewBox: {
    background: "#f9fafb",
    borderRadius: "8px",
    padding: "10px 12px",
    textAlign: "left",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    minHeight: "80px",
  },

  links: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "22px",
    marginTop: "35px",
    marginBottom: "50px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(0,0,0,0.05)",
  },

  link: {
    background: "none",
    color: "#007bff",
    fontWeight: "500",
    textDecoration: "none",
    fontSize: "1rem",
    padding: "6px 10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  button: {
    background: "#007bff",
    color: "white",
    fontWeight: "500",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    textDecoration: "none",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },

  viewItemsBtn: {
    background: "#4f8bf9",
    color: "white",
    fontWeight: "500",
    padding: "10px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    marginTop: "12px",
    transition: "opacity 0.2s ease",
  },

  logout: {
    background: "none",
    border: "none",
    color: "#e74c3c",
    fontWeight: "500",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "6px 10px",
    transition: "opacity 0.2s ease",
  },
  section: {
    width: "100%",
    maxWidth: "950px",
    margin: "40px auto",
    textAlign: "center",
    position: "relative",
    padding: "10px 0 20px",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },

  sectionTitle: {
    fontSize: "1.6rem",
    fontWeight: "700",
    color: "#2d2d2d",
    marginBottom: "25px",
    display: "inline-block",
    paddingBottom: "8px",
    backgroundImage:
      "linear-gradient(90deg, rgba(0,123,255,1) 0%, rgba(40,167,69,1) 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    borderBottom: "3px solid rgba(0,123,255,0.4)",
    transition: "all 0.3s ease",
    letterSpacing: "0.5px",
  },
  messageBtn: {
    background: "#007bff",
    color: "white",
    fontWeight: "500",
    padding: "10px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },
  modernBtnPrimary: {
    background: "linear-gradient(90deg, #007bff, #0062cc)",
    color: "white",
    fontWeight: "600",
    border: "none",
    borderRadius: "50px",
    padding: "8px 16px",
    fontSize: "0.9rem",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    transition: "all 0.25s ease",
  },
  modernBtnSecondary: {
    background: "#f0f2f5",
    color: "#007bff",
    fontWeight: "600",
    border: "1px solid #d0d7de",
    borderRadius: "50px",
    padding: "8px 16px",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.25s ease",
  },
  modernBtnPrimaryHover: {
    background: "linear-gradient(90deg, #0056b3, #0047a0)",
  },
  modernBtnSecondaryHover: {
    background: "#e8ebef",
    color: "#0056b3",
  },

  modernBtnSecondarySmall: {
    display: "inline-block",
    background: "#f0f2f5",
    color: "#007bff",
    fontWeight: "600",
    border: "1px solid #d0d7de",
    borderRadius: "40px",
    padding: "4px 10px",
    fontSize: "0.8rem",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.25s ease",
    marginTop: "10px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    width: "fit-content",
    minWidth: "auto",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "15px",
    marginTop: "30px",
    marginBottom: "20px",
    textAlign: "center",
  },

  headerIconWrapper: {
    background: "linear-gradient(135deg, #007bff 0%, #00c6ff 100%)",
    borderRadius: "50%",
    padding: "12px",
    boxShadow: "0 4px 10px rgba(0,123,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "54px",
    height: "54px",
  },

  headerIcon: {
    width: "28px",
    height: "28px",
  },

  profileTitle: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#2d2d2d",
    marginBottom: "5px",
    fontFamily: "Inter, sans-serif",
  },

  profileSubtitle: {
    fontSize: "0.95rem",
    color: "#666",
    marginTop: 0,
    fontFamily: "Inter, sans-serif",
  },
  modernBtnBlue: {
    background: "linear-gradient(135deg, #007bff 0%, #00b4ff 100%)",
    color: "white",
    fontWeight: "600",
    fontSize: "0.9rem",
    padding: "8px 16px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(0,123,255,0.25)",
    transition: "all 0.25s ease",
    letterSpacing: "0.3px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  modernBtnGreen: {
    background: "linear-gradient(135deg, #28a745 0%, #56d364 100%)",
    color: "white",
    fontWeight: "600",
    fontSize: "0.9rem",
    padding: "8px 16px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(40,167,69,0.25)",
    transition: "all 0.25s ease",
    letterSpacing: "0.3px",
  },
  modernBtnDisabled: {
    background: "linear-gradient(135deg, #adb5bd 0%, #ced4da 100%)",
    color: "white",
    fontWeight: "600",
    fontSize: "0.9rem",
    padding: "8px 16px",
    border: "none",
    borderRadius: "10px",
    cursor: "not-allowed",
    opacity: 0.7,
  },
};

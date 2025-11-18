import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { motion } from "framer-motion";
import ChatBox from "./ChatBox";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {
  FaHeart,
  FaRegHeart,
  FaExchangeAlt,
  FaHandshake,
  FaTruck,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaUser,
  FaStar,
  FaTrash,
  FaEdit,
  FaPaperPlane,
  FaUpload,
  FaComments,
  FaChevronLeft,
  FaScroll,
  FaTools,
} from "react-icons/fa";

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, authFetch } = useAuth();

  const [item, setItem] = useState(null);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState(null);

  // Transaction state
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const location = useLocation();
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatReceiver, setChatReceiver] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const chatWithUsername = queryParams.get("chatWith");

  const [showFileInput, setShowFileInput] = useState(false);

  // Φόρτωση αντικειμένου
  const fetchItem = () => {
    // Ετοιμάζει headers με το JWT token (αν υπάρχει)
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`http://localhost:8000/api/items/${id}/`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("owner_id:", data.owner_id);
        console.log("owner_username:", data.owner_username);
        setItem(data);
        setEditedItem(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Σφάλμα φόρτωσης αντικειμένου:", err);
        setError("Αποτυχία φόρτωσης αντικειμένου 😢");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  useEffect(() => {
    if (item?.owner_username) {
      fetch(`http://localhost:8000/api/items/of_user/${item.owner_username}/`)
        .then((res) => res.json())
        .then((data) => {
          const others = data.filter((i) => i.id !== item.id);
          setUserItems(others.slice(0, 5));
        })
        .catch((err) =>
          console.error("Σφάλμα φόρτωσης άλλων αντικειμένων:", err)
        );
    }
  }, [item]);

  // Αν υπάρχει ?chatWith=<username> στο URL, ανοίγει αυτόματα το chat
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatUser = params.get("chatWith");

    if (!chatUser || !token) return;

    // Αν έχουμε ήδη τα στοιχεία του αντικειμένου
    if (item && item.owner_username) {
      // Αν ο παραλήπτης είναι ο ιδιοκτήτης
      if (chatUser === item.owner_username) {
        setShowChat(true);
        setActiveChatUser({ id: item.owner_id, username: item.owner_username });
        return;
      }
    }

    // 🔹 Αν ο chatUser ΔΕΝ είναι ο owner — π.χ. απευθείας συνομιλία
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/users/by_username/${chatUser}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("User not found");
        const data = await res.json();

        setShowChat(true);
        setActiveChatUser({ id: data.id, username: data.username });
      } catch (err) {
        console.warn("⚠️ Σφάλμα εύρεσης χρήστη για chat:", err);
      }
    })();
  }, [location, item, token]);

  const isOwner = user?.username === item?.owner_username;

  const handleToggleFavorite = async () => {
    if (!token) {
      toast.error("Πρέπει να συνδεθείς για να προσθέσεις στα αγαπημένα");
      return;
    }
    if (isOwner) {
      toast.error(
        "Δεν μπορείς να βάλεις στα αγαπημένα το δικό σου αντικείμενο."
      );
      return;
    }

    const action = item.is_favorite ? "unfavorite" : "favorite";

    try {
      const res = await authFetch(
        `http://localhost:8000/api/items/${id}/${action}/`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error("Αποτυχία ενημέρωσης αγαπημένων");
      }

      // τοπικό update στο state
      setItem((prev) =>
        prev ? { ...prev, is_favorite: !prev.is_favorite } : prev
      );

      toast.success(
        !item.is_favorite
          ? "Προστέθηκε στα αγαπημένα σου"
          : "Αφαιρέθηκε από τα αγαπημένα σου"
      );
    } catch (err) {
      console.error(err);
      toast.error("Κάτι πήγε στραβά με τα αγαπημένα");
    }
  };

  // Διαγραφή αντικειμένου
  const handleDelete = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (
      !window.confirm(
        "Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτό το αντικείμενο;"
      )
    )
      return;

    try {
      const response = await authFetch(
        `http://localhost:8000/api/items/${id}/`,
        {
          method: "DELETE",
        }
      );

      if (response.status === 204) {
        toast.success("Το αντικείμενο διαγράφηκε!");
        navigate("/", { state: { refreshItems: true } });
      } else if (response.status === 403) {
        toast.error("Δεν έχεις δικαίωμα διαγραφής αυτού του αντικειμένου");
      } else {
        toast.error("Αποτυχία διαγραφής αντικειμένου");
      }
    } catch (err) {
      console.error("Σφάλμα διαγραφής:", err);
      toast.error("Σφάλμα κατά τη διαγραφή");
    }
  };

  // Upload εικόνας
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setNewImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleUploadImage = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (!newImage) return toast.error("❌ Επίλεξε μια εικόνα πρώτα");

    const formData = new FormData();
    formData.append("image", newImage);

    try {
      const response = await fetch(
        `http://localhost:8000/api/items/${id}/upload_gallery_image/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success("Η εικόνα ανέβηκε!");
      setNewImage(null);
      setPreview(null);
      fetchItem();
    } catch (err) {
      console.error("Σφάλμα upload:", err);
      toast.error("❌ Αποτυχία ανεβάσματος εικόνας");
    }
  };

  // Διαγραφή εικόνας
  const handleDeleteImage = async (imageId) => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (!window.confirm("Θέλεις σίγουρα να διαγράψεις αυτή την εικόνα;"))
      return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/items/${id}/delete_image/${imageId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 204) {
        toast.success("Η εικόνα διαγράφηκε!");
        fetchItem(); // ενημερώνει το state
      } else {
        toast.error("Αποτυχία διαγραφής εικόνας");
      }
    } catch (err) {
      console.error("Σφάλμα διαγραφής εικόνας:", err);
      toast.error("Σφάλμα κατά τη διαγραφή εικόνας");
    }
  };

  // Ενημέρωση αντικειμένου (τίτλος, περιγραφή, τύπος, τρόπος παράδοσης, διαθεσιμότητα)
  const handleSave = async () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");

    try {
      const response = await authFetch(
        `http://localhost:8000/api/items/${id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editedItem.title,
            description: editedItem.description,
            transaction_type: editedItem.transaction_type,
            delivery_method: editedItem.delivery_method,
            available: editedItem.available,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.log("🧩 Response:", text);
        toast.error("❌ Αποτυχία ενημέρωσης αντικειμένου");
        return;
      }

      toast.success("Το αντικείμενο ενημερώθηκε!");
      setIsEditing(false);
      fetchItem();
    } catch (err) {
      console.error("Σφάλμα ενημέρωσης:", err);
      toast.error("❌ Σφάλμα κατά την ενημέρωση αντικειμένου");
    }
  };

  const handleOpenChat = () => {
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (isOwner)
      return toast.error("Δεν μπορείς να συνομιλήσεις με τον εαυτό σου!");
    setActiveChatUser({
      id: item.owner_id,
      username: item.owner_username,
    });
    setShowChat(true);
  };

  // Αποστολή αιτήματος συναλλαγής
  const handleSendTransaction = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Πρέπει να συνδεθείς πρώτα!");
    if (isOwner)
      return toast.error(
        "Δεν μπορείς να στείλεις αίτημα στο δικό σου αντικείμενο!"
      );

    if (transactionType === "loan" && item.terms && !acceptedTerms) {
      return toast.error("Πρέπει να αποδεχτείς τους όρους πριν την αποστολή!");
    }

    try {
      const response = await authFetch(
        "http://localhost:8000/api/transactions/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item: item.id,
            transaction_type: transactionType,
            message,
            start_date: transactionType === "loan" ? startDate : null,
            end_date: transactionType === "loan" ? endDate : null,
            terms: transactionType === "loan" ? item.terms : null,
            borrower_accepted_terms:
              transactionType === "loan" ? acceptedTerms : false,
          }),
        }
      );

      if (response.ok) {
        toast.success("Το αίτημα στάλθηκε επιτυχώς!");
        setShowTransactionForm(false);
        setMessage("");
        setStartDate("");
        setEndDate("");
        setAcceptedTerms(false);
      } else {
        const data = await response.json();
        toast.error(Object.values(data)[0] || "❌ Μη έγκυρα δεδομένα.");
      }
    } catch (err) {
      console.error("Σφάλμα:", err);
      toast.error("⚠️ Πρόβλημα κατά την αποστολή αιτήματος.");
    }
  };

  if (loading) return <p style={styles.loading}>Φόρτωση...</p>;
  if (error) return <p style={styles.error}>{error}</p>;
  if (!item) return <p>Το αντικείμενο δεν βρέθηκε.</p>;

  const mainImageUrl = preview
    ? preview
    : item.main_image
    ? item.main_image.startsWith("http")
      ? item.main_image
      : `http://localhost:8000${item.main_image}`
    : null;

  // Επιλογές τύπου συναλλαγής
  const availableOptions = [];
  if (item.transaction_type === "exchange") {
    availableOptions.push({ value: "exchange", label: "Ανταλλαγή" });
  } else if (item.transaction_type === "loan") {
    availableOptions.push({ value: "loan", label: "Δανεισμός" });
  } else if (item.transaction_type === "either") {
    availableOptions.push(
      { value: "exchange", label: "Ανταλλαγή" },
      { value: "loan", label: "Δανεισμός" }
    );
  }

  return (
    <motion.div
      style={styles.wrapper}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={styles.cardContainer}>
        {/* Gallery φωτογραφιών */}
        <div style={styles.imageSection}>
          {(item.images && item.images.length > 0) || item.main_image ? (
            <div style={styles.galleryContainer}>
              {/* Κύρια φωτογραφία */}
              <div style={styles.mainImageFrame}>
                <img
                  src={
                    selectedImage ||
                    (item.main_image
                      ? item.main_image.startsWith("http")
                        ? item.main_image
                        : `http://localhost:8000${item.main_image}`
                      : `http://localhost:8000${item.images[0].image}`)
                  }
                  alt="Κύρια φωτογραφία"
                  style={styles.mainGalleryImage}
                  onClick={() =>
                    setSelectedImage(
                      selectedImage ||
                        (item.main_image
                          ? item.main_image.startsWith("http")
                            ? item.main_image
                            : `http://localhost:8000${item.main_image}`
                          : `http://localhost:8000${item.images[0].image}`)
                    )
                  }
                />
              </div>

              {/* Μικρογραφίες κάτω */}
              <div style={styles.thumbnailRow}>
                {/* Κύρια εικόνα thumbnail */}
                {item.main_image && (
                  <div style={styles.thumbnailWrapper}>
                    <img
                      src={
                        item.main_image.startsWith("http")
                          ? item.main_image
                          : `http://localhost:8000${item.main_image}`
                      }
                      alt="Main thumbnail"
                      style={{
                        ...styles.thumbnail,
                        border:
                          selectedImage === item.main_image
                            ? "2px solid #0078d4"
                            : "none",
                      }}
                      onClick={() =>
                        setSelectedImage(
                          item.main_image.startsWith("http")
                            ? item.main_image
                            : `http://localhost:8000${item.main_image}`
                        )
                      }
                    />

                    {/*  Κουμπί διαγραφής (μόνο για ιδιοκτήτη) */}
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteImage(item.main_image_id)}
                        style={styles.deleteImageBtn}
                        title="Διαγραφή κύριας εικόνας"
                      >
                        ✖
                      </button>
                    )}
                  </div>
                )}

                {/* Υπόλοιπες φωτογραφίες */}
                {item.images.map((img, idx) => (
                  <div key={idx} style={styles.thumbnailWrapper}>
                    <img
                      src={
                        img.image.startsWith("http")
                          ? img.image
                          : `http://localhost:8000${img.image}`
                      }
                      alt={`Thumbnail ${idx + 1}`}
                      style={{
                        ...styles.thumbnail,
                        border:
                          selectedImage ===
                          (img.image.startsWith("http")
                            ? img.image
                            : `http://localhost:8000${img.image}`)
                            ? "2px solid #0078d4"
                            : "none",
                      }}
                      onClick={() =>
                        setSelectedImage(
                          img.image.startsWith("http")
                            ? img.image
                            : `http://localhost:8000${img.image}`
                        )
                      }
                    />

                    {/* Κουμπί διαγραφής (μόνο για ιδιοκτήτη) */}
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        style={styles.deleteImageBtn}
                        title="Διαγραφή εικόνας"
                      >
                        ✖
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.noImage}>Χωρίς εικόνες</div>
          )}

          {/* Ανέβασμα εικόνας (μόνο για ιδιοκτήτη) */}
          {isOwner && (
            <div style={{ marginTop: "15px" }}>
              {/* Κουμπί που εμφανίζει/κρύβει το file input */}
              {!showFileInput ? (
                <button
                  onClick={() => setShowFileInput(true)}
                  style={styles.uploadBtn}
                >
                  Ανέβασε νέα φωτογραφία
                </button>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ marginBottom: "5px" }}
                  />

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={handleUploadImage}
                      style={{
                        ...styles.uploadBtn,
                        background: "#28a745",
                      }}
                    >
                      Επιβεβαίωση
                    </button>
                    <button
                      onClick={() => {
                        setShowFileInput(false);
                        setNewImage(null);
                        setPreview(null);
                      }}
                      style={{
                        ...styles.uploadBtn,
                        background: "#6c757d",
                      }}
                    >
                      Άκυρο
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Πληροφορίες δεξιά */}
        <div style={styles.infoSection}>
          <div style={styles.headerRow}>
            {/* Avatar χρήστη */}
            <div style={styles.ownerInfo}>
              {item.owner_profile_image ? (
                <img
                  src={item.owner_profile_image}
                  alt="Avatar"
                  style={styles.avatar}
                />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  <FaUser />
                </div>
              )}
              <div style={styles.ownerTextBlock}>
                <div style={styles.ownerNameRow}>
                  <Link
                    to={`/profile/${item.owner_id}`}
                    style={styles.ownerLink}
                  >
                    <strong>{item.owner_username || "Άγνωστος"}</strong>
                  </Link>

                  {/* Ποσοστό αξιολογήσεων */}
                  {item.owner_rating_percent !== undefined && (
                    <span style={styles.ratingBadge}>
                      <FaStar color="#facc15" /> {item.owner_rating_percent}%
                      θετικές
                    </span>
                  )}
                </div>

                <p style={styles.ownerRole}>Ιδιοκτήτης αντικειμένου</p>
              </div>
            </div>

            {/* Δεξιά: Αγαπημένα + Προβολές */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Κουμπί αγαπημένων (δεν εμφανίζεται στον ιδιοκτήτη) */}
              {!isOwner && (
                <button
                  onClick={handleToggleFavorite}
                  style={styles.favoriteBtn}
                  title={
                    item.is_favorite
                      ? "Αφαίρεση από τα αγαπημένα"
                      : "Προσθήκη στα αγαπημένα"
                  }
                >
                  {item.is_favorite ? <FaHeart /> : <FaRegHeart />}
                </button>
              )}

              {/* Προβολές */}
              {item.views !== undefined && (
                <div style={styles.viewsBox}>
                  <FaEye />{" "}
                  <span style={{ fontWeight: "bold" }}>{item.views}</span>{" "}
                  προβολές
                </div>
              )}
            </div>
          </div>

          <h1 style={styles.title}>{item.title}</h1>

          <p style={styles.desc}>{item.description}</p>

          {/* Βασικά χαρακτηριστικά */}
          <div style={styles.detailsGrid}>
            <p>
              <strong>
                <FaBoxOpen /> Τύπος:
              </strong>{" "}
              {item.transaction_type === "exchange"
                ? "Ανταλλαγή"
                : item.transaction_type === "loan"
                ? "Δανεισμός"
                : "Ανταλλαγή ή Δανεισμός"}
            </p>
            <p>
              <strong>
                <FaTruck /> Παράδοση:
              </strong>{" "}
              {item.delivery_method === "in_person"
                ? "Χέρι με χέρι"
                : item.delivery_method === "shipping"
                ? "Αποστολή με courier"
                : item.delivery_method === "pickup_point"
                ? "Σημείο συνάντησης"
                : "Άλλο"}
            </p>
            <p>
              <strong>
                <FaCalendarAlt /> Κατάσταση:
              </strong>{" "}
              {item.available ? (
                <span style={{ color: "#28a745" }}>Διαθέσιμο</span>
              ) : (
                <span style={{ color: "#d9534f" }}>Μη διαθέσιμο</span>
              )}
            </p>
          </div>

          {/* Όροι Δανεισμού */}
          {item.transaction_type === "loan" && item.terms && (
            <div style={styles.termsBox}>
              <h3>
                <FaScroll /> Όροι Δανεισμού
              </h3>
              <p style={styles.termsText}>{item.terms}</p>
            </div>
          )}

          {/* Κουμπιά για ιδιοκτήτη */}
          {isOwner && !isEditing && (
            <div style={styles.actionsRow}>
              <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
                Επεξεργασία
              </button>
              <button onClick={handleDelete} style={styles.deleteBtn}>
                Διαγραφή
              </button>
            </div>
          )}

          {/* Λειτουργία επεξεργασίας */}
          {isOwner && isEditing && (
            <div style={{ ...styles.formBox, marginTop: "20px" }}>
              <h3 style={{ marginBottom: "10px" }}>
                <FaTools /> Επεξεργασία αντικειμένου
              </h3>

              {/* Διαθεσιμότητα */}
              <div style={styles.availabilityRow}>
                <p style={{ margin: 0 }}>
                  <strong>Κατάσταση:</strong>{" "}
                  {item.available ? (
                    <>
                      <FaCheckCircle
                        style={{ color: "#28a745", marginRight: "6px" }}
                      />
                      Διαθέσιμο
                    </>
                  ) : (
                    <>
                      <FaTimesCircle
                        style={{ color: "#d9534f", marginRight: "6px" }}
                      />
                      Μη διαθέσιμο
                    </>
                  )}
                </p>
                <button
                  onClick={async () => {
                    if (item.is_in_use) {
                      toast.error(
                        "Το αντικείμενο χρησιμοποιείται σε συναλλαγή!"
                      );
                      return;
                    }
                    try {
                      const res = await authFetch(
                        `http://localhost:8000/api/items/${id}/`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ available: !item.available }),
                        }
                      );
                      if (!res.ok)
                        throw new Error("Αποτυχία αλλαγής διαθεσιμότητας");
                      toast.success(
                        item.available
                          ? "Το αντικείμενο έγινε μη διαθέσιμο."
                          : "Το αντικείμενο έγινε διαθέσιμο ξανά!"
                      );
                      fetchItem();
                    } catch (error) {
                      console.error(error);
                      toast.error("❌ Σφάλμα κατά την αλλαγή διαθεσιμότητας");
                    }
                  }}
                  disabled={item.is_in_use}
                  style={{
                    ...styles.toggleButtonSmall,
                    opacity: item.is_in_use ? 0.6 : 1,
                    cursor: item.is_in_use ? "not-allowed" : "pointer",
                    background: item.available ? "#ff4d4f" : "#28a745",
                  }}
                >
                  {item.available ? " Κάνε μη διαθέσιμο" : " Επανενεργοποίησε"}
                </button>
              </div>

              {item.is_in_use && (
                <p style={{ color: "#999", fontSize: "0.9rem" }}>
                  Δεν μπορεί να αλλαχθεί γιατί χρησιμοποιείται σε ενεργή
                  συναλλαγή.
                </p>
              )}

              {/* Τίτλος */}
              <label>Τίτλος:</label>
              <input
                type="text"
                value={editedItem.title || ""}
                onChange={(e) =>
                  setEditedItem({ ...editedItem, title: e.target.value })
                }
                style={styles.input}
                placeholder="Π.χ. iPhone 12 Pro - Καλή κατάσταση"
              />

              {/* Περιγραφή */}
              <label>Περιγραφή:</label>
              <textarea
                value={editedItem.description || ""}
                onChange={(e) =>
                  setEditedItem({ ...editedItem, description: e.target.value })
                }
                style={styles.textarea}
                placeholder="Περιγραφή αντικειμένου..."
              />

              <label>Τύπος Συναλλαγής:</label>
              <select
                value={editedItem.transaction_type}
                onChange={(e) =>
                  setEditedItem({
                    ...editedItem,
                    transaction_type: e.target.value,
                  })
                }
                style={styles.select}
              >
                <option value="exchange">Ανταλλαγή</option>
                <option value="loan">Δανεισμός</option>
                <option value="either">Και τα δύο</option>
              </select>

              <label>Τρόπος Παράδοσης:</label>
              <select
                value={editedItem.delivery_method || "in_person"}
                onChange={(e) =>
                  setEditedItem({
                    ...editedItem,
                    delivery_method: e.target.value,
                  })
                }
                style={styles.select}
              >
                <option value="in_person">Χέρι με χέρι</option>
                <option value="shipping">Αποστολή με courier</option>
                <option value="pickup_point">Σημείο συνάντησης</option>
              </select>

              <div style={styles.actionsRow}>
                <button onClick={handleSave} style={styles.saveBtn}>
                  Αποθήκευση
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={styles.cancelBtn}
                >
                  Άκυρο
                </button>
              </div>
            </div>
          )}

          {/* Επικοινωνία με χρήστη */}
          {!isOwner && (
            <div style={{ marginTop: "10px" }}>
              <button onClick={handleOpenChat} style={styles.chatBtn}>
                Επικοινωνία με τον χρήστη
              </button>
            </div>
          )}

          {/* Modal Chat Overlay */}
          {showChat && activeChatUser && (
            <div style={styles.chatOverlay}>
              <div style={styles.chatModal}>
                <div style={styles.chatHeader}>
                  <h3 style={{ margin: 0 }}>
                    Συνομιλία με {activeChatUser.username}
                  </h3>
                  <button
                    onClick={() => setShowChat(false)}
                    style={styles.closeChatBtn}
                  >
                    ✖
                  </button>
                </div>

                {/* Εμφάνιση ChatBox */}
                <ChatBox
                  receiverId={activeChatUser.id}
                  itemId={item.id} // 🆕
                  onClose={() => setShowChat(false)}
                />
              </div>
            </div>
          )}

          {/* Φόρμα συναλλαγής */}
          {!isOwner && item.available && (
            <div style={styles.transactionSection}>
              {showTransactionForm ? (
                <form onSubmit={handleSendTransaction} style={styles.formBox}>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    style={styles.select}
                    required
                  >
                    <option value="">-- Επιλογή τύπου --</option>
                    {availableOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {transactionType === "exchange" && (
                    <p style={{ textAlign: "left", color: "#444" }}>
                      Ο ιδιοκτήτης θα επιλέξει ποιο από τα αντικείμενά σου
                      επιθυμεί για ανταλλαγή.
                    </p>
                  )}

                  {transactionType === "loan" && (
                    <>
                      <label>Ημερομηνία Έναρξης:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        style={styles.input}
                      />
                      <label>Ημερομηνία Λήξης:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        style={styles.input}
                      />
                      {item.terms && (
                        <label
                          style={{
                            display: "block",
                            textAlign: "left",
                            marginBottom: "10px",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            required
                          />{" "}
                          Αποδέχομαι τους όρους δανεισμού
                        </label>
                      )}
                    </>
                  )}

                  <textarea
                    placeholder="Προαιρετικό μήνυμα..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={styles.textarea}
                  />

                  <div style={styles.actionsRow}>
                    <button
                      type="submit"
                      style={{
                        ...styles.saveBtn,
                        opacity:
                          item.terms &&
                          transactionType === "loan" &&
                          !acceptedTerms
                            ? 0.6
                            : 1,
                      }}
                      disabled={
                        item.terms &&
                        transactionType === "loan" &&
                        !acceptedTerms
                      }
                    >
                      Αποστολή
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTransactionForm(false)}
                      style={styles.cancelBtn}
                    >
                      Άκυρο
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowTransactionForm(true)}
                  style={styles.transactionBtn}
                >
                  <FaPaperPlane /> Αίτημα συναλλαγής
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="full"
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: "10px",
              boxShadow: "0 0 20px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}

      {/* Επιστροφή στη λίστα (κάτω δεξιά) */}
      <button
        onClick={() => {
          if (location.state?.fromHome) {
            navigate("/", { state: { resetHome: true } });
          } else if (
            location.state?.fromSearch &&
            location.state?.searchState
          ) {
            navigate("/", {
              state: {
                returnToSearch: true,
                searchState: location.state.searchState,
              },
            });
          } else {
            navigate("/", { state: { resetHome: true } });
          }
        }}
        style={styles.floatingBackBtn}
        title="Επιστροφή στη λίστα"
      >
        <FaChevronLeft /> Επιστροφή
      </button>
    </motion.div>
  );
}

// Styling
const styles = {
  /* Full-screen φόντο */
  wrapper: {
    width: "100vw",
    minHeight: "100vh",
    background: "#f8f9fa",
    fontFamily: "Inter, Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "0",
    overflowX: "hidden",
  },

  /* Πλαίσιο περιεχομένου που καλύπτει όλη την οθόνη */
  cardContainer: {
    width: "100vw", // γεμίζει όλη την οθόνη
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "white",
    borderRadius: "0",
    boxShadow: "none",
    padding: "40px 60px",
    margin: "0",
  },

  /* Εικόνα αριστερά */
  imageSection: {
    flex: "1 1 45%",
    minWidth: "350px",
  },
  mainImage: {
    width: "100%",
    maxWidth: "400px",
    maxHeight: "300px",
    borderRadius: "12px",
    objectFit: "cover",
    margin: "0 auto",
    display: "block",
    boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
  },

  noImage: {
    width: "100%",
    height: "400px",
    borderRadius: "12px",
    background: "#eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    fontSize: "1.1rem",
  },

  /* Πληροφορίες δεξιά */
  infoSection: {
    flex: "1 1 50%",
    minWidth: "350px",
    paddingLeft: "30px",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "10px",
    color: "#222",
    fontWeight: "600",
  },
  owner: { fontSize: "1rem", marginBottom: "15px", color: "#555" },
  desc: {
    fontSize: "1.05rem",
    color: "#444",
    lineHeight: "1.6",
    marginBottom: "25px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    fontSize: "1rem",
    marginBottom: "20px",
  },

  /* Όροι δανεισμού */
  termsBox: {
    background: "#f7f9fc",
    border: "1px solid #d9e2ec",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "20px",
  },
  termsText: { color: "#555", whiteSpace: "pre-wrap" },

  /* Επεξεργασία / Φόρμα */
  formBox: {
    background: "white",
    borderRadius: "16px",
    padding: "30px 28px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    animation: "fadeIn 0.3s ease",
    fontFamily: "'Poppins', 'Inter', sans-serif",
    color: "#1f2937",
  },

  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    fontSize: "1rem",
    color: "#333",
    transition: "all 0.2s ease",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    fontSize: "1rem",
    color: "#333",
    transition: "all 0.2s ease",
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    padding: "12px 14px",
    background: "#f9fafb",
    fontFamily: "'Poppins', 'Inter', sans-serif",
    fontSize: "0.97rem",
    fontWeight: 400,
    color: "#1f2937",
    lineHeight: "1.6",
    letterSpacing: "0.2px",
    resize: "vertical",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
  },

  /* Κουμπιά */
  buttonsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "10px",
  },
  actionsRow: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },
  editBtn: {
    flex: "unset",
    background: "linear-gradient(90deg, #3b82f6, #2563eb)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "8px 16px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.95rem",
    boxShadow: "0 3px 8px rgba(37,99,235,0.25)",
    transition: "all 0.25s ease",
    minWidth: "120px",
  },
  deleteBtn: {
    flex: "unset",
    background: "linear-gradient(90deg, #ef4444, #dc2626)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "8px 16px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.95rem",
    boxShadow: "0 3px 8px rgba(239,68,68,0.25)",
    transition: "all 0.25s ease",
    minWidth: "120px",
  },
  saveBtn: {
    flex: "unset",
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "8px 18px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.95rem",
    boxShadow: "0 3px 8px rgba(34,197,94,0.25)",
    transition: "all 0.25s ease",
    minWidth: "120px",
  },
  cancelBtn: {
    flex: "unset",
    background: "linear-gradient(90deg, #9ca3af, #6b7280)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "8px 18px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.95rem",
    boxShadow: "0 3px 8px rgba(156,163,175,0.25)",
    transition: "all 0.25s ease",
    minWidth: "120px",
  },
  transactionBtn: {
    background: "linear-gradient(90deg, #16a34a, #22c55e)",
    color: "white",
    border: "none",
    borderRadius: "14px",
    padding: "14px 24px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 5px 12px rgba(34,197,94,0.4)",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
  },
  uploadBtn: {
    background: "linear-gradient(90deg, #17a2b8, #0d8fa6)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px", // 🔹 μικρότερο padding
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    boxShadow: "0 3px 8px rgba(23,162,184,0.3)",
    transition: "all 0.25s ease",
    minWidth: "130px", // 🔹 προαιρετικό σταθερό πλάτος
  },

  /* Εμφάνιση σφαλμάτων / φόρτωσης / πλοήγηση */
  loading: { textAlign: "center", marginTop: "80px" },
  error: { color: "red", textAlign: "center", marginTop: "50px" },
  transactionSection: { marginTop: "25px" },
  backBtn: {
    display: "block",
    margin: "40px auto 0",
    color: "#0078d4",
    background: "none",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1.05rem",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap",
  },

  ownerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  ownerTextBlock: {
    display: "flex",
    flexDirection: "column",
  },

  ownerNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  ownerLink: {
    color: "#0078d4",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "1rem",
  },

  ratingBadge: {
    background: "#f7faff",
    border: "1px solid #d0e0ff",
    borderRadius: "8px",
    padding: "3px 8px",
    fontSize: "0.85rem",
    color: "#0078d4",
    fontWeight: "600",
  },

  avatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    objectFit: "cover",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },

  avatarPlaceholder: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background: "#ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    color: "#666",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },

  ownerName: {
    margin: 0,
    fontWeight: "bold",
    color: "#0078d4",
  },

  ownerRole: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#888",
  },

  viewsBox: {
    fontSize: "0.95rem",
    color: "#444",
    background: "#f0f4f8",
    borderRadius: "8px",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },

  chatBtn: {
    background: "#0078d4",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
    transition: "0.2s",
    marginTop: "10px",
  },

  chatOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    pointerEvents: "auto",
  },

  chatModal: {
    background: "#fff",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "500px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
    overflow: "hidden",
    zIndex: 999999,
    pointerEvents: "auto",
  },

  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0078d4",
    color: "white",
    padding: "12px 16px",
  },

  closeChatBtn: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "18px",
    cursor: "pointer",
  },
  galleryContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "15px",
  },

  mainImageFrame: {
    width: "100%",
    maxWidth: "900px",
    aspectRatio: "5 / 3",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
  },

  mainGalleryImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "100%",
    height: "100%",
    objectFit: "contain",
    userSelect: "none",
    cursor: "pointer",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
  },

  thumbnailRow: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "10px",
  },

  thumbnail: {
    width: "80px",
    height: "60px",
    objectFit: "cover",
    borderRadius: "6px",
    cursor: "pointer",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    transition: "transform 0.2s ease, border 0.2s ease",
  },
  floatingBackBtn: {
    position: "fixed",
    bottom: "25px",
    right: "30px",
    background: "#0078d4",
    color: "white",
    border: "none",
    borderRadius: "30px",
    padding: "12px 20px",
    fontSize: "0.95rem",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    transition: "background 0.2s ease, transform 0.2s ease",
    zIndex: 999,
  },
  thumbnailWrapper: {
    position: "relative",
    display: "inline-block",
  },

  deleteImageBtn: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    background: "#ff4d4f",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    cursor: "pointer",
    fontSize: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    transition: "0.2s",
  },
  toggleButtonSmall: {
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px",
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "white",
    cursor: "pointer",
    boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
    transition: "all 0.25s ease",
    minWidth: "150px",
  },
  favoriteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1.4rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
    color: "#e11d48", // λίγο ροζ/κόκκινο
    transition: "transform 0.15s ease, opacity 0.15s ease",
  },
};

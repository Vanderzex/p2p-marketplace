import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import ChatBox from "./ChatBox";
import MapSelector from "./MapSelector";
import {
  FaArrowRight,
  FaArrowLeft,
  FaExchangeAlt,
  FaHandHoldingHeart,
  FaClock,
  FaCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaComments,
  FaMapMarkerAlt,
  FaTruck,
  FaUndo,
  FaHistory,
  FaUser,
  FaStar,
  FaTimes,
  FaGift,
  FaFlagCheckered,
  FaFileAlt,
  FaHourglassHalf,
} from "react-icons/fa";

/**
 * MyTransactionsPage
 * - Εισερχόμενα/Εξερχόμενα/Ιστορικό
 * - Κουμπιά ενεργειών ανά ρόλο & κατάσταση
 * - Popup modal για επιλογή αντικειμένου (exchange)
 * - Δανεισμός: αποδοχή με ημερομηνίες, επιστροφή, ολοκλήρωση
 * - Αξιολόγηση για completed
 * - Chat (αιωρούμενο)
 */
export default function MyTransactionsPage() {
  const { user, authFetch } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [itemsByUser, setItemsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review state
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Tabs & Chat
  const [activeTab, setActiveTab] = useState("active");
  const [activeChat, setActiveChat] = useState(null);
  const [pendingChatId, setPendingChatId] = useState(null);
  const [subTab, setSubTab] = useState("incoming");

  // Exchange modal
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [exchangeModalTx, setExchangeModalTx] = useState(null);

  const [showMeetingLocationIds, setShowMeetingLocationIds] = useState(
    new Set()
  );

  // Loan accept inline inputs (ανά συναλλαγή)
  const [loanDates, setLoanDates] = useState({}); // { [txId]: { start_date, end_date } }

  const [expandedId, setExpandedId] = useState(null);

  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [searchParams] = useSearchParams();

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedTxForMap, setSelectedTxForMap] = useState(null);

  const [localCompleted, setLocalCompleted] = useState(new Set());

  // Handler: όταν ο χρήστης επιλέξει θέση στον χάρτη
  const handleLocationSelect = async (lat, lng) => {
    if (!selectedTxForMap) return;
    try {
      await authFetch(
        `http://localhost:8000/api/transactions/${selectedTxForMap.id}/propose_location/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meeting_lat: lat, meeting_lng: lng }),
        }
      );
      toast.success("Η τοποθεσία προτάθηκε με επιτυχία!");
      setShowMapModal(false);
      setSelectedTxForMap(null);
    } catch (err) {
      toast.error("⚠️ Σφάλμα αποστολής τοποθεσίας");
    }
  };

  // Owner: Επιβεβαίωση αποστολής (courier)
  const handleMarkShipped = async (txId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/mark_shipped/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      toast.success("Επιβεβαιώθηκε η αποστολή!");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα κατά την επιβεβαίωση αποστολής");
    }
  };

  // Requester: Επιβεβαίωση παραλαβής (courier)
  const handleMarkReceived = async (txId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/mark_received/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      toast.success("Επιβεβαιώθηκε η παραλαβή!");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα κατά την επιβεβαίωση παραλαβής");
    }
  };

  // Φόρτωση συναλλαγών
  const fetchTransactions = async (type = subTab, url = null) => {
    if (!user) return;
    setLoading(true);

    try {
      // Αν δεν έχει δοθεί URL (π.χ. από pagination), φτιάχνει το endpoint με βάση το subTab
      let endpoint = url;
      if (!endpoint) {
        const base = "http://localhost:8000/api/transactions/";
        if (type === "history") {
          endpoint = `${base}?status__in=completed,rejected`;
        } else {
          endpoint = `${base}?type=${type}`;
        }
      }

      const res = await authFetch(endpoint);
      if (!res.ok) throw new Error("Σφάλμα φόρτωσης συναλλαγών");
      const data = await res.json();

      // Ανταπόκριση pagination (DRF)
      let txList = Array.isArray(data) ? data : data.results || [];

      // Φιλτράρισμα μόνο για το ιστορικό
      if (type === "history") {
        txList = txList.filter(
          (tx) => tx.status === "completed" || tx.status === "rejected"
        );
      }

      setTransactions(txList);
      setNextPage(data.next || null);
      setPrevPage(data.previous || null);
      setError(null);
    } catch (err) {
      console.error("⚠️ Σφάλμα:", err);
      setError("⚠️ Αποτυχία φόρτωσης συναλλαγών");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchTransactions("history");
    } else {
      fetchTransactions(subTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subTab, activeTab]);

  // Αν υπάρχει ?chat= ή ?transaction= ή ?tx= στο URL → αποθήκευση προσωρινά
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatParam = params.get("chat");
    const txParam = params.get("transaction") || params.get("tx");
    const target = chatParam || txParam;
    if (target) {
      console.log("📩 URL param:", target);
      setPendingChatId(target);
    }
  }, []);

  // Μόλις φορτωθούν οι συναλλαγές → άνοιγμα ChatBox
  useEffect(() => {
    if (!pendingChatId || transactions.length === 0) return;

    const tx = transactions.find((t) => String(t.id) === String(pendingChatId));
    if (tx) {
      const receiverId =
        tx.owner?.id === user?.id ? tx.requester?.id : tx.owner?.id;

      console.log("Άνοιγμα chat για:", tx.id, "receiver:", receiverId);

      setActiveChat({ transactionId: tx.id, receiverId });
      toast.success(`Άνοιξε η συνομιλία για τη συναλλαγή #${tx.id}`);
      setPendingChatId(null);
    } else {
      console.warn("⚠️ Δεν βρέθηκε συναλλαγή με ID:", pendingChatId);
    }
  }, [transactions, pendingChatId, user]);

  // Φόρτωση αντικειμένων αιτούντος (για modal επιλογής ανταλλαγής)
  const loadRequesterItems = async (username) => {
    if (!username || itemsByUser[username]) return;
    try {
      const res = await authFetch(
        `http://localhost:8000/api/items/of_user/${username}/?mode=exchange`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItemsByUser((prev) => ({ ...prev, [username]: data }));
    } catch {
      toast.error("⚠️ Αποτυχία φόρτωσης αντικειμένων του αιτούντος");
    }
  };

  // ===== Handlers για actions (API) =====

  // Owner: Αποδοχή (για loan απαιτεί ημερομηνίες)
  const handleAccept = async (tx) => {
    try {
      const body = { status: "accepted" };

      if (tx.transaction_type === "loan") {
        // Παίρνει ημερομηνίες από το state ή από το ίδιο το αντικείμενο
        const dates = loanDates[tx.id] || {};
        const start = dates.start_date || tx.start_date;
        const end = dates.end_date || tx.end_date;

        if (!start || !end) {
          toast.error("🔔 Συμπλήρωσε ημερομηνίες δανεισμού");
          return;
        }

        body.start_date = start;
        body.end_date = end;
      }

      const res = await authFetch(
        `http://localhost:8000/api/transactions/${tx.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Αποτυχία αποδοχής");
      toast.success("✅ Η αίτηση αποδέχθηκε");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα αποδοχής");
    }
  };

  // Owner: Απόρριψη
  const handleReject = async (txId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "rejected" }),
        }
      );
      if (!res.ok) throw new Error("Αποτυχία απόρριψης");
      toast("Η αίτηση απορρίφθηκε");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα απόρριψης");
    }
  };

  // Owner: Άνοιγμα modal επιλογής αντικειμένου (exchange)
  const openSelectItemModal = async (tx) => {
    await loadRequesterItems(tx.requester?.username);
    setExchangeModalTx(tx);
    setExchangeModalOpen(true);
  };

  // Owner: Επιλογή αντικειμένου ανταλλαγής
  const handleSelectExchangeItem = async (txId, selectedItemId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/select_exchange_item/`,
        {
          method: "POST",
          body: JSON.stringify({ selected_item_id: selectedItemId }),
        }
      );
      if (!res.ok) throw new Error("Αποτυχία επιλογής αντικειμένου");
      toast.success("Επιλέχθηκε αντικείμενο για ανταλλαγή");
      setExchangeModalOpen(false);
      setExchangeModalTx(null);
      fetchTransactions();
    } catch {
      toast.error("Σφάλμα επιλογής αντικειμένου");
    }
  };

  // Requester: Επιβεβαίωση ανταλλαγής
  const handleConfirmExchange = async (txId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/confirm_exchange/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Αποτυχία επιβεβαίωσης");
      toast.success("✅ Η ανταλλαγή επιβεβαιώθηκε");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα επιβεβαίωσης");
    }
  };

  // Requester: Απόρριψη ανταλλαγής (σε pending_confirmation)
  const handleRejectExchange = async (txId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/reject_exchange/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Αποτυχία απόρριψης ανταλλαγής");
      toast("🚫 Η ανταλλαγή απορρίφθηκε");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα απόρριψης ανταλλαγής");
    }
  };

  // Requester (loan): Δήλωση επιστροφής
  const handleReturnLoan = async (txId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/confirm_return/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Αποτυχία δήλωσης επιστροφής");
      toast("Δήλωσες επιστροφή");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα δήλωσης επιστροφής");
    }
  };

  // Owner: Ολοκλήρωση συναλλαγής
  const handleComplete = async (txId) => {
    // Προσθήκη τοπικού flag για να κρυφτεί αμέσως το κουμπί
    setLocalCompleted((prev) => new Set([...prev, txId]));

    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/mark_completed/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Αποτυχία ολοκλήρωσης");
      toast.success("Η συναλλαγή ολοκληρώθηκε");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα ολοκλήρωσης");
      // Αν αποτύχει, επαναφέρουμε το flag
      setLocalCompleted((prev) => {
        const copy = new Set(prev);
        copy.delete(txId);
        return copy;
      });
    }
  };

  // Review submit
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    try {
      const res = await authFetch("http://localhost:8000/api/reviews/", {
        method: "POST",
        body: JSON.stringify({
          transaction: selectedTransaction.id,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Αποτυχία αποστολής αξιολόγησης");

      toast.success("✅ Η αξιολόγηση καταχωρήθηκε!");
      setSelectedTransaction(null);
      setRating(5);
      setComment("");
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || "⚠️ Σφάλμα κατά την αξιολόγηση");
    }
  };

  // ===== Παράγωγες λίστες =====

  if (loading) return <p>Φόρτωση συναλλαγών...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={styles.container}>
      {/* --- Header Section --- */}
      <div style={styles.headerBar}>
        <h1 style={styles.pageTitle}>
          <FaHistory /> Οι συναλλαγές μου
        </h1>

        <div style={styles.mainTabs}>
          <button
            style={
              activeTab === "active" ? styles.activeMainTab : styles.mainTab
            }
            onClick={() => setActiveTab("active")}
          >
            <FaClock /> Ενεργές
          </button>
          <button
            style={
              activeTab === "history" ? styles.activeMainTab : styles.mainTab
            }
            onClick={() => setActiveTab("history")}
          >
            <FaCheckCircle /> Ολοκληρωμένες / Απορριφθείσες
          </button>
        </div>

        {activeTab === "active" && (
          <div style={styles.subTabs}>
            <button
              style={
                subTab === "incoming" ? styles.activeSubTab : styles.subTab
              }
              onClick={() => setSubTab("incoming")}
            >
              <FaUser /> Εισερχόμενα
            </button>
            <button
              style={
                subTab === "outgoing" ? styles.activeSubTab : styles.subTab
              }
              onClick={() => setSubTab("outgoing")}
            >
              <FaExchangeAlt /> Εξερχόμενα
            </button>
          </div>
        )}
      </div>

      {/* Ενεργές */}
      {activeTab === "active" && (
        <>
          {/* Εισερχόμενα */}
          {subTab === "incoming" && (
            <section style={styles.section}>
              {transactions.length === 0 ? (
                <p>Δεν υπάρχουν εισερχόμενα αιτήματα.</p>
              ) : (
                transactions.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    tx={tx}
                    user={user}
                    itemsByUser={itemsByUser}
                    setActiveChat={setActiveChat}
                    onAccept={() => handleAccept(tx)}
                    onReject={() => handleReject(tx.id)}
                    onOpenSelect={() => openSelectItemModal(tx)}
                    onComplete={() => handleComplete(tx.id)}
                    loanDates={loanDates[tx.id] || {}}
                    setLoanDates={(dates) =>
                      setLoanDates((prev) => ({ ...prev, [tx.id]: dates }))
                    }
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    setSelectedTxForMap={setSelectedTxForMap}
                    setShowMapModal={setShowMapModal}
                    localCompleted={localCompleted}
                    onMarkShipped={() => handleMarkShipped(tx.id)}
                    onMarkReceived={() => handleMarkReceived(tx.id)}
                    showMeetingLocationIds={showMeetingLocationIds}
                    setShowMeetingLocationIds={setShowMeetingLocationIds}
                  />
                ))
              )}
            </section>
          )}

          {/* Εξερχόμενα */}
          {subTab === "outgoing" && (
            <section style={styles.section}>
              {transactions.length === 0 ? (
                <p>Δεν υπάρχουν εξερχόμενα αιτήματα.</p>
              ) : (
                transactions.map((tx) => (
                  <OutgoingCard
                    key={tx.id}
                    tx={tx}
                    user={user}
                    setActiveChat={setActiveChat}
                    onConfirmExchange={() => handleConfirmExchange(tx.id)}
                    onRejectExchange={() => handleRejectExchange(tx.id)}
                    onReturnLoan={() => handleReturnLoan(tx.id)}
                    onComplete={() => handleComplete(tx.id)}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    localCompleted={localCompleted}
                    setSelectedTxForMap={setSelectedTxForMap}
                    setShowMapModal={setShowMapModal}
                    onMarkReceived={() => handleMarkReceived(tx.id)}
                    onMarkShipped={() => handleMarkShipped(tx.id)}
                    showMeetingLocationIds={showMeetingLocationIds}
                    setShowMeetingLocationIds={setShowMeetingLocationIds}
                  />
                ))
              )}

              <PaginationControls
                nextPage={nextPage}
                prevPage={prevPage}
                onPageChange={(url) => fetchTransactions("outgoing", url)}
              />
            </section>
          )}
        </>
      )}

      {/* Ιστορικό */}
      {activeTab === "history" && (
        <section style={styles.section}>
          <h2>
            <FaCheckCircle /> Ολοκληρωμένες / Απορριφθείσες
          </h2>

          {transactions.length === 0 ? (
            <p>Δεν υπάρχουν ολοκληρωμένες ή απορριφθείσες συναλλαγές.</p>
          ) : (
            <>
              {transactions.map((tx) => (
                <div key={tx.id} style={styles.card}>
                  {/* Ανταλλαγή ή Κανονικό αντικείμενο */}
                  {tx.transaction_type === "exchange" ? (
                    <div
                      style={{
                        background: "rgba(0, 123, 255, 0.05)",
                        border: "1px solid rgba(0,123,255,0.2)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        marginTop: "8px",
                        lineHeight: "1.6",
                      }}
                    >
                      {/* Γραμμή: Ανταλλαγή με χρήστη */}
                      <p style={{ margin: 0 }}>
                        <FaExchangeAlt color="#007bff" /> Ανταλλαγή με χρήστη{" "}
                        <Link
                          to={`/profile/${
                            tx.requester?.username === user?.username
                              ? tx.owner?.id
                              : tx.requester?.id
                          }`}
                          style={styles.link}
                        >
                          {tx.requester?.username === user?.username
                            ? tx.owner?.username
                            : tx.requester?.username}
                        </Link>
                      </p>

                      {/* Γραμμή: ο χρήστης έδωσε / έλαβε */}
                      <p style={{ margin: "6px 0 0 0" }}>
                        {tx.requester?.username === user?.username ? (
                          <>
                            <strong>{user.username}</strong> έδωσε{" "}
                            {tx.requested_item ? (
                              <Link
                                to={`/items/${tx.requested_item}`}
                                style={{
                                  ...styles.link,
                                  color: "#007bff",
                                  fontWeight: 500,
                                }}
                              >
                                {tx.requested_item_title || "—"}
                              </Link>
                            ) : (
                              <span style={{ color: "#007bff" }}>
                                {tx.requested_item_title || "—"}
                              </span>
                            )}
                            , έλαβε{" "}
                            {tx.item ? (
                              <Link
                                to={`/items/${tx.item}`}
                                style={{
                                  ...styles.link,
                                  color: "#28a745",
                                  fontWeight: 500,
                                }}
                              >
                                {tx.item_title || "—"}
                              </Link>
                            ) : (
                              <span style={{ color: "#28a745" }}>
                                {tx.item_title || "—"}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <strong>{user.username}</strong> έδωσε{" "}
                            {tx.item ? (
                              <Link
                                to={`/items/${tx.item}`}
                                style={{
                                  ...styles.link,
                                  color: "#007bff",
                                  fontWeight: 500,
                                }}
                              >
                                {tx.item_title || "—"}
                              </Link>
                            ) : (
                              <span style={{ color: "#007bff" }}>
                                {tx.item_title || "—"}
                              </span>
                            )}
                            , έλαβε{" "}
                            {tx.requested_item ? (
                              <Link
                                to={`/items/${tx.requested_item}`}
                                style={{
                                  ...styles.link,
                                  color: "#28a745",
                                  fontWeight: 500,
                                }}
                              >
                                {tx.requested_item_title || "—"}
                              </Link>
                            ) : (
                              <span style={{ color: "#28a745" }}>
                                {tx.requested_item_title || "—"}
                              </span>
                            )}
                          </>
                        )}
                      </p>

                      {/* Ημερομηνία ολοκλήρωσης */}
                      {tx.end_date && (
                        <p style={{ marginTop: "8px", color: "#555" }}>
                          <FaClock
                            style={{ marginRight: "6px", color: "#007bff" }}
                          />
                          Ολοκληρώθηκε στις{" "}
                          <strong>
                            {new Date(tx.end_date).toLocaleDateString("el-GR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p>
                        <strong>Αντικείμενο:</strong>{" "}
                        {tx.item ? (
                          <Link to={`/items/${tx.item}`} style={styles.link}>
                            {tx.item_title}
                          </Link>
                        ) : (
                          "(χωρίς τίτλο)"
                        )}
                      </p>

                      {/* Από / Προς μόνο για δανεισμό (clickable users) */}
                      {tx.transaction_type === "loan" && (
                        <p>
                          <strong>Από:</strong>{" "}
                          <Link
                            to={`/profile/${tx.owner?.id}`}
                            style={{ ...styles.link, fontWeight: 500 }}
                          >
                            {tx.owner?.username}
                          </Link>{" "}
                          → <strong>Προς:</strong>{" "}
                          <Link
                            to={`/profile/${tx.requester?.id}`}
                            style={{ ...styles.link, fontWeight: 500 }}
                          >
                            {tx.requester?.username}
                          </Link>
                        </p>
                      )}
                    </>
                  )}

                  <p>
                    <strong>Κατάσταση:</strong> {renderStatus(tx.status)}
                  </p>

                  <p>
                    <strong>Τύπος συναλλαγής:</strong>{" "}
                    {renderType(tx.transaction_type)}
                  </p>

                  {/* Απόσταση μεταξύ χρηστών */}
                  {tx.status !== "completed" && tx.status !== "rejected" && (
                    <>
                      {tx.distance_km !== null &&
                      tx.distance_km !== undefined ? (
                        <p style={{ color: "#555", marginTop: "4px" }}>
                          <FaMapMarkerAlt /> Απόσταση μεταξύ χρηστών:{" "}
                          <strong style={{ color: "#007bff" }}>
                            {tx.distance_km} km
                          </strong>
                        </p>
                      ) : (
                        <p style={{ color: "#999", marginTop: "4px" }}>
                          <FaMapMarkerAlt /> Απόσταση: <em>—</em>
                        </p>
                      )}
                    </>
                  )}

                  {tx.end_date && (
                    <p>
                      <strong>Ημ/νία:</strong>{" "}
                      {new Date(tx.end_date).toLocaleDateString("el-GR")}
                    </p>
                  )}

                  {tx.reviews && tx.reviews.length > 0 ? (
                    <div style={styles.reviewBox}>
                      <p>
                        <FaStar color="#ffc107" style={{ marginRight: 4 }} />{" "}
                        {tx.reviews[0].rating}/5
                      </p>
                      {tx.reviews[0].comment && (
                        <p>
                          <FaComments /> <em>{tx.reviews[0].comment}</em>
                        </p>
                      )}
                    </div>
                  ) : tx.status === "completed" ? (
                    <button
                      style={styles.reviewButton}
                      onClick={() => {
                        setSelectedTransaction({ ...tx });
                        setTimeout(
                          () =>
                            window.scrollTo({
                              top: document.body.scrollHeight,
                              behavior: "smooth",
                            }),
                          200
                        );
                      }}
                    >
                      <FaStar /> Αξιολόγηση
                    </button>
                  ) : null}
                </div>
              ))}

              {/* Σελιδοποίηση */}
              <PaginationControls
                nextPage={nextPage}
                prevPage={prevPage}
                onPageChange={(url) => fetchTransactions("history", url)}
              />
            </>
          )}
        </section>
      )}

      {/* Floating Chat */}
      <AnimatePresence>
        {activeChat && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            style={styles.chatPopup}
          >
            <div style={styles.chatHeader}>
              <span>
                <FaComments /> Συναλλαγή #{activeChat.transactionId}
              </span>
              <button
                onClick={() => setActiveChat(null)}
                style={styles.closeChatButton}
              >
                <FaTimesCircle />
              </button>
            </div>
            <ChatBox
              transactionId={activeChat.transactionId}
              receiverId={activeChat.receiverId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Form */}
      {selectedTransaction && (
        <div style={styles.reviewFormContainer}>
          <h3>
            <FaStar /> Αξιολόγηση συναλλαγής #{selectedTransaction.id} (
            {selectedTransaction.item_title})
          </h3>
          <form onSubmit={handleSubmitReview} style={styles.form}>
            <label>Βαθμολογία:</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={styles.select}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} <FaStar color="#ffc107" style={{ marginRight: 4 }} />
                </option>
              ))}
            </select>

            <label>Σχόλιο:</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Προαιρετικό σχόλιο..."
              style={styles.textarea}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" style={styles.submitButton}>
                <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Υποβολή
              </button>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => setSelectedTransaction(null)}
              >
                <FaTimesCircle /> Άκυρο
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exchange Select Modal */}
      <AnimatePresence>
        {exchangeModalOpen && exchangeModalTx && (
          <motion.div
            key="exchangeModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => {
              setExchangeModalOpen(false);
              setExchangeModalTx(null);
            }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 16 }}
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()} // block overlay click
            >
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0 }}>
                  <FaExchangeAlt color="#007bff" /> Επιλογή αντικειμένου από{" "}
                  {exchangeModalTx.requester?.username}
                </h3>
                <button
                  style={styles.modalClose}
                  onClick={() => {
                    setExchangeModalOpen(false);
                    setExchangeModalTx(null);
                  }}
                >
                  ✖
                </button>
              </div>

              <div style={styles.modalBody}>
                {(() => {
                  const u = exchangeModalTx.requester?.username;
                  const list = u ? itemsByUser[u] || [] : [];
                  if (list.length === 0)
                    return <p>Δεν βρέθηκαν αντικείμενα για επιλογή.</p>;
                  return (
                    <div style={styles.itemsGrid}>
                      {list.map((it) => (
                        <div key={it.id} style={styles.itemCard}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <strong>{it.title}</strong>
                            <span>{renderType(it.transaction_type)}</span>
                          </div>
                          <p style={{ marginTop: 6 }}>
                            {it.description?.slice(0, 120) || "—"}
                          </p>
                          <button
                            style={styles.primaryBtn}
                            onClick={() =>
                              handleSelectExchangeItem(
                                exchangeModalTx.id,
                                it.id
                              )
                            }
                          >
                            <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Επιλογή
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal για επιλογή τοποθεσίας */}
      {showMapModal && selectedTxForMap && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>
              <FaMapMarkerAlt /> Τοποθεσία συνάντησης
            </h3>

            <MapSelector
              tx={selectedTxForMap}
              onSelectLocation={async (lat, lng) => {
                try {
                  const res = await authFetch(
                    `http://localhost:8000/api/transactions/${selectedTxForMap.id}/propose_location/`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ lat, lng }),
                    }
                  );
                  if (!res.ok) throw new Error();
                  const updated = await res.json();
                  toast.success(
                    "✅ Η τοποθεσία αποθηκεύτηκε και στάλθηκε ειδοποίηση!"
                  );
                  setSelectedTxForMap(updated); // ενημερώνει local state
                  fetchTransactions(); // ανανεώνει λίστα
                } catch {
                  toast.error("⚠️ Σφάλμα αποθήκευσης τοποθεσίας");
                }
              }}
            />

            <button
              style={styles.closeChatButton}
              onClick={() => setShowMapModal(false)}
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------- Κάρτες ---------------------- */

function TransactionCard({
  tx,
  user,
  itemsByUser,
  setActiveChat,
  onAccept,
  onReject,
  onOpenSelect,
  onComplete,
  loanDates,
  setLoanDates,
  expandedId,
  setExpandedId,
  setSelectedTxForMap,
  setShowMapModal,
  localCompleted,
  onMarkShipped,
  onMarkReceived,
  showMeetingLocationIds,
  setShowMeetingLocationIds,
}) {
  const isOwner = tx.owner?.username === user?.username;
  const isExpanded = expandedId === tx.id;

  return (
    <div
      style={{
        ...styles.card,
        cursor: "pointer",
        background: isExpanded ? "#eef7ff" : "#f9f9f9",
      }}
      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
    >
      {!isExpanded && (
        <div>
          <p>
            <FaUser />{" "}
            <Link to={`/profile/${tx.requester?.id}`} style={styles.link}>
              {tx.requester?.username}
            </Link>
          </p>
          <p>
            <FaExchangeAlt color="#007bff" /> {tx.item_title} —{" "}
            {renderType(tx.transaction_type)}
          </p>
        </div>
      )}

      {isExpanded && (
        <div>
          <p>
            <strong>Από:</strong>{" "}
            <Link to={`/profile/${tx.requester?.id}`} style={styles.link}>
              {tx.requester?.username}
            </Link>
          </p>
          <p>
            <strong>Αντικείμενο:</strong>{" "}
            <Link to={`/items/${tx.item}`} style={styles.link}>
              {tx.item_title}
            </Link>
          </p>
          <p>
            <strong>Τύπος:</strong> {renderType(tx.transaction_type)}
          </p>
          <p>
            <strong>Κατάσταση:</strong> {renderStatus(tx.status)}
          </p>

          {tx.transaction_type === "exchange" && tx.requested_item_title && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#f0f8ff",
                borderRadius: "8px",
                padding: "8px 10px",
                marginTop: "8px",
              }}
            >
              <div style={{ flex: 1, textAlign: "center" }}>
                <p style={{ margin: 0 }}>
                  <FaHandHoldingHeart color="#28a745" />{" "}
                  <strong>{tx.item_title}</strong>
                </p>
                <p style={{ margin: 0, fontSize: "0.9em", color: "#555" }}>
                  του {tx.owner?.username}
                </p>
              </div>

              <span style={{ fontSize: "1.4em" }}>⇄</span>

              <div style={{ flex: 1, textAlign: "center" }}>
                <p style={{ margin: 0 }}>
                  <FaHandHoldingHeart color="#28a745" />{" "}
                  <strong>{tx.requested_item_title}</strong>
                </p>
                <p style={{ margin: 0, fontSize: "0.9em", color: "#555" }}>
                  του {tx.requester?.username}
                </p>
              </div>
            </div>
          )}

          {/* Τοποθεσία συνάντησης */}
          {(tx.meeting_lat && tx.meeting_lng) || tx.meeting_address ? (
            <>
              <button
                style={styles.mapButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMeetingLocationIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(tx.id)) newSet.delete(tx.id);
                    else newSet.add(tx.id);
                    return newSet;
                  });
                }}
              >
                {showMeetingLocationIds.has(tx.id)
                  ? " Απόκρυψη τοποθεσίας"
                  : " Εμφάνιση τοποθεσίας συνάντησης"}
              </button>

              {showMeetingLocationIds.has(tx.id) && (
                <div style={{ marginTop: "10px" }}>
                  <p style={{ color: "#007bff", marginBottom: "8px" }}>
                    <FaMapMarkerAlt /> <strong>Τοποθεσία συνάντησης:</strong>{" "}
                    {tx.meeting_address
                      ? tx.meeting_address
                      : `(${tx.meeting_lat.toFixed(
                          5
                        )}, ${tx.meeting_lng.toFixed(5)})`}
                  </p>

                  <div
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      overflow: "hidden",
                      height: "260px",
                    }}
                  >
                    <MapSelector tx={tx} onSelectLocation={() => {}} />
                  </div>
                </div>
              )}
            </>
          ) : null}

          {tx.delivery_method && (
            <p>
              <strong>Τρόπος Παράδοσης:</strong>{" "}
              {tx.delivery_method === "in_person"
                ? " Χέρι με χέρι"
                : tx.delivery_method === "pickup_point"
                ? " Σημείο συνάντησης"
                : tx.delivery_method === "shipping"
                ? " Αποστολή με courier"
                : "—"}
            </p>
          )}

          {/* Κουμπί επιλογής τοποθεσίας — ορατό και στους δύο */}
          {(tx.delivery_method === "in_person" ||
            tx.delivery_method === "pickup_point") && (
            <button
              style={styles.mapButton}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTxForMap(tx);
                setShowMapModal(true);
              }}
            >
              <FaMapMarkerAlt /> Επιλογή Τοποθεσίας
            </button>
          )}

          {tx.distance_km !== null && (
            <p style={{ color: "#555" }}>
              <FaMapMarkerAlt /> Απόσταση:{" "}
              <strong style={{ color: "#007bff" }}>{tx.distance_km} km</strong>
            </p>
          )}

          <button
            style={styles.chatButton}
            onClick={(e) => {
              e.stopPropagation();
              setActiveChat({
                transactionId: tx.id,
                receiverId: tx.requester?.id,
              });
            }}
          >
            <FaComments /> Συνομιλία
          </button>

          {isOwner && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {/* Αποδοχή/Απόρριψη */}
              {tx.status === "pending" && (
                <>
                  {tx.transaction_type === "loan" &&
                    tx.start_date &&
                    tx.end_date && (
                      <p>
                        <strong>Ημερ. Δανεισμού:</strong>{" "}
                        {new Date(tx.start_date).toLocaleDateString("el-GR")} –{" "}
                        {new Date(tx.end_date).toLocaleDateString("el-GR")}
                      </p>
                    )}

                  <button
                    style={{
                      ...styles.primaryBtn,
                      background:
                        tx.transaction_type === "exchange" && !tx.requested_item
                          ? "#ccc"
                          : styles.primaryBtn.background,
                      cursor:
                        tx.transaction_type === "exchange" && !tx.requested_item
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={
                      tx.transaction_type === "exchange" && !tx.requested_item
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        tx.transaction_type === "exchange" &&
                        !tx.requested_item
                      ) {
                        toast.error("Επίλεξε πρώτα αντικείμενο για ανταλλαγή!");
                        return;
                      }
                      onAccept();
                    }}
                  >
                    <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Αποδοχή
                  </button>

                  <button
                    style={styles.dangerBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject();
                    }}
                  >
                    <FaTimesCircle /> Απόρριψη
                  </button>

                  {tx.transaction_type === "exchange" && (
                    <button
                      style={styles.secondaryBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSelect();
                      }}
                    >
                      <FaHandHoldingHeart color="#28a745" /> Επιλογή
                      αντικειμένου
                    </button>
                  )}
                </>
              )}

              {/* Courier flow για loan */}
              {tx.delivery_method === "shipping" &&
                tx.transaction_type === "loan" &&
                tx.status === "accepted" && (
                  <div style={{ marginTop: "10px" }}>
                    {!tx.owner_shipped ? (
                      <button
                        style={styles.primaryBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkShipped(tx.id);
                        }}
                      >
                        <FaTruck /> Επιβεβαίωση αποστολής
                      </button>
                    ) : (
                      <p style={{ color: "#28a745" }}>
                        <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Έχεις επιβεβαιώσει αποστολή
                      </p>
                    )}
                  </div>
                )}

              {tx.delivery_method === "shipping" &&
                tx.transaction_type === "exchange" &&
                tx.status === "accepted" && (
                  <div style={{ marginTop: "10px" }}>
                    {!tx.owner_shipped ? (
                      <button
                        style={styles.primaryBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkShipped(tx.id);
                        }}
                      >
                        <FaTruck /> Επιβεβαίωση αποστολής
                      </button>
                    ) : (
                      <p style={{ color: "#28a745" }}>
                        <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Έχεις επιβεβαιώσει αποστολή
                      </p>
                    )}

                    {tx.requester_shipped && !tx.owner_received && (
                      <button
                        style={styles.secondaryBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkReceived(tx.id);
                        }}
                      >
                        <FaTruck /> Επιβεβαίωση παραλαβής
                      </button>
                    )}

                    {tx.owner_received && (
                      <p style={{ color: "#28a745" }}>
                        <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Έχεις επιβεβαιώσει παραλαβή
                      </p>
                    )}

                    {tx.owner_received && tx.requester_received && (
                      <p style={{ color: "#28a745" }}>
                        Η ανταλλαγή ολοκληρώθηκε!
                      </p>
                    )}
                  </div>
                )}

              {/* Χέρι με χέρι ανταλλαγή – Ολοκλήρωση */}
              {tx.transaction_type === "exchange" &&
                tx.delivery_method === "in_person" &&
                tx.status === "accepted" && (
                  <div style={{ marginTop: "10px" }}>
                    {!localCompleted.has(tx.id) ? (
                      <button
                        style={styles.primaryBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onComplete();
                        }}
                      >
                        <FaCheckCircle /> Ολοκλήρωση ανταλλαγής
                      </button>
                    ) : (
                      <p style={{ color: "#999" }}>
                        <FaHourglassHalf /> Αναμονή ολοκλήρωσης από τον άλλο
                        χρήστη
                      </p>
                    )}
                  </div>
                )}

              {/* Επιστροφή */}
              {tx.status === "returned_by_requester" && (
                <button
                  style={styles.primaryBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                >
                  <FaCheckCircle /> Επιβεβαίωση & Ολοκλήρωση
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutgoingCard({
  tx,
  user,
  setActiveChat,
  onConfirmExchange,
  onRejectExchange,
  onReturnLoan,
  onComplete,
  expandedId,
  setExpandedId,
  localCompleted,
  setSelectedTxForMap,
  setShowMapModal,
  onMarkReceived,
  onMarkShipped,
  showMeetingLocationIds,
  setShowMeetingLocationIds,
}) {
  const isRequester = tx.requester?.username === user?.username;
  const isExpanded = expandedId === tx.id;

  return (
    <div
      style={{
        ...styles.card,
        cursor: "pointer",
        background: isExpanded ? "#eef7ff" : "#f9f9f9",
        transition: "0.2s",
      }}
      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
    >
      {!isExpanded && (
        <div>
          <p>
            <FaUser />{" "}
            <Link to={`/profile/${tx.owner?.id}`} style={styles.link}>
              {tx.owner?.username}
            </Link>
          </p>
          <p>
            <FaHandHoldingHeart color="#28a745" /> {tx.item_title} —{" "}
            {renderType(tx.transaction_type)}
          </p>
        </div>
      )}

      {isExpanded && (
        <div>
          <p>
            <strong>Προς:</strong>{" "}
            <Link to={`/profile/${tx.owner?.id}`} style={styles.link}>
              {tx.owner?.username}
            </Link>
          </p>
          <p>
            <strong>Αντικείμενο:</strong>{" "}
            <Link to={`/items/${tx.item}`} style={styles.link}>
              {tx.item_title}
            </Link>
          </p>
          <p>
            <strong>Τύπος:</strong> {renderType(tx.transaction_type)}
          </p>
          <p>
            <strong>Κατάσταση:</strong> {renderStatus(tx.status)}
          </p>

          {tx.transaction_type === "exchange" && tx.requested_item_title && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#f0f8ff",
                borderRadius: "8px",
                padding: "8px 10px",
                marginTop: "8px",
              }}
            >
              <div style={{ flex: 1, textAlign: "center" }}>
                <p style={{ margin: 0 }}>
                  <FaHandHoldingHeart color="#28a745" />{" "}
                  <strong>{tx.item_title}</strong>
                </p>
                <p style={{ margin: 0, fontSize: "0.9em", color: "#555" }}>
                  του {tx.owner?.username}
                </p>
              </div>

              <span style={{ fontSize: "1.4em" }}>⇄</span>

              <div style={{ flex: 1, textAlign: "center" }}>
                <p style={{ margin: 0 }}>
                  <FaHandHoldingHeart color="#e81111ff" />{" "}
                  <strong>{tx.requested_item_title}</strong>
                </p>
                <p style={{ margin: 0, fontSize: "0.9em", color: "#555" }}>
                  του {tx.requester?.username}
                </p>
              </div>
            </div>
          )}

          {tx.transaction_type === "loan" && tx.start_date && tx.end_date && (
            <p>
              <strong>Ημερ. Δανεισμού:</strong>{" "}
              {new Date(tx.start_date).toLocaleDateString("el-GR")} –{" "}
              {new Date(tx.end_date).toLocaleDateString("el-GR")}
            </p>
          )}

          {/* Τοποθεσία συνάντησης (όπως στο TransactionCard) */}
          {(tx.meeting_lat && tx.meeting_lng) || tx.meeting_address ? (
            <>
              <button
                style={styles.mapButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMeetingLocationIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(tx.id)) newSet.delete(tx.id);
                    else newSet.add(tx.id);
                    return newSet;
                  });
                }}
              >
                {showMeetingLocationIds.has(tx.id)
                  ? " Απόκρυψη τοποθεσίας"
                  : " Εμφάνιση τοποθεσίας συνάντησης"}
              </button>

              {showMeetingLocationIds.has(tx.id) && (
                <div style={{ marginTop: "10px" }}>
                  <p style={{ color: "#007bff", marginBottom: "8px" }}>
                    <FaMapMarkerAlt /> <strong>Τοποθεσία συνάντησης:</strong>{" "}
                    {tx.meeting_address
                      ? tx.meeting_address
                      : `(${tx.meeting_lat.toFixed(
                          5
                        )}, ${tx.meeting_lng.toFixed(5)})`}
                  </p>

                  <div
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      overflow: "hidden",
                      height: "260px",
                    }}
                  >
                    <MapSelector tx={tx} onSelectLocation={() => {}} />
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Επιλογή Τοποθεσίας — ίδιο με TransactionCard */}
          {(tx.delivery_method === "in_person" ||
            tx.delivery_method === "pickup_point") && (
            <button
              style={styles.mapButton}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTxForMap(tx);
                setShowMapModal(true);
              }}
            >
              <FaMapMarkerAlt /> Επιλογή Τοποθεσίας
            </button>
          )}

          {tx.distance_km !== null && (
            <p style={{ color: "#555" }}>
              <FaMapMarkerAlt /> Απόσταση:{" "}
              <strong style={{ color: "#007bff" }}>{tx.distance_km} km</strong>
            </p>
          )}

          <button
            style={styles.chatButton}
            onClick={(e) => {
              e.stopPropagation();
              setActiveChat({
                transactionId: tx.id,
                receiverId: tx.owner?.id,
              });
            }}
          >
            <FaComments /> Συνομιλία
          </button>

          {isRequester && (
            <>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {/* Ανταλλαγή */}
                {tx.transaction_type === "exchange" &&
                  tx.status === "pending_confirmation" && (
                    <>
                      <button
                        style={styles.primaryBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmExchange();
                        }}
                      >
                        <FaExchangeAlt /> Επιβεβαίωση ανταλλαγής
                      </button>
                      <button
                        style={styles.dangerBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectExchange();
                        }}
                      >
                        <FaTimes /> Απόρριψη
                      </button>
                    </>
                  )}

                {/* Δανεισμός με courier */}
                {tx.delivery_method === "shipping" &&
                  tx.transaction_type === "loan" && (
                    <div style={{ marginTop: "10px" }}>
                      {!tx.owner_shipped && (
                        <p style={{ color: "#999" }}>
                          <FaHourglassHalf /> Αναμονή αποστολής από τον
                          ιδιοκτήτη
                        </p>
                      )}
                      {tx.owner_shipped && !tx.requester_received && (
                        <button
                          style={styles.primaryBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkReceived();
                          }}
                        >
                          <FaTruck /> Επιβεβαίωση παραλαβής
                        </button>
                      )}
                      {tx.requester_received && (
                        <p style={{ color: "#28a745" }}>
                          <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Έχεις επιβεβαιώσει παραλαβή
                        </p>
                      )}
                      {tx.requester_received && (
                        <button
                          style={styles.secondaryBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReturnLoan();
                          }}
                        >
                          <FaUndo /> Δήλωση επιστροφής
                        </button>
                      )}
                      {tx.owner_shipped && tx.requester_received && (
                        <p style={{ color: "#28a745" }}>
                          <FaCheckCircle /> Η συναλλαγή ολοκληρώθηκε!
                        </p>
                      )}
                    </div>
                  )}

                {/* Ανταλλαγή με courier */}
                {tx.delivery_method === "shipping" &&
                  tx.transaction_type === "exchange" &&
                  tx.status === "accepted" && (
                    <div style={{ marginTop: "10px" }}>
                      {!tx.requester_shipped ? (
                        <button
                          style={styles.primaryBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkShipped(tx.id);
                          }}
                        >
                          <FaTruck /> Επιβεβαίωση αποστολής
                        </button>
                      ) : (
                        <p style={{ color: "#28a745" }}>
                          <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Έχεις επιβεβαιώσει αποστολή
                        </p>
                      )}

                      {tx.owner_shipped && !tx.requester_received && (
                        <button
                          style={styles.secondaryBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkReceived(tx.id);
                          }}
                        >
                          <FaTruck /> Επιβεβαίωση παραλαβής
                        </button>
                      )}

                      {tx.requester_received && (
                        <p style={{ color: "#28a745" }}>
                          <FaCheckCircle style={{ color: "#28a745", fontSize: "24px" }} /> Έχεις επιβεβαιώσει παραλαβή
                        </p>
                      )}

                      {tx.owner_received && tx.requester_received && (
                        <p style={{ color: "#28a745" }}>
                          <FaCheckCircle /> Η ανταλλαγή ολοκληρώθηκε!
                        </p>
                      )}
                    </div>
                  )}

                {/* Χέρι με χέρι ανταλλαγή – Ολοκλήρωση */}
                {tx.transaction_type === "exchange" &&
                  tx.delivery_method === "in_person" &&
                  tx.status === "accepted" && (
                    <div style={{ marginTop: "10px" }}>
                      {!localCompleted.has(tx.id) ? (
                        <button
                          style={styles.primaryBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onComplete();
                          }}
                        >
                          <FaCheckCircle /> Ολοκλήρωση ανταλλαγής
                        </button>
                      ) : (
                        <p style={{ color: "#999" }}>
                          <FaHourglassHalf /> Αναμονή ολοκλήρωσης από τον άλλο
                          χρήστη
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------- Helpers & Styling ---------------------- */
function renderStatus(status) {
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  switch (status) {
    case "pending":
      return (
        <span style={baseStyle}>
          <FaHourglassHalf color="#f0ad4e" />
          Σε εκκρεμότητα
        </span>
      );

    case "pending_confirmation":
      return (
        <span style={baseStyle}>
          <FaClock color="#ffc107" />
          Αναμένει επιβεβαίωση
        </span>
      );

    case "pending_terms":
      return (
        <span style={baseStyle}>
          <FaFileAlt color="#17a2b8" />
          Αναμένει όρους
        </span>
      );

    case "accepted":
      return (
        <span style={baseStyle}>
          <FaCheckCircle color="#28a745" />
          Ενεργή
        </span>
      );

    case "returned_by_requester":
      return (
        <span style={baseStyle}>
          <FaUndo color="#007bff" />
          Δηλώθηκε επιστροφή
        </span>
      );

    case "rejected":
      return (
        <span style={baseStyle}>
          <FaTimesCircle color="#dc3545" />
          Απορριφθείσα
        </span>
      );

    case "completed":
      return (
        <span style={baseStyle}>
          <FaFlagCheckered color="#007bff" />
          Ολοκληρωμένη
        </span>
      );

    default:
      return status;
  }
}

function renderType(type) {
  switch (type) {
    case "exchange":
      return (
        <>
          <FaExchangeAlt color="#007bff" style={{ marginRight: 6 }} />
          Ανταλλαγή
        </>
      );
    case "loan":
      return (
        <>
          <FaHandHoldingHeart color="#28a745" style={{ marginRight: 6 }} />
          Δανεισμός
        </>
      );
    case "either":
      return (
        <>
          <FaExchangeAlt color="#007bff" style={{ marginRight: 4 }} />
          <FaHandHoldingHeart color="#28a745" style={{ marginRight: 6 }} />
          Ανταλλαγή ή Δανεισμός
        </>
      );
    default:
      return type;
  }
}

function PaginationControls({ nextPage, prevPage, onPageChange }) {
  // Αν δεν υπάρχει προηγούμενη ούτε επόμενη → να μην εμφανίζει καθόλου
  if (!nextPage && !prevPage) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        marginTop: "15px",
      }}
    >
      <button
        disabled={!prevPage}
        onClick={() => prevPage && onPageChange(prevPage)}
        style={{
          background: prevPage ? "#007bff" : "#ccc",
          color: "white",
          border: "none",
          padding: "6px 12px",
          borderRadius: "6px",
          cursor: prevPage ? "pointer" : "not-allowed",
          opacity: prevPage ? 1 : 0.6,
          transition: "opacity 0.2s",
        }}
      >
        <FaArrowLeft color="#eef2f5ff" /> Προηγούμενη
      </button>

      <button
        disabled={!nextPage}
        onClick={() => nextPage && onPageChange(nextPage)}
        style={{
          background: nextPage ? "#007bff" : "#ccc",
          color: "white",
          border: "none",
          padding: "6px 12px",
          borderRadius: "6px",
          cursor: nextPage ? "pointer" : "not-allowed",
          opacity: nextPage ? 1 : 0.6,
          transition: "opacity 0.2s",
        }}
      >
        Επόμενη <FaArrowRight color="#e6eaeeff" />
      </button>
    </div>
  );
}

/* Styling */
const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(180deg, #dce9f9 0%, #dff5ec 50%, #cde3ff 100%)",
    padding: "60px 5vw",
    fontFamily: "Inter, sans-serif",
    color: "#222",
    overflowX: "hidden",
    boxSizing: "border-box",
    scrollbarGutter: "stable",
    transition: "background 0.3s ease, min-height 0.3s ease",
    minHeight: "100dvh", 
  },
  tabContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  tab: {
    background: "#e0e0e0",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  activeTab: {
    background: "#007bff",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  card: {
    background: "linear-gradient(180deg, #f5fff7 0%, #e3f5ea 100%)",
    borderRadius: "14px",
    padding: "18px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    border: "1.5px solid #a2d2a2",
    transition: "all 0.3s ease",
    cursor: "pointer",
    margin: "0 auto 20px", 
    width: "100%", 
    maxWidth: "720px", 
    color: "#1f3a1f",
  },

  link: { color: "#007bff", textDecoration: "none" },
  reviewBox: {
    background: "#f1f1f1",
    padding: "8px",
    borderRadius: "6px",
    marginTop: "8px",
  },
  reviewButton: {
    background: "#ff9800",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
  chatButton: {
    background: "#17a2b8",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
  primaryBtn: {
    background: "#0f9d58",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#e53935",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  returnButton: {
    background: "#007bff",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
  inlineRow: { display: "flex", gap: 8, alignItems: "center" },
  dateInput: {
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "6px 8px",
  },
  chatPopup: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "400px",
    height: "520px",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "12px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
    zIndex: 1000,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  chatHeader: {
    background: "#007bff",
    color: "#fff",
    padding: "10px 15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
  },
  closeChatButton: {
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "1.2rem",
  },
  reviewFormContainer: {
    background: "#fff3cd",
    border: "1px solid #ffeeba",
    borderRadius: "10px",
    padding: "20px",
    marginTop: "40px",
  },
  form: { display: "flex", flexDirection: "column", gap: "10px" },
  textarea: {
    minHeight: "80px",
    resize: "vertical",
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  submitButton: {
    background: "green",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  cancelButton: {
    background: "gray",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  /* Modal overlay */
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1100,
  },
  modalContent: {
    width: "100%",
    maxWidth: 720,
    background: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    boxShadow: "0 -8px 24px rgba(0,0,0,0.25)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #eee",
    paddingBottom: 8,
  },
  modalClose: {
    background: "transparent",
    border: "none",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  modalBody: { paddingTop: 12, paddingBottom: 12 },
  itemsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
    gap: 12,
  },
  itemCard: {
    border: "1px solid #e5e5e5",
    borderRadius: 10,
    padding: 12,
    background: "#fafafa",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  tabContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  tab: {
    background: "#e0e0e0",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  activeTab: {
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
  },
  subTabContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "20px",
  },
  subTab: {
    background: "#ddd",
    border: "none",
    borderRadius: "8px",
    padding: "6px 14px",
    cursor: "pointer",
  },
  activeSubTab: {
    background: "#28a745",
    color: "white",
    borderRadius: "8px",
    padding: "6px 14px",
    cursor: "pointer",
  },
  mapButton: {
    background: "#0078d4",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
    marginRight: "10px", 
  },
  headerBar: {
    background: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(12px)",
    borderRadius: "16px",
    padding: "20px 30px",
    marginBottom: "30px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },

  pageTitle: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1c2a40",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: 0,
  },

  mainTabs: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  mainTab: {
    background: "#e5e7eb",
    color: "#111827",
    border: "none",
    padding: "10px 18px",
    borderRadius: "50px",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.25s ease",
  },

  activeMainTab: {
    background: "linear-gradient(90deg,#007bff,#00a8ff)",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: "50px",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(0,123,255,0.3)",
  },

  subTabs: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
  },

  subTab: {
    background: "#d1d5db",
    border: "none",
    color: "#111827",
    padding: "8px 14px",
    borderRadius: "30px",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.25s ease",
  },

  activeSubTab: {
    background: "#22c55e",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "30px",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 3px 8px rgba(34,197,94,0.3)",
  },
};

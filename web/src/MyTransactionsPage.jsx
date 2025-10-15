import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import ChatBox from "./ChatBox";
import MapSelector from "./MapSelector";

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

  // Loan accept inline inputs (ανά συναλλαγή)
  const [loanDates, setLoanDates] = useState({}); // { [txId]: { start_date, end_date } }

  const [expandedId, setExpandedId] = useState(null);

  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [searchParams] = useSearchParams();

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedTxForMap, setSelectedTxForMap] = useState(null);

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
      toast.success("📍 Η τοποθεσία προτάθηκε με επιτυχία!");
      setShowMapModal(false);
      setSelectedTxForMap(null);
    } catch (err) {
      toast.error("⚠️ Σφάλμα αποστολής τοποθεσίας");
    }
  };

  // Φόρτωση συναλλαγών
  const fetchTransactions = async (type = subTab, url = null) => {
    if (!user) return;
    setLoading(true);

    try {
      // Αν δεν έχει δοθεί URL (π.χ. από pagination), φτιάξε το endpoint με βάση το subTab
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

      // 📄 Ανταπόκριση pagination (DRF)
      setTransactions(Array.isArray(data) ? data : data.results || []);
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

      console.log("💬 Άνοιγμα chat για:", tx.id, "receiver:", receiverId);

      setActiveChat({ transactionId: tx.id, receiverId });
      toast.success(`💬 Άνοιξε η συνομιλία για τη συναλλαγή #${tx.id}`);
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
        `http://localhost:8000/api/items/of_user/${username}/`
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
        const dates = loanDates[tx.id] || {};
        if (!dates.start_date || !dates.end_date) {
          toast.error("🔔 Συμπλήρωσε ημερομηνίες δανεισμού");
          return;
        }
        body.start_date = dates.start_date;
        body.end_date = dates.end_date;
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
      toast("❌ Η αίτηση απορρίφθηκε");
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
      toast.success("🎁 Επιλέχθηκε αντικείμενο για ανταλλαγή");
      setExchangeModalOpen(false);
      setExchangeModalTx(null);
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα επιλογής αντικειμένου");
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
      toast("↩️ Δήλωσες επιστροφή");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα δήλωσης επιστροφής");
    }
  };

  // Owner: Ολοκλήρωση συναλλαγής
  const handleComplete = async (txId) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/transactions/${txId}/mark_completed/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Αποτυχία ολοκλήρωσης");
      toast.success("🏁 Η συναλλαγή ολοκληρώθηκε");
      fetchTransactions();
    } catch {
      toast.error("⚠️ Σφάλμα ολοκλήρωσης");
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
      <h1>📬 Οι συναλλαγές μου</h1>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          style={activeTab === "active" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("active")}
        >
          ⚙️ Ενεργές
        </button>
        <button
          style={activeTab === "history" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("history")}
        >
          🏁 Ολοκληρωμένες / Απορριφθείσες
        </button>
      </div>

      {/* Ενεργές */}
      {activeTab === "active" && (
        <>
          {/* Εσωτερικά tabs */}
          <div style={styles.subTabContainer}>
            <button
              style={
                subTab === "incoming" ? styles.activeSubTab : styles.subTab
              }
              onClick={() => setSubTab("incoming")}
            >
              📥 Εισερχόμενα
            </button>
            <button
              style={
                subTab === "outgoing" ? styles.activeSubTab : styles.subTab
              }
              onClick={() => setSubTab("outgoing")}
            >
              📤 Εξερχόμενα
            </button>
          </div>

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
                  <TransactionCard
                    key={tx.id}
                    tx={tx}
                    user={user}
                    itemsByUser={itemsByUser}
                    setActiveChat={setActiveChat}
                    onAccept={() => handleConfirmExchange(tx.id)}
                    onReject={() => handleRejectExchange(tx.id)}
                    onOpenSelect={() => openSelectItemModal(tx)}
                    onComplete={() => handleReturnLoan(tx.id)}
                    loanDates={loanDates[tx.id] || {}}
                    setLoanDates={(dates) =>
                      setLoanDates((prev) => ({ ...prev, [tx.id]: dates }))
                    }
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    setSelectedTxForMap={setSelectedTxForMap}
                    setShowMapModal={setShowMapModal}
                    mode="outgoing"
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
          <h2>🏁 Ολοκληρωμένες / Απορριφθείσες</h2>

          {transactions.length === 0 ? (
            <p>Δεν υπάρχουν ολοκληρωμένες ή απορριφθείσες συναλλαγές.</p>
          ) : (
            <>
              {transactions.map((tx) => (
                <div key={tx.id} style={styles.card}>
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
                  <p>
                    <strong>Κατάσταση:</strong> {renderStatus(tx.status)}
                  </p>
                  <p>
                    <strong>Από:</strong> {tx.requester?.username} →{" "}
                    <strong>Προς:</strong> {tx.owner?.username}
                  </p>

                  {/* 📍 Απόσταση μεταξύ χρηστών */}
                  {tx.distance_km !== null && tx.distance_km !== undefined ? (
                    <p style={{ color: "#555", marginTop: "4px" }}>
                      📍 Απόσταση μεταξύ χρηστών:{" "}
                      <strong style={{ color: "#007bff" }}>
                        {tx.distance_km} km
                      </strong>
                    </p>
                  ) : (
                    <p style={{ color: "#999", marginTop: "4px" }}>
                      📍 Απόσταση: <em>—</em>
                    </p>
                  )}

                  {tx.end_date && (
                    <p>
                      <strong>Ημ/νία:</strong>{" "}
                      {new Date(tx.end_date).toLocaleDateString("el-GR")}
                    </p>
                  )}

                  {tx.reviews && tx.reviews.length > 0 ? (
                    <div style={styles.reviewBox}>
                      <p>⭐ {tx.reviews[0].rating}/5</p>
                      {tx.reviews[0].comment && (
                        <p>
                          💬 <em>{tx.reviews[0].comment}</em>
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
                      ✨ Αξιολόγηση
                    </button>
                  ) : null}
                </div>
              ))}

              {/* 🧭 Σελιδοποίηση */}
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
              <span>💬 Συναλλαγή #{activeChat.transactionId}</span>
              <button
                onClick={() => setActiveChat(null)}
                style={styles.closeChatButton}
              >
                ❌
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
            ✨ Αξιολόγηση συναλλαγής #{selectedTransaction.id} (
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
                  {r} ⭐
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
                ✅ Υποβολή
              </button>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => setSelectedTransaction(null)}
              >
                ❌ Άκυρο
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
                  🎁 Επιλογή αντικειμένου από{" "}
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
                            ✅ Επιλογή
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
      {/* 🗺️ Modal για επιλογή τοποθεσίας */}
      {showMapModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>📍 Επίλεξε τοποθεσία συνάντησης</h3>
            <MapSelector onSelectLocation={handleLocationSelect} />
            <button
              style={styles.closeChatButton}
              onClick={() => setShowMapModal(false)}
            >
              ❌ Κλείσιμο
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
  mode = "incoming", // "incoming" ή "outgoing"
}) {
  const isExpanded = expandedId === tx.id;
  const isOwner = tx.owner?.username === user?.username;
  const isRequester = tx.requester?.username === user?.username;

  // Καθορίζει ποιος είναι ο "άλλος" χρήστης
  const otherUser = mode === "incoming" ? tx.requester : tx.owner;

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
      {/* --- Compact View (όταν δεν είναι expanded) --- */}
      {!isExpanded && (
        <div>
          <p>
            👤{" "}
            <Link to={`/profile/${otherUser?.id}`} style={styles.link}>
              {otherUser?.username}
            </Link>
          </p>
          <p>
            🎁 {tx.item_title} — {renderType(tx.transaction_type)}
          </p>
        </div>
      )}

      {/* --- Expanded View --- */}
      {isExpanded && (
        <div>
          <p>
            <strong>{mode === "incoming" ? "Από:" : "Προς:"}</strong>{" "}
            <Link to={`/profile/${otherUser?.id}`} style={styles.link}>
              {otherUser?.username}
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

          {/* 🆕 Τρόπος παράδοσης */}
          {tx.delivery_method && (
            <p>
              <strong>Τρόπος Παράδοσης:</strong>{" "}
              {tx.delivery_method === "in_person"
                ? "🤝 Χέρι με χέρι"
                : tx.delivery_method === "pickup_point"
                ? "📍 Σημείο συνάντησης"
                : tx.delivery_method === "shipping"
                ? "📦 Αποστολή με courier"
                : "—"}
            </p>
          )}

          {/* 🗺️ Κουμπί επιλογής τοποθεσίας (μόνο αν σχετικό) */}
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
              📍 Επιλογή Τοποθεσίας
            </button>
          )}

          {/* 📍 Απόσταση */}
          {tx.distance_km !== null && tx.distance_km !== undefined ? (
            <p style={{ color: "#555" }}>
              📍 Απόσταση:{" "}
              <strong style={{ color: "#007bff" }}>{tx.distance_km} km</strong>
            </p>
          ) : (
            <p style={{ color: "#999" }}>
              📍 Απόσταση: <em>—</em>
            </p>
          )}

          {/* 💬 Κουμπί συνομιλίας */}
          <button
            style={styles.chatButton}
            onClick={(e) => {
              e.stopPropagation();
              const receiverId =
                tx.owner?.id === user?.id ? tx.requester?.id : tx.owner?.id;
              setActiveChat({ transactionId: tx.id, receiverId });
            }}
          >
            💬 Συνομιλία
          </button>

          {/* --- Δράσεις ανά ρόλο --- */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {/* OWNER ACTIONS */}
            {isOwner && tx.status === "pending" && (
              <>
                {tx.transaction_type === "loan" && (
                  <div style={styles.inlineRow}>
                    <input
                      type="date"
                      value={loanDates.start_date || ""}
                      onChange={(e) =>
                        setLoanDates({
                          ...loanDates,
                          start_date: e.target.value,
                        })
                      }
                      style={styles.dateInput}
                    />
                    <input
                      type="date"
                      value={loanDates.end_date || ""}
                      onChange={(e) =>
                        setLoanDates({
                          ...loanDates,
                          end_date: e.target.value,
                        })
                      }
                      style={styles.dateInput}
                    />
                  </div>
                )}

                <button
                  style={styles.primaryBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept();
                  }}
                >
                  ✅ Αποδοχή
                </button>

                <button
                  style={styles.dangerBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject();
                  }}
                >
                  ❌ Απόρριψη
                </button>

                {tx.transaction_type === "exchange" && (
                  <button
                    style={styles.secondaryBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSelect();
                    }}
                  >
                    🎁 Επιλογή αντικειμένου
                  </button>
                )}
              </>
            )}

            {/* OWNER – ολοκλήρωση */}
            {isOwner &&
              (tx.status === "accepted" ||
                tx.status === "returned_by_requester") && (
                <button
                  style={styles.primaryBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                >
                  🏁 Ολοκλήρωση
                </button>
              )}

            {/* REQUESTER ACTIONS */}
            {isRequester && (
              <>
                {/* Ανταλλαγή: Pending confirmation */}
                {tx.transaction_type === "exchange" &&
                  tx.status === "pending_confirmation" && (
                    <>
                      <button
                        style={styles.primaryBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAccept();
                        }}
                      >
                        🔁 Επιβεβαίωση ανταλλαγής
                      </button>
                      <button
                        style={styles.dangerBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject();
                        }}
                      >
                        🚫 Απόρριψη
                      </button>
                    </>
                  )}

                {/* Δανεισμός: Accepted → Δήλωση επιστροφής */}
                {tx.transaction_type === "loan" && tx.status === "accepted" && (
                  <button
                    style={styles.secondaryBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(); // μπορείς να το αλλάξεις σε handleReturnLoan(tx.id)
                    }}
                  >
                    ↩️ Δήλωση επιστροφής
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------- Helpers & Styling ---------------------- */
function renderStatus(status) {
  switch (status) {
    case "pending":
      return "⏳ Σε εκκρεμότητα";
    case "pending_confirmation":
      return "🕒 Αναμένει επιβεβαίωση";
    case "pending_terms":
      return "📄 Αναμένει όρους";
    case "accepted":
      return "✅ Ενεργή";
    case "returned_by_requester":
      return "↩️ Δηλώθηκε επιστροφή";
    case "rejected":
      return "❌ Απορριφθείσα";
    case "completed":
      return "🏁 Ολοκληρωμένη";
    default:
      return status;
  }
}

function renderType(type) {
  switch (type) {
    case "exchange":
      return "🔁 Ανταλλαγή";
    case "loan":
      return "🤝 Δανεισμός";
    case "either":
      return "🔁🤝 Ανταλλαγή ή Δανεισμός";
    default:
      return type;
  }
}

function PaginationControls({ nextPage, prevPage, onPageChange }) {
  // Αν δεν υπάρχει προηγούμενη ούτε επόμενη → μην εμφανίζεις καθόλου
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
        ⬅️ Προηγούμενη
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
        Επόμενη ➡️
      </button>
    </div>
  );
}

/* Styling */
const styles = {
  container: { padding: "20px", maxWidth: "900px", margin: "0 auto" },
  section: { marginBottom: "30px" },
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
    background: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "15px",
    cursor: "pointer",
    transition: "background 0.2s ease",
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
  subTabContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "15px",
    marginTop: "10px",
  },
  subTab: {
    background: "#e0e0e0",
    border: "none",
    padding: "6px 14px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  activeSubTab: {
    background: "#28a745",
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  mapButton: {
    background: "#0078d4",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
};

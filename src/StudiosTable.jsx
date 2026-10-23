import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { isAuthorizedAdmin, getStoredSessionUser, ADMIN_AUTH_SECRET } from "./authUtils";
import { API_URL } from "./config";

export default function StudiosTable() {
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [editID, seteditID] = useState("");
  const [editfullName, seteditfullName] = useState("");
  const [editcheckIn, seteditcheckIn] = useState("");
  const [isModalOpen, setisModalOpen] = useState(false);

  const bookings_url = `${API_URL}/api/bookings`;

  // Enforce Admin Verification before rendering or fetching anything
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let authorized = false;
      let activeUser = null;

      if (firebaseUser) {
        activeUser = firebaseUser;
        let role = "user";

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists() && userDoc.data()?.role) {
            role = userDoc.data().role;
          }
        } catch (err) {
          console.warn("Firestore role check warning:", err);
        }

        if (isAuthorizedAdmin(firebaseUser.email, role)) {
          authorized = true;
        }
      }

      // Check stored session as fallback
      if (!authorized) {
        const stored = getStoredSessionUser();
        const storedAdminLogged = localStorage.getItem("casa_admin_logged") === "true";
        if (stored && isAuthorizedAdmin(stored.email, stored.role) && storedAdminLogged) {
          authorized = true;
          activeUser = stored;
        }
      }

      if (isMounted) {
        if (authorized) {
          setIsAdmin(true);
          setCurrentAdminUser(activeUser);
          setAuthChecking(false);
          fetchAdminBookings(activeUser);
        } else {
          setIsAdmin(false);
          setAuthChecking(false);
          // Non-admin or logged out: redirect to landing page
          setTimeout(() => {
            window.location.replace("/");
          }, 1500);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const getAdminHeaders = (user = currentAdminUser) => {
    const email = user?.email || "admin@casagracias.com";
    return {
      "Content-Type": "application/json",
      "x-admin-email": email,
      "x-admin-auth": ADMIN_AUTH_SECRET,
      "Authorization": `Bearer ${ADMIN_AUTH_SECRET}`,
    };
  };

  const fetchAdminBookings = async (user) => {
    setLoadingBookings(true);
    setErrorMessage("");
    try {
      const response = await fetch(bookings_url, {
        headers: getAdminHeaders(user),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access denied by backend API (Admin credentials required).");
        }
        throw new Error(`Failed to fetch bookings (${response.status})`);
      }

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Error fetching admin bookings:", err);
      setErrorMessage(err.message || "Failed to load bookings from backend.");
      // Fallback to local storage if remote backend is asleep/offline
      try {
        const local = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
        if (local.length > 0) {
          setBookings(local);
        }
      } catch {
        // ignore
      }
    } finally {
      setLoadingBookings(false);
    }
  };

  function openEditModal(booking) {
    setisModalOpen(true);
    seteditID(booking.id);
    seteditfullName(booking.fullName || "");
    seteditcheckIn(booking.checkIn || "");
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const response = await fetch(`${bookings_url}/${editID}`, {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          fullName: editfullName,
          checkIn: editcheckIn,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBookings((prev) => prev.map((b) => (b.id === editID ? data : b)));
      } else {
        // local update fallback
        setBookings((prev) =>
          prev.map((b) =>
            b.id === editID ? { ...b, fullName: editfullName, checkIn: editcheckIn } : b
          )
        );
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editID ? { ...b, fullName: editfullName, checkIn: editcheckIn } : b
        )
      );
    }

    setisModalOpen(false);
  }

  async function handleDelete(id) {
    if (!window.confirm(`Are you sure you want to delete booking ${id}?`)) return;

    try {
      const response = await fetch(`${bookings_url}/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });

      if (!response.ok) {
        console.warn("Delete endpoint returned non-200, updating locally");
      }
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Error deleting booking:", err);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    }
  }

  // 1. Show clean loading state while verifying admin credentials - NEVER flash table
  if (authChecking) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100" style={{ backgroundColor: "#eef2e6" }}>
        <div className="spinner-border text-success mb-3" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="fw-semibold text-muted small">Verifying admin access...</p>
      </div>
    );
  }

  // 2. Access Denied State for Non-Admin / Logged-Out Users
  if (!isAdmin) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100 text-center px-3" style={{ backgroundColor: "#eef2e6" }}>
        <div className="card shadow-sm p-4 rounded-4" style={{ maxWidth: 380, width: "100%", backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
          <div className="fs-1 mb-2">🔒</div>
          <h4 className="fw-bold text-danger mb-2">Access Denied</h4>
          <p className="text-muted small mb-4">
            This admin backend is restricted. Redirecting you to the landing page...
          </p>
          <a href="/" className="btn btn-dark rounded-pill px-4 fw-semibold w-100 py-2">
            Return to Home Now
          </a>
        </div>
      </div>
    );
  }

  // 3. Render Admin Backend Table (Mobile-First & Responsive)
  return (
    <div className="container py-4 px-2 px-sm-3" style={{ maxWidth: "900px" }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2 border-bottom pb-3">
        <div>
          <h2 className="fw-bold mb-0" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c", fontSize: "1.6rem" }}>
            Admin Bookings
          </h2>
          <small className="text-muted">Live Backend Database Management</small>
        </div>
        <div className="d-flex gap-2">
          <a href="/admin-dashboard.html" className="btn btn-sm btn-outline-dark rounded-pill px-3 fw-semibold">
            &larr; Dashboard
          </a>
          <button
            onClick={() => fetchAdminBookings(currentAdminUser)}
            className="btn btn-sm btn-outline-success rounded-pill px-3"
            disabled={loadingBookings}
          >
            {loadingBookings ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-warning small py-2 px-3 mb-3 d-flex justify-content-between align-items-center" role="alert">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="btn-close btn-sm" aria-label="Close"></button>
        </div>
      )}

      <div className="card shadow-sm border-0 rounded-4 overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle mb-0 table-responsive-cards" style={{ minWidth: "100%" }}>
            <thead style={{ backgroundColor: "#f4f7f2" }}>
              <tr style={{ color: "#2f4a3c", fontSize: "0.88rem" }}>
                <th className="py-3 px-3">Guest Details</th>
                <th className="py-3 px-2 text-center" style={{ width: "120px" }}>Check-in Date</th>
                <th className="py-3 px-3 text-center" style={{ width: "160px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-4 text-muted small">
                    {loadingBookings ? "Loading bookings from API..." : "No bookings found in database."}
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} style={{ fontSize: "0.88rem" }}>
                    <td className="card-header-cell py-2 px-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold fs-6 text-dark" style={{ wordBreak: "break-word" }}>
                          {booking.fullName || "Guest"}
                        </span>
                        <span className="badge bg-secondary font-monospace">
                          {booking.id}
                        </span>
                      </div>
                    </td>
                    <td data-label="Check-in Date" className="py-2 px-2 text-nowrap" style={{ fontSize: "0.88rem" }}>
                      {booking.checkIn || "N/A"}
                    </td>
                    <td className="card-action-cell py-2 px-2 text-center">
                      <div className="d-flex justify-content-center gap-2 w-100">
                        <button
                          type="button"
                          className="btn btn-outline-primary rounded-pill px-3"
                          style={{ minHeight: "40px", flex: "1 1 0" }}
                          onClick={() => openEditModal(booking)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger rounded-pill px-3"
                          style={{ minHeight: "40px", flex: "1 1 0" }}
                          onClick={() => handleDelete(booking.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="casa-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setisModalOpen(false); }}>
          <div className="casa-modal-card" style={{ width: "min(95vw, 450px)", maxHeight: "90vh" }}>
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ backgroundColor: "#2f4a3c" }}>
              <h6 className="modal-title fw-bold mb-0 text-white">Edit Booking</h6>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={() => setisModalOpen(false)}
              ></button>
            </div>
            <form onSubmit={handleUpdate} className="d-flex flex-column" style={{ overflow: "hidden" }}>
              <div className="casa-modal-scroll-body">
                <div className="mb-3 text-start">
                  <label htmlFor="editName" className="form-label small fw-semibold">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="editName"
                    value={editfullName}
                    onChange={(e) => seteditfullName(e.target.value)}
                    required
                    style={{ minHeight: "44px", fontSize: "16px" }}
                  />
                </div>
                <div className="mb-3 text-start">
                  <label htmlFor="editDate" className="form-label small fw-semibold">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="editDate"
                    value={editcheckIn}
                    onChange={(e) => seteditcheckIn(e.target.value)}
                    required
                    style={{ minHeight: "44px", fontSize: "16px" }}
                  />
                </div>
              </div>
              <div className="p-3 border-top bg-light d-flex justify-content-end gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4 flex-grow-1 flex-md-grow-0"
                  style={{ minHeight: "44px" }}
                  onClick={() => setisModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-pill px-4 flex-grow-1 flex-md-grow-0"
                  style={{ minHeight: "44px" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
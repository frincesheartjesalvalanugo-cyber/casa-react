import { useState, useEffect } from "react";
import ReceiptModal from "./ReceiptModal.jsx";
import StudiosTable from "./StudiosTable.jsx";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { isAuthorizedAdmin, getStoredSessionUser } from "./authUtils";

function AdminDashboard() {
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("All");

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");

  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [newBookingName, setNewBookingName] = useState("");
  const [newBookingEmail, setNewBookingEmail] = useState("");
  const [newBookingRoom, setNewBookingRoom] = useState("villa");
  const [newBookingCheckIn, setNewBookingCheckIn] = useState("");
  const [newBookingCheckOut, setNewBookingCheckOut] = useState("");
  const [newBookingGuests, setNewBookingGuests] = useState(2);

  const [historyOpen, setHistoryOpen] = useState({
    cancelled: true,
    ongoing: true,
    completed: false,
  });
  const [historyShowAll, setHistoryShowAll] = useState({
    cancelled: false,
    ongoing: false,
    completed: false,
  });
  const HISTORY_PREVIEW_COUNT = 5;

  // Verify Admin Authentication before loading dashboard
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let authorized = false;

      if (firebaseUser) {
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

      if (!authorized) {
        const stored = getStoredSessionUser();
        const storedAdminLogged = localStorage.getItem("casa_admin_logged") === "true";
        if (stored && isAuthorizedAdmin(stored.email, stored.role) && storedAdminLogged) {
          authorized = true;
        }
      }

      if (isMounted) {
        if (authorized) {
          setIsAdmin(true);
          setAuthChecking(false);
        } else {
          setIsAdmin(false);
          setAuthChecking(false);
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

  useEffect(() => {
    const savedUsers = localStorage.getItem("casa_registered_users");
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (e) {
        setUsers([]);
      }
    } else {
      setUsers([]);
      localStorage.setItem("casa_registered_users", JSON.stringify([]));
    }

    const savedBookings = localStorage.getItem("casa_bookings");
    if (savedBookings) {
      try {
        setBookings(JSON.parse(savedBookings));
      } catch (e) {
        setBookings([]);
      }
    } else {
      setBookings([]);
      localStorage.setItem("casa_bookings", JSON.stringify([]));
    }
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3500);
  };

  const handleLogout = () => {
    localStorage.removeItem("casa_admin_logged");
    localStorage.removeItem("casa_current_user");
    window.location.href = "/";
  };

  const updateUsers = (newUsersList) => {
    setUsers(newUsersList);
    localStorage.setItem("casa_registered_users", JSON.stringify(newUsersList));
  };

  const updateBookings = (newBookingsList) => {
    setBookings(newBookingsList);
    localStorage.setItem("casa_bookings", JSON.stringify(newBookingsList));
  };

  const handleToggleUserStatus = (userId) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === "Active" ? "Inactive" : "Active";
        showToast(`User ${u.name} status set to ${nextStatus}`);
        return { ...u, status: nextStatus };
      }
      return u;
    });
    updateUsers(updated);
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user ${userName}?`)) {
      const updated = users.filter((u) => u.id !== userId);
      updateUsers(updated);
      showToast(`User ${userName} deleted successfully.`);
    }
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const newUser = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: newUserName.trim() || newUserEmail.split("@")[0],
      email: newUserEmail.trim(),
      role: "Guest",
      dateRegistered: new Date().toISOString().split("T")[0],
      status: "Active",
    };

    const updated = [newUser, ...users];
    updateUsers(updated);
    showToast(`Account created for ${newUser.name}`);
    setNewUserName("");
    setNewUserEmail("");
    setShowAddUserModal(false);
  };

  const handleUpdateBookingStatus = (bookingId, newStatus) => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        return { ...b, status: newStatus };
      }
      return b;
    });
    updateBookings(updated);
    showToast(`Booking ${bookingId} status updated to ${newStatus}`);
  };

  const handleDeleteBooking = (bookingId) => {
    if (window.confirm(`Are you sure you want to remove booking ${bookingId}?`)) {
      const updated = bookings.filter((b) => b.id !== bookingId);
      updateBookings(updated);
      showToast(`Booking ${bookingId} removed.`);
    }
  };

  const handleViewReceipt = (booking) => {
    setSelectedBookingForReceipt(booking);
    setShowReceiptModal(true);
  };

  const handleCreateBooking = (e) => {
    e.preventDefault();
    if (!newBookingName || !newBookingEmail || !newBookingCheckIn || !newBookingCheckOut) {
      alert("Please fill in all booking fields.");
      return;
    }

    const basePricePerNight = newBookingRoom === "villa" ? 3500 : 2200;
    const nightCount =
      Math.max(
        1,
        Math.round(
          (new Date(newBookingCheckOut) - new Date(newBookingCheckIn)) / (1000 * 60 * 60 * 24)
        )
      ) || 1;

    const guestCount = Math.max(1, Number(newBookingGuests) || 1);
    const extraGuestRate = newBookingRoom === "villa" ? 500 : 300;
    const extraGuests = Math.max(0, guestCount - 2);
    const totalDailyRate = basePricePerNight + extraGuests * extraGuestRate;
    const total = nightCount * totalDailyRate;

    const bookingId = `BK-${Date.now().toString().slice(-6)}`;
    const receiptNo = `RCP-${bookingId}`;

    const newBooking = {
      id: bookingId,
      receiptNo: receiptNo,
      fullName: newBookingName.trim(),
      email: newBookingEmail.trim(),
      roomName: newBookingRoom === "villa" ? "Villa Type Room" : "Kubo Type Room",
      roomId: newBookingRoom,
      checkIn: newBookingCheckIn,
      checkOut: newBookingCheckOut,
      guests: guestCount,
      pricePerNight: basePricePerNight,
      nights: nightCount,
      subtotal: total,
      totalPrice: `₱${total.toLocaleString()}`,
      status: "Confirmed",
      dateCreated: new Date().toISOString().split("T")[0],
      createdAtMs: Date.now(),
    };

    const updatedBookings = [newBooking, ...bookings];
    updateBookings(updatedBookings);

    if (!users.some((u) => u.email.toLowerCase() === newBookingEmail.trim().toLowerCase())) {
      const autoUser = {
        id: `USR-${Math.floor(100 + Math.random() * 900)}`,
        name: newBookingName.trim(),
        email: newBookingEmail.trim(),
        role: "Guest",
        dateRegistered: new Date().toISOString().split("T")[0],
        status: "Active",
      };
      updateUsers([autoUser, ...users]);
    }

    showToast(`New booking ${newBooking.id} created for ${newBooking.fullName}`);
    setNewBookingName("");
    setNewBookingEmail("");
    setNewBookingCheckIn("");
    setNewBookingCheckOut("");
    setShowAddBookingModal(false);

    setSelectedBookingForReceipt(newBooking);
    setShowReceiptModal(true);
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.fullName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.email.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.roomName.toLowerCase().includes(bookingSearch.toLowerCase());

    const matchesStatus =
      bookingStatusFilter === "All" ? true : b.status.toLowerCase() === bookingStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase());

    const matchesStatus =
      userStatusFilter === "All" ? true : u.status.toLowerCase() === userStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === "Active").length;
  const totalBookingsCount = bookings.length;
  const confirmedBookingsCount = bookings.filter((b) => b.status === "Confirmed").length;
  const pendingBookingsCount = bookings.filter((b) => b.status === "Pending").length;
  const cancelledBookingsCount = bookings.filter((b) => b.status === "Cancelled").length;

  const totalEstRevenue = bookings
    .filter((b) => b.status === "Confirmed")
    .reduce((sum, b) => {
      const numeric = parseInt(b.totalPrice.replace(/[^0-9]/g, "")) || 0;
      return sum + numeric;
    }, 0);

  const VILLA_TOTAL = 3;
  const KUBO_TOTAL = 5;
  const villaOccupied = bookings.filter((b) => b.roomId === "villa" && (b.status === "Confirmed" || b.status === "Pending")).length;
  const villaAvailable = Math.max(0, VILLA_TOTAL - villaOccupied);
  const kuboOccupied = bookings.filter((b) => b.roomId === "kubo" && (b.status === "Confirmed" || b.status === "Pending")).length;
  const kuboAvailable = Math.max(0, KUBO_TOTAL - kuboOccupied);

  const todayStr = new Date().toISOString().split("T")[0];
  const cancelledBookingsList = bookings.filter((b) => b.status === "Cancelled");
  const ongoingBookingsList = bookings.filter(
    (b) => b.status !== "Cancelled" && b.checkOut >= todayStr
  );
  const completedBookingsList = bookings.filter(
    (b) => b.status !== "Cancelled" && b.checkOut < todayStr
  );

  const toggleHistorySection = (key) => {
    setHistoryOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleShowAll = (key) => {
    setHistoryShowAll((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderHistoryTable = (key, title, icon, colorClass, headerBg, list, showStatusColumn) => {
    const isOpen = historyOpen[key];
    const showAll = historyShowAll[key];
    const visibleList = showAll ? list : list.slice(0, HISTORY_PREVIEW_COUNT);

    return (
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
        <div
          className="d-flex justify-content-between align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => toggleHistorySection(key)}
        >
          <h5 className={`fw-bold mb-0 ${colorClass}`}>
            {icon} {title} ({list.length})
          </h5>
          <span className="fs-5">{isOpen ? "▲" : "▼"}</span>
        </div>

        {isOpen && (
          <div className="mt-3">
            {list.length === 0 ? (
              <p className="text-muted text-center py-3">No records in this category.</p>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead style={{ backgroundColor: headerBg }}>
                      <tr>
                        <th>Booking ID</th>
                        <th>Guest Details</th>
                        <th>Room Type</th>
                        <th>Check In / Out</th>
                        <th>Total Amount</th>
                        {showStatusColumn && <th>Status</th>}
                        <th className="text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleList.map((b) => (
                        <tr key={b.id}>
                          <td><span className="badge bg-dark font-monospace px-2 py-1">{b.id}</span></td>
                          <td>
                            <div className="fw-bold">{b.fullName}</div>
                            <div className="small text-muted">{b.email}</div>
                          </td>
                          <td>
                            <span className={`badge ${b.roomId === "villa" ? "bg-success" : "bg-warning text-dark"}`}>
                              {b.roomName}
                            </span>
                          </td>
                          <td className="small">
                            <div><strong>In:</strong> {b.checkIn}</div>
                            <div><strong>Out:</strong> {b.checkOut}</div>
                          </td>
                          <td className="fw-bold text-success">{b.totalPrice}</td>
                          {showStatusColumn && (
                            <td>
                              <span className={`badge rounded-pill px-3 py-2 ${b.status === "Confirmed" ? "bg-success" : "bg-warning text-dark"}`}>
                                {b.status}
                              </span>
                            </td>
                          )}
                          <td className="text-center">
                            <button
                              onClick={() => handleViewReceipt(b)}
                              className="btn btn-sm btn-outline-dark rounded-pill px-3"
                            >
                              🧾 Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {list.length > HISTORY_PREVIEW_COUNT && (
                  <div className="text-center mt-2">
                    <button
                      onClick={() => toggleShowAll(key)}
                      className="btn btn-sm btn-outline-secondary rounded-pill px-4"
                    >
                      {showAll ? "Show Less" : `View All (${list.length})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Auth guard: loading screen & access denial redirect
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

  if (!isAdmin) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100 text-center px-3" style={{ backgroundColor: "#eef2e6" }}>
        <div className="card shadow-sm p-4 rounded-4" style={{ maxWidth: 380, width: "100%", backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
          <div className="fs-1 mb-2">🔒</div>
          <h4 className="fw-bold text-danger mb-2">Access Denied</h4>
          <p className="text-muted small mb-4">
            You must be logged in as an authorized admin to view this backend. Redirecting to home...
          </p>
          <a href="/" className="btn btn-dark rounded-pill px-4 fw-semibold w-100 py-2">
            Return to Landing Page
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f4f7f1", minHeight: "100vh", color: "#2f4a3c" }}>
      <nav className="navbar navbar-expand-lg px-4 shadow-sm" style={{ backgroundColor: "#2f4a3c" }}>
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4">🌴</span>
            <div>
              <span className="navbar-brand fw-bold text-white mb-0 fs-5" style={{ letterSpacing: "0.5px" }}>
                Casa Gracia's Hotel
              </span>
              <span className="badge ms-2 rounded-pill" style={{ backgroundColor: "#6b8f5e", fontSize: "0.7rem" }}>
                ADMIN DASHBOARD
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <a href="/" className="btn btn-sm btn-outline-light rounded-pill px-3">
              View Website &rarr;
            </a>
            <button onClick={handleLogout} className="btn btn-sm btn-danger rounded-pill px-3">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {toastMessage && (
        <div
          className="position-fixed top-0 end-0 p-3"
          style={{ zIndex: 1080, marginTop: "60px" }}
        >
          <div className="toast show align-items-center text-white border-0 shadow-lg" style={{ backgroundColor: "#2f4a3c" }}>
            <div className="d-flex">
              <div className="toast-body fs-6 fw-semibold">
                ✓ {toastMessage}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setToastMessage("")}
              ></button>
            </div>
          </div>
        </div>
      )}

      <div className="container py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
              Admin Control Center
            </h2>
            <p className="text-muted small mb-0">
              Manage registered user accounts, view active bookings, and update room availability.
            </p>
          </div>
          <div className="d-flex gap-2 mt-2 mt-md-0">
            <button
              onClick={() => setShowAddBookingModal(true)}
              className="btn btn-sm text-white rounded-pill px-3 shadow-sm fw-bold"
              style={{ backgroundColor: "#6b8f5e" }}
            >
              + New Booking
            </button>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="btn btn-sm text-white rounded-pill px-3 shadow-sm fw-bold"
              style={{ backgroundColor: "#2f4a3c" }}
            >
              + Register User
            </button>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100" style={{ borderLeft: "4px solid #6b8f5e" }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Registered Accounts</div>
                  <div className="fs-3 fw-bold mt-1" style={{ color: "#2f4a3c" }}>{totalUsersCount}</div>
                  <div className="small text-success">{activeUsersCount} Active Users</div>
                </div>
                <span className="p-3 rounded-circle" style={{ backgroundColor: "#eef2e6", fontSize: "1.5rem" }}>👥</span>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100" style={{ borderLeft: "4px solid #2f4a3c" }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Total Bookings</div>
                  <div className="fs-3 fw-bold mt-1" style={{ color: "#2f4a3c" }}>{totalBookingsCount}</div>
                  <div className="small text-primary">{confirmedBookingsCount} Confirmed</div>
                </div>
                <span className="p-3 rounded-circle" style={{ backgroundColor: "#eef2e6", fontSize: "1.5rem" }}>📅</span>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100" style={{ borderLeft: "4px solid #ffc107" }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Pending Approvals</div>
                  <div className="fs-3 fw-bold mt-1" style={{ color: "#856404" }}>{pendingBookingsCount}</div>
                  <div className="small text-muted">{cancelledBookingsCount} Cancelled</div>
                </div>
                <span className="p-3 rounded-circle" style={{ backgroundColor: "#fff3cd", fontSize: "1.5rem" }}>⏳</span>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100" style={{ borderLeft: "4px solid #198754" }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Est. Revenue</div>
                  <div className="fs-3 fw-bold mt-1" style={{ color: "#198754" }}>₱{totalEstRevenue.toLocaleString()}</div>
                  <div className="small text-muted">From confirmed stays</div>
                </div>
                <span className="p-3 rounded-circle" style={{ backgroundColor: "#d1e7dd", fontSize: "1.5rem" }}>💰</span>
              </div>
            </div>
          </div>
        </div>

        <ul className="nav nav-pills mb-4 bg-white p-2 rounded-4 shadow-sm">
          <li className="nav-item">
            <button
              className={`nav-item nav-link rounded-pill fw-semibold me-1 ${activeTab === "overview" ? "active text-white" : "text-dark"}`}
              style={{ backgroundColor: activeTab === "overview" ? "#2f4a3c" : "transparent" }}
              onClick={() => setActiveTab("overview")}
            >
              📊 Overview
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-item nav-link rounded-pill fw-semibold me-1 ${activeTab === "bookings" ? "active text-white" : "text-dark"}`}
              style={{ backgroundColor: activeTab === "bookings" ? "#2f4a3c" : "transparent" }}
              onClick={() => setActiveTab("bookings")}
            >
              📅 All Bookings ({bookings.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-item nav-link rounded-pill fw-semibold me-1 ${activeTab === "users" ? "active text-white" : "text-dark"}`}
              style={{ backgroundColor: activeTab === "users" ? "#2f4a3c" : "transparent" }}
              onClick={() => setActiveTab("users")}
            >
              👥 Registered Accounts ({users.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-item nav-link rounded-pill fw-semibold me-1 ${activeTab === "rooms" ? "active text-white" : "text-dark"}`}
              style={{ backgroundColor: activeTab === "rooms" ? "#2f4a3c" : "transparent" }}
              onClick={() => setActiveTab("rooms")}
            >
              🏡 Room Management
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-item nav-link rounded-pill fw-semibold ${activeTab === "history" ? "active text-white" : "text-dark"}`}
              style={{ backgroundColor: activeTab === "history" ? "#2f4a3c" : "transparent" }}
              onClick={() => setActiveTab("history")}
            >
              🗂️ Booking History
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-item nav-link rounded-pill fw-semibold ${activeTab === "liveTable" ? "active text-white" : "text-dark"}`}
              style={{ backgroundColor: activeTab === "liveTable" ? "#2f4a3c" : "transparent" }}
              onClick={() => setActiveTab("liveTable")}
            >
              ⚡ Live Backend Table
            </button>
          </li>
        </ul>

        {activeTab === "liveTable" && (
          <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 bg-white mb-5">
            <StudiosTable />
          </div>
        )}

        {activeTab === "overview" && (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0" style={{ color: "#2f4a3c" }}>Recent Booking Requests</h5>
                  <button onClick={() => setActiveTab("bookings")} className="btn btn-sm btn-link text-decoration-none fw-semibold" style={{ color: "#6b8f5e" }}>
                    View All &rarr;
                  </button>
                </div>
                {bookings.length === 0 ? (
                  <p className="text-muted text-center py-4">No bookings available.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Guest</th>
                          <th>Room</th>
                          <th>Dates</th>
                          <th>Status</th>
                          <th className="text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.slice(0, 5).map((b) => (
                          <tr key={b.id}>
                            <td><span className="badge bg-light text-dark fw-mono">{b.id}</span></td>
                            <td>
                              <div className="fw-bold">{b.fullName}</div>
                              <div className="small text-muted">{b.email}</div>
                            </td>
                            <td>
                              <span className={`badge ${b.roomId === "villa" ? "bg-success" : "bg-warning text-dark"}`}>
                                {b.roomName}
                              </span>
                            </td>
                            <td className="small">{b.checkIn} to {b.checkOut}</td>
                            <td>
                              <span className={`badge ${b.status === "Confirmed" ? "bg-success" : b.status === "Pending" ? "bg-warning text-dark" : "bg-danger"}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => handleViewReceipt(b)}
                                className="btn btn-sm btn-outline-dark rounded-pill px-3"
                                title="View Printable Receipt & Confirmation Email"
                              >
                                🧾 Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0" style={{ color: "#2f4a3c" }}>Recently Registered Users</h5>
                  <button onClick={() => setActiveTab("users")} className="btn btn-sm btn-link text-decoration-none fw-semibold" style={{ color: "#6b8f5e" }}>
                    View All &rarr;
                  </button>
                </div>
                {users.length === 0 ? (
                  <p className="text-muted text-center py-4">No users registered.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {users.slice(0, 5).map((u) => (
                      <li key={u.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: 40, height: 40, backgroundColor: "#2f4a3c" }}>
                            {u.name ? u.name[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="fw-bold mb-0">{u.name}</div>
                            <div className="small text-muted">{u.email}</div>
                          </div>
                        </div>
                        <span className={`badge rounded-pill ${u.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                          {u.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="row g-3 align-items-center mb-4">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">🔍</span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search by Guest Name, Email, Booking ID, or Room..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="d-flex align-items-center gap-2">
                  <label className="small text-muted fw-semibold mb-0">Status:</label>
                  <select
                    className="form-select bg-light"
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="col-md-2 text-end">
                <button
                  onClick={() => setShowAddBookingModal(true)}
                  className="btn btn-sm text-white w-100 rounded-pill py-2 fw-bold"
                  style={{ backgroundColor: "#6b8f5e" }}
                >
                  + Add Booking
                </button>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <h5>No bookings match your search or filter.</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead style={{ backgroundColor: "#eef2e6" }}>
                    <tr>
                      <th>Booking ID</th>
                      <th>Guest Details</th>
                      <th>Room Type</th>
                      <th>Check In / Out</th>
                      <th>Guests</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <span className="badge bg-dark font-monospace px-2 py-1">{b.id}</span>
                        </td>
                        <td>
                          <div className="fw-bold">{b.fullName}</div>
                          <div className="small text-muted">{b.email}</div>
                        </td>
                        <td>
                          <span className={`badge ${b.roomId === "villa" ? "bg-success" : "bg-warning text-dark"}`}>
                            {b.roomName}
                          </span>
                        </td>
                        <td className="small">
                          <div><strong>In:</strong> {b.checkIn}</div>
                          <div><strong>Out:</strong> {b.checkOut}</div>
                        </td>
                        <td className="text-center fw-semibold">{b.guests}</td>
                        <td className="fw-bold text-success">{b.totalPrice}</td>
                        <td>
                          <span className={`badge rounded-pill px-3 py-2 ${b.status === "Confirmed" ? "bg-success" : b.status === "Pending" ? "bg-warning text-dark" : "bg-danger"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              onClick={() => handleViewReceipt(b)}
                              className="btn btn-outline-primary"
                              title="View Official Receipt & Confirmation Email"
                            >
                              🧾 Receipt
                            </button>
                            {b.status !== "Confirmed" && b.status !== "Cancelled" && (
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, "Confirmed")}
                                className="btn btn-outline-success"
                                title="Approve / Confirm Booking"
                              >
                                Confirm
                              </button>
                            )}
                            {b.status !== "Cancelled" && (
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, "Cancelled")}
                                className="btn btn-outline-warning"
                                title="Cancel Booking"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="btn btn-outline-danger"
                              title="Delete Record"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="row g-3 align-items-center mb-4">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">🔍</span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search registered accounts by name, email, ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="d-flex align-items-center gap-2">
                  <label className="small text-muted fw-semibold mb-0">Status:</label>
                  <select
                    className="form-select bg-light"
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                  >
                    <option value="All">All Users</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="col-md-2 text-end">
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="btn btn-sm text-white w-100 rounded-pill py-2 fw-bold"
                  style={{ backgroundColor: "#2f4a3c" }}
                >
                  + Add User
                </button>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <h5>No registered users found.</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead style={{ backgroundColor: "#eef2e6" }}>
                    <tr>
                      <th>User ID</th>
                      <th>Account Name</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Date Registered</th>
                      <th>Bookings</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const userBookingsCount = bookings.filter((b) => b.email.toLowerCase() === u.email.toLowerCase()).length;
                      return (
                        <tr key={u.id}>
                          <td>
                            <span className="badge bg-secondary font-monospace px-2 py-1">{u.id}</span>
                          </td>
                          <td className="fw-bold">{u.name}</td>
                          <td className="text-muted">{u.email}</td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {u.role || "Guest"}
                            </span>
                          </td>
                          <td className="small text-muted">{u.dateRegistered}</td>
                          <td className="text-center">
                            <span className="badge rounded-pill bg-info text-dark">
                              {userBookingsCount} booking(s)
                            </span>
                          </td>
                          <td>
                            <span className={`badge rounded-pill px-3 py-2 ${u.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                onClick={() => handleToggleUserStatus(u.id)}
                                className={`btn ${u.status === "Active" ? "btn-outline-secondary" : "btn-outline-success"}`}
                              >
                                {u.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="btn btn-outline-danger"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "rooms" && (
          <div>
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h5 className="fw-bold mb-3" style={{ color: "#2f4a3c" }}>🏠 Room Availability Overview</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="rounded-3 p-3 text-center" style={{ backgroundColor: "#eef2e6", border: "1px solid #c8dfc0" }}>
                    <div className="small text-muted fw-semibold text-uppercase mb-1">Total Rooms</div>
                    <div className="fs-2 fw-bold" style={{ color: "#2f4a3c" }}>{VILLA_TOTAL + KUBO_TOTAL}</div>
                    <div className="small text-muted">{VILLA_TOTAL} Villa + {KUBO_TOTAL} Kubo</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="rounded-3 p-3 text-center" style={{ backgroundColor: "#fff3cd", border: "1px solid #ffc107" }}>
                    <div className="small fw-semibold text-uppercase mb-1" style={{ color: "#856404" }}>Occupied / Reserved</div>
                    <div className="fs-2 fw-bold" style={{ color: "#856404" }}>{villaOccupied + kuboOccupied}</div>
                    <div className="small" style={{ color: "#856404" }}>{villaOccupied} Villa · {kuboOccupied} Kubo</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="rounded-3 p-3 text-center" style={{ backgroundColor: "#d1e7dd", border: "1px solid #198754" }}>
                    <div className="small fw-semibold text-uppercase mb-1" style={{ color: "#0f5132" }}>Available</div>
                    <div className="fs-2 fw-bold" style={{ color: "#0f5132" }}>{villaAvailable + kuboAvailable}</div>
                    <div className="small" style={{ color: "#0f5132" }}>{villaAvailable} Villa · {kuboAvailable} Kubo</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold mb-0" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
                      Villa Type Room
                    </h4>
                    <span className={`badge rounded-pill px-3 py-2 ${villaAvailable > 0 ? "bg-success" : "bg-danger"}`}>
                      {villaAvailable > 0 ? "Available" : "Fully Booked"}
                    </span>
                  </div>
                  <img src="/villa-1.jpg" alt="Villa" className="rounded-3 mb-3" style={{ height: "200px", objectFit: "cover" }} />
                  <p className="text-muted small">
                    Spacious luxury air-conditioned accommodations suitable for family stays and small groups.
                  </p>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <div className="text-center p-2 rounded-3" style={{ backgroundColor: "#eef2e6" }}>
                        <div className="fw-bold fs-5" style={{ color: "#2f4a3c" }}>{VILLA_TOTAL}</div>
                        <div className="small text-muted">Total</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="text-center p-2 rounded-3" style={{ backgroundColor: "#fff3cd" }}>
                        <div className="fw-bold fs-5" style={{ color: "#856404" }}>{villaOccupied}</div>
                        <div className="small" style={{ color: "#856404" }}>Reserved</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="text-center p-2 rounded-3" style={{ backgroundColor: "#d1e7dd" }}>
                        <div className="fw-bold fs-5" style={{ color: "#0f5132" }}>{villaAvailable}</div>
                        <div className="small" style={{ color: "#0f5132" }}>Available</div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                    <div>
                      <span className="small text-muted">Price Rate</span>
                      <h5 className="fw-bold mb-0" style={{ color: "#2f4a3c" }}>₱3,500 / night</h5>
                    </div>
                    <span className="badge bg-light text-dark p-2 border">
                      {bookings.filter((b) => b.roomId === "villa" && b.status === "Confirmed").length} Confirmed
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold mb-0" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
                      Kubo Type Room
                    </h4>
                    <span className={`badge rounded-pill px-3 py-2 ${kuboAvailable > 0 ? "bg-success" : "bg-danger"}`}>
                      {kuboAvailable > 0 ? "Available" : "Fully Booked"}
                    </span>
                  </div>
                  <img src="/kubo-1.jpg" alt="Kubo" className="rounded-3 mb-3" style={{ height: "200px", objectFit: "cover" }} />
                  <p className="text-muted small">
                    Cozy tropical bamboo kubo experience surrounded by nature and refreshing natural breeze.
                  </p>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <div className="text-center p-2 rounded-3" style={{ backgroundColor: "#eef2e6" }}>
                        <div className="fw-bold fs-5" style={{ color: "#2f4a3c" }}>{KUBO_TOTAL}</div>
                        <div className="small text-muted">Total</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="text-center p-2 rounded-3" style={{ backgroundColor: "#fff3cd" }}>
                        <div className="fw-bold fs-5" style={{ color: "#856404" }}>{kuboOccupied}</div>
                        <div className="small" style={{ color: "#856404" }}>Reserved</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="text-center p-2 rounded-3" style={{ backgroundColor: "#d1e7dd" }}>
                        <div className="fw-bold fs-5" style={{ color: "#0f5132" }}>{kuboAvailable}</div>
                        <div className="small" style={{ color: "#0f5132" }}>Available</div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                    <div>
                      <span className="small text-muted">Price Rate</span>
                      <h5 className="fw-bold mb-0" style={{ color: "#2f4a3c" }}>₱2,200 / night</h5>
                    </div>
                    <span className="badge bg-light text-dark p-2 border">
                      {bookings.filter((b) => b.roomId === "kubo" && b.status === "Confirmed").length} Confirmed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            {renderHistoryTable(
              "cancelled",
              "Cancelled Bookings",
              "🚫",
              "text-danger",
              "#f8d7da",
              cancelledBookingsList,
              false
            )}
            {renderHistoryTable(
              "ongoing",
              "Ongoing Bookings",
              "🕒",
              "text-primary",
              "#cfe2ff",
              ongoingBookingsList,
              true
            )}
            {renderHistoryTable(
              "completed",
              "Completed Stays",
              "✅",
              "text-success",
              "#d1e7dd",
              completedBookingsList,
              false
            )}
          </div>
        )}
      </div>

      {showAddUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg p-3">
              <div className="modal-header border-0">
                <h5 className="modal-header-title fw-bold" style={{ color: "#2f4a3c" }}>
                  Register New User Account
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddUserModal(false)}></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Maria Santos"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="name@example.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowAddUserModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn text-white rounded-pill px-4 fw-bold" style={{ backgroundColor: "#2f4a3c" }}>
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAddBookingModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg p-3">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold" style={{ color: "#2f4a3c" }}>
                  Add New Reservation / Booking
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddBookingModal(false)}></button>
              </div>
              <form onSubmit={handleCreateBooking}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Guest Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Juan Dela Cruz"
                        value={newBookingName}
                        onChange={(e) => setNewBookingName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Email Address *</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="guest@example.com"
                        value={newBookingEmail}
                        onChange={(e) => setNewBookingEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Room Selection</label>
                      <select
                        className="form-select"
                        value={newBookingRoom}
                        onChange={(e) => setNewBookingRoom(e.target.value)}
                      >
                        <option value="villa">Villa Type Room (₱3,500/night)</option>
                        <option value="kubo">Kubo Type Room (₱2,200/night)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Guests Count</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={newBookingGuests}
                        onChange={(e) => setNewBookingGuests(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Check-in Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newBookingCheckIn}
                        onChange={(e) => setNewBookingCheckIn(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Check-out Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newBookingCheckOut}
                        onChange={(e) => setNewBookingCheckOut(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowAddBookingModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn text-white rounded-pill px-4 fw-bold" style={{ backgroundColor: "#6b8f5e" }}>
                    Confirm Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedBookingForReceipt && (
        <ReceiptModal
          booking={selectedBookingForReceipt}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
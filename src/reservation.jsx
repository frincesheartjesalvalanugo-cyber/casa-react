import { useState, useEffect, useRef } from "react";
import ReceiptModal from "./ReceiptModal.jsx";

function Reservation() {
  const [activeCategory, setActiveCategory] = useState("villa"); 
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [createdBooking, setCreatedBooking] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [allBookings, setAllBookings] = useState([]);
  const [lookupToast, setLookupToast] = useState("");

  const categoryContainerRef = useRef(null);

  const rooms = [
    { id: "villa-1", name: "Villa 1", type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg" },
    { id: "villa-2", name: "Villa 2", type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg" },
    { id: "villa-3", name: "Villa 3", type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg" },
    { id: "villa-4", name: "Villa 4", type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg" },
    { id: "villa-5", name: "Villa 5", type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg" },

    { id: "kubo-1", name: "Kubo 1", type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg" },
    { id: "kubo-2", name: "Kubo 2", type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg" },
    { id: "kubo-3", name: "Kubo 3", type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg" },
    { id: "kubo-4", name: "Kubo 4", type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg" },
    { id: "kubo-5", name: "Kubo 5", type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg" },
  ];

  const categories = [
    {
      id: "villa",
      name: "Villa Type Room",
      price: "₱3,500 / night",
      image: "/villa-1.jpg",
      description: "Spacious air-conditioned rooms designed for family comfort.",
    },
    {
      id: "kubo",
      name: "Kubo Type Room",
      price: "₱2,200 / night",
      image: "/kubo-1.jpg",
      description: "Cozy tropical kubo experience surrounded by natural breeze.",
    },
  ];

  const getDynamicStatus = (booking) => {
    if (booking.status === "Cancelled") return "Cancelled";
    if (booking.status === "Pending") return "Pending";

    if (booking.status === "Confirmed") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkOutDate = new Date(booking.checkOut);
      checkOutDate.setHours(0, 0, 0, 0);

      if (today > checkOutDate) {
        return "Completed";
      }
      return "Confirmed";
    }

    return booking.status || "Pending";
  };

  const isRoomReserved = (roomId) => {
    if (!roomId) return false;
    try {
      const savedBookings = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
      return savedBookings.some((b) => {
        const activeStatus = getDynamicStatus(b);
        const isMatch = b.roomId === roomId || b.roomName?.includes(roomId);
        const isActiveBooking = activeStatus === "Pending" || activeStatus === "Confirmed";

        if (!isMatch || !isActiveBooking) return false;

        if (checkIn && checkOut && b.checkIn && b.checkOut) {
          const reqStart = new Date(checkIn);
          const reqEnd = new Date(checkOut);
          const bStart = new Date(b.checkIn);
          const bEnd = new Date(b.checkOut);

          return reqStart < bEnd && reqEnd > bStart;
        }

        return true;
      });
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const getLoggedInUser = () => {
    try {
      const keys = ["casa_current_user", "currentUser", "user", "loggedUser", "casa_user"];
      for (const key of keys) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && (parsed.email || parsed.userEmail)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error("Error reading login session:", e);
    }
    return null;
  };

  const loadAllBookings = (targetEmail) => {
    try {
      const savedBookings = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
      const sessionUser = getLoggedInUser();

      const activeEmail = (
        targetEmail || 
        sessionUser?.email || 
        sessionUser?.userEmail || 
        email
      )?.trim().toLowerCase();

      if (activeEmail) {
        const userOnlyBookings = savedBookings.filter(
          (b) => b.email?.trim().toLowerCase() === activeEmail
        );
        setAllBookings(userOnlyBookings);
      } else {
        setAllBookings([]);
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    
    let initialCat = "villa";
    if (roomParam === "kubo" || roomParam === "villa") {
      initialCat = roomParam;
    }
    
    setActiveCategory(initialCat);
    const categoryRooms = rooms.filter((r) => r.type === initialCat);
    const availableDefault = categoryRooms.find((r) => !isRoomReserved(r.id)) || categoryRooms[0];
    setSelectedRoom(availableDefault);

    const sessionUser = getLoggedInUser();
    if (sessionUser) {
      const userEmail = sessionUser.email || sessionUser.userEmail || "";
      const userName = sessionUser.name || sessionUser.fullName || sessionUser.userName || "";

      if (userName) setFullName(userName);
      if (userEmail) {
        setEmail(userEmail);
        loadAllBookings(userEmail);
      }
    } else {
      loadAllBookings();
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(event.target)
      ) {
        setActiveCategory(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (activeCategory) {
      const availableRooms = rooms.filter((r) => r.type === activeCategory);
      const firstAvailable = availableRooms.find((r) => !isRoomReserved(r.id));
      setSelectedRoom(firstAvailable || availableRooms[0]);
    }
  }, [activeCategory]);

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const isBookingWithin24Hours = (b) => {
    if (!b) return true;
    let createdMs = b.createdAtMs;
    if (!createdMs && b.dateCreated) {
      createdMs = new Date(b.dateCreated).getTime();
    }
    if (!createdMs || isNaN(createdMs)) return true;

    const elapsedMs = Date.now() - createdMs;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    return elapsedHours <= 24;
  };

  const nightsCount = calculateNights();
  const basePricePerNight = selectedRoom ? selectedRoom.priceNum : 0;
  const effectiveNights = nightsCount > 0 ? nightsCount : 1;
  const guestCount = Math.max(1, Number(guests) || 1);

  const extraGuestRate = selectedRoom?.type === "villa" ? 500 : 300;
  const extraGuests = Math.max(0, guestCount - 2);
  const extraGuestFeePerNight = extraGuests * extraGuestRate;
  const totalDailyRate = basePricePerNight + extraGuestFeePerNight;

  const calculatedTotal = totalDailyRate * effectiveNights;
  const vatIncluded = Math.round(calculatedTotal * 0.12);

  async function handleSubmit(event) {
        event.preventDefault()
        try {
            await fetch('http://localhost:8080/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setfullName: fullName,
                    setEmail: email,
                    setCheckIn: checkIn,
                    setCheckOut: checkOut,
                    setGuests: guests
                })
            })
        } catch (err) {
            console.log(err);
        }
        
    }

  const handleCancelBookingFromList = (booking) => {
    const bookingId = booking.id;
    const canSelfCancel = isBookingWithin24Hours(booking);

    if (!canSelfCancel) {
      alert(
        `🔒 24-Hour Self-Cancellation Period Expired:\n\nMore than 24 hours have passed since booking ${bookingId} was created.\nIn accordance with hotel policy, self-cancellation is no longer permitted.\n\nPlease contact Casa Gracia Admin directly to request cancellation:\n• Phone: +63 (0912) 345-6789\n• Email: reservations@casagracia.com`
      );
      return;
    }

    if (window.confirm(`Are you sure you want to cancel booking ${bookingId}?`)) {
      try {
        const savedBookings = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
        const updated = savedBookings.map((b) =>
          b.id === bookingId ? { ...b, status: "Cancelled" } : b
        );
        localStorage.setItem("casa_bookings", JSON.stringify(updated));

        loadAllBookings();

        if (createdBooking && createdBooking.id === bookingId) {
          setCreatedBooking((prev) => ({ ...prev, status: "Cancelled" }));
        }

        setLookupToast(`Booking ${bookingId} has been successfully cancelled.`);
        setTimeout(() => setLookupToast(""), 4000);
      } catch (err) {
        console.error("Error cancelling booking:", err);
      }
    }
  };

  const handleReceiptCancelCallback = (cancelledBookingId) => {
    setCreatedBooking((prev) => (prev && prev.id === cancelledBookingId ? { ...prev, status: "Cancelled" } : prev));
    loadAllBookings();
  };

  return (
    <div style={{ backgroundColor: "#eef2e6", minHeight: "100vh" }}>
      <nav className="navbar navbar-expand-lg px-4" style={{ backgroundColor: "#2f4a3c", borderBottom: "1px solid #24392e" }}>
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <a className="navbar-brand fw-bold fs-4 text-white" href="/" style={{ letterSpacing: "1px" }}>
            Casa Gracia's
          </a>
          <a href="/" className="btn btn-outline-light btn-sm rounded-pill px-4">
            &larr; Back to Home
          </a>
        </div>
      </nav>

      <header className="text-center py-5" style={{ backgroundColor: "#2f4a3c", borderBottom: "1px solid #24392e" }}>
        <h1 className="fw-bold text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "1px" }}>
          Reserve Your Stay
        </h1>
        <p style={{ color: "#c8d4bf" }}>
          Choose your room, view instant price breakdown based on guests & days, and receive your receipt.
        </p>
      </header>

      <div className="container py-5">
        <h4 className="fw-bold mb-4 text-center" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
          Step 1: Select Accommodation Category
        </h4>

        <div ref={categoryContainerRef}>
          <div className="row g-4 justify-content-center mb-4">
            {categories.map((cat) => (
              <div className="col-md-5" key={cat.id}>
                <div
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    cursor: "pointer",
                    border: activeCategory === cat.id ? "3px solid #6b8f5e" : "2px solid #d8e0c9",
                    borderRadius: "1rem",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    transition: "all 0.2s ease",
                    boxShadow: activeCategory === cat.id ? "0 8px 24px rgba(107, 143, 94, 0.25)" : "none",
                  }}
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    style={{ width: "100%", height: "200px", objectFit: "cover" }}
                  />
                  <div className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h4 className="fw-bold mb-0" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
                        {cat.name}
                      </h4>
                      {activeCategory === cat.id && (
                        <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: "#6b8f5e", color: "#ffffff" }}>
                          ✓ Active Category
                        </span>
                      )}
                    </div>
                    <p className="small mb-2 text-muted">{cat.description}</p>
                    <p className="fw-bold fs-5 mb-0" style={{ color: "#2f4a3c" }}>
                      {cat.price}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {activeCategory && (
            <div className="p-4 rounded-4 mb-5 shadow-sm" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
              <h5 className="fw-bold mb-3 text-center" style={{ color: "#2f4a3c" }}>
                Select Specific {activeCategory === "villa" ? "Villa Unit" : "Kubo Unit"}
              </h5>
              <div className="row g-3 justify-content-center">
                {rooms
                  .filter((room) => room.type === activeCategory)
                  .map((room) => {
                    const reserved = isRoomReserved(room.id);
                    const isSelected = selectedRoom?.id === room.id;

                    return (
                      <div className="col-6 col-md-4 col-lg-2.4" style={{ width: "20%" }} key={room.id}>
                        <div
                          onClick={() => !reserved && setSelectedRoom(room)}
                          style={{
                            cursor: reserved ? "not-allowed" : "pointer",
                            border: isSelected ? "3px solid #6b8f5e" : "1px solid #d8e0c9",
                            borderRadius: "0.75rem",
                            overflow: "hidden",
                            backgroundColor: reserved ? "#f5f5f5" : "#ffffff",
                            opacity: reserved ? 0.7 : 1,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div className="position-relative">
                            <img
                              src={room.image}
                              alt={room.name}
                              style={{ width: "100%", height: "110px", objectFit: "cover", filter: reserved ? "grayscale(50%)" : "none" }}
                            />
                            <span
                              className={`badge position-absolute top-0 end-0 m-1 px-2 py-1 rounded-pill ${
                                reserved ? "bg-danger" : "bg-success"
                              }`}
                              style={{ fontSize: "0.65rem" }}
                            >
                              {reserved ? "Reserved" : "Available"}
                            </span>
                          </div>
                          <div className="p-2 text-center">
                            <h6 className="fw-bold mb-0" style={{ color: "#2f4a3c" }}>{room.name}</h6>
                            <small className="text-muted d-block">{room.price}</small>
                            {isSelected && !reserved && (
                              <span className="badge bg-success rounded-pill px-2 py-1 mt-1" style={{ fontSize: "0.65rem" }}>
                                ✓ Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="p-4 p-md-5 rounded-4 shadow-lg" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
              <h3 className="fw-bold mb-4 text-center" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
                Step 2: Enter Details & Review Booking Receipt Breakdown
              </h3>

              {confirmation && (
                <div
                  className={`alert ${confirmation.startsWith("success") ? "alert-success" : "alert-danger"} d-flex flex-wrap justify-content-between align-items-center gap-2`}
                  role="alert"
                >
                  <div>{confirmation.split(":").slice(1).join(":")}</div>
                  {createdBooking && (
                    <div className="d-flex gap-2">
                      <button
                        onClick={() => setIsReceiptOpen(true)}
                        className="btn btn-sm btn-success rounded-pill px-3 fw-bold"
                      >
                        🧾 View Receipt & Email
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row g-4">
                  <div className="col-md-7">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>Full Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Juan Dela Cruz"
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>Email Address *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            loadAllBookings(e.target.value);
                          }}
                          placeholder="name@example.com"
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>Check-in Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>Check-out Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>Number of Persons Checking In *</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="form-control"
                          value={guests}
                          onChange={(e) => setGuests(e.target.value)}
                          required
                        />
                        <small className="text-muted" style={{ fontSize: "0.8rem" }}>
                          Base rate includes up to 2 persons. Extra persons: +₱{extraGuestRate}/night each.
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-5">
                    <div className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between" style={{ backgroundColor: "#f8faf6", border: "2px dashed #b8c9af" }}>
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="fw-bold mb-0" style={{ color: "#2f4a3c", fontFamily: "'Playfair Display', serif" }}>
                            🧾 Live Cost Calculation
                          </h5>
                          <span className="badge bg-secondary font-monospace">DYNAMIC</span>
                        </div>

                        {selectedRoom ? (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-2 small">
                              <span className="text-muted">Room Selected:</span>
                              <strong className="text-dark">{selectedRoom.name} ({selectedRoom.typeName})</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2 small">
                              <span className="text-muted">Base Rate (2 Guests):</span>
                              <strong>₱{basePricePerNight.toLocaleString()} / night</strong>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2 small">
                              <span className="text-muted">Guests Checking In:</span>
                              <strong>{guestCount} Person(s)</strong>
                            </div>
                            {extraGuests > 0 && (
                              <div className="d-flex justify-content-between align-items-center mb-2 small text-primary">
                                <span>Extra Guests ({extraGuests}x):</span>
                                <strong>+₱{extraGuestFeePerNight.toLocaleString()} / night</strong>
                              </div>
                            )}
                            <div className="d-flex justify-content-between align-items-center mb-2 small">
                              <span className="text-muted">Days / Nights Staying:</span>
                              <strong>{nightsCount > 0 ? `${nightsCount} Night(s)` : "Please set dates"}</strong>
                            </div>

                            <hr className="my-2" />
                            <div className="d-flex justify-content-between align-items-center mb-2 small">
                              <span className="text-muted">Nightly Subtotal:</span>
                              <span className="font-monospace">₱{totalDailyRate.toLocaleString()} / night</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2 small">
                              <span className="text-muted">Grand Subtotal ({effectiveNights} night{effectiveNights > 1 ? "s" : ""}):</span>
                              <span className="font-monospace fw-semibold">₱{calculatedTotal.toLocaleString()}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-2 small">
                              <span className="text-muted">Taxes (12% VAT Included):</span>
                              <span className="font-monospace text-muted">₱{vatIncluded.toLocaleString()}</span>
                            </div>
                            <hr className="my-2" />
                            <div className="d-flex justify-content-between align-items-center pt-1">
                              <span className="fw-bold fs-6" style={{ color: "#2f4a3c" }}>Total Cost:</span>
                              <span className="fw-bold fs-4 text-success font-monospace">₱{calculatedTotal.toLocaleString()}</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted small">Please select a room category above to view price breakdown.</p>
                        )}
                      </div>

                      <div className="mt-3">
                        <small className="text-muted d-block mb-3">
                          ✓ Self-cancellation within 24h. Instant official receipt and email notification.
                        </small>

                        <button
                          type="submit"
                          disabled={!selectedRoom || isRoomReserved(selectedRoom?.id)}
                          className="btn w-100 py-3 rounded-pill fw-bold text-white shadow"
                          style={{ backgroundColor: "#2f4a3c", border: "none" }}
                        >
                          Confirm & Generate Receipt &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="row justify-content-center mt-5">
          <div className="col-lg-10">
            <div
              className="p-4 p-md-5 rounded-4 shadow-lg"
              style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}
            >
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 border-bottom pb-3">
                <div>
                  <h3
                    className="fw-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}
                  >
                    Your Booking History
                  </h3>
                  <p className="text-muted small mb-0">
                    View and manage all your reservations below.
                  </p>
                </div>
                <span className="badge px-3 py-2 text-dark bg-warning-subtle border border-warning rounded-pill align-self-start align-self-md-center">
                  ⏱️ 24h Self-Cancel Window
                </span>
              </div>

              {lookupToast && (
                <div className="alert alert-warning mb-4 shadow-sm">
                  {lookupToast}
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead style={{ backgroundColor: "#2f4a3c" }}>
                    <tr>
                      <th className="text-white">Booking ID</th>
                      <th className="text-white">Guest Name</th>
                      <th className="text-white">Room</th>
                      <th className="text-white">Check-in</th>
                      <th className="text-white">Check-out</th>
                      <th className="text-white">Guests</th>
                      <th className="text-white">Total</th>
                      <th className="text-white">Status</th>
                      <th className="text-white text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBookings.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          No bookings found for this account.
                        </td>
                      </tr>
                    ) : (
                      allBookings.map((b) => {
                        const eligibleForSelfCancel = isBookingWithin24Hours(b);
                        const currentStatus = getDynamicStatus(b);

                        return (
                          <tr key={b.id}>
                            <td className="font-monospace fw-bold">{b.id}</td>
                            <td>{b.fullName}</td>
                            <td>{b.roomName}</td>
                            <td>{b.checkIn}</td>
                            <td>{b.checkOut}</td>
                            <td>{b.guests}</td>
                            <td className="fw-bold text-success font-monospace">{b.totalPrice}</td>
                            <td>
                              <span
                                className={`badge px-3 py-1 ${
                                  currentStatus === "Completed"
                                    ? "bg-secondary"
                                    : currentStatus === "Confirmed"
                                    ? "bg-success"
                                    : currentStatus === "Pending"
                                    ? "bg-warning text-dark"
                                    : "bg-danger"
                                }`}
                              >
                                {currentStatus}
                              </span>
                              {eligibleForSelfCancel &&
                                currentStatus !== "Cancelled" &&
                                currentStatus !== "Completed" && (
                                  <div className="badge bg-info text-dark mt-1" style={{ fontSize: "0.7rem" }}>
                                    ⏱️ &lt;24h Eligible
                                  </div>
                                )}
                            </td>
                            <td>
                              <div className="d-flex flex-column gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCreatedBooking(b);
                                    setIsReceiptOpen(true);
                                  }}
                                  className="btn btn-sm btn-outline-success rounded-pill fw-semibold"
                                >
                                  🧾 View Receipt
                                </button>

                                {currentStatus !== "Cancelled" && currentStatus !== "Completed" ? (
                                  eligibleForSelfCancel ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelBookingFromList(b)}
                                      className="btn btn-sm btn-outline-danger rounded-pill fw-semibold"
                                    >
                                      🚫 Cancel
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelBookingFromList(b)}
                                      className="btn btn-sm btn-outline-secondary rounded-pill fw-semibold"
                                      title="More than 24h passed - Click to view Admin contact details"
                                    >
                                      🔒 Contact Admin
                                    </button>
                                  )
                                ) : (
                                  <span className="badge bg-light text-muted rounded-pill px-3 py-2 border">
                                    {currentStatus === "Completed" ? "Stay Ended" : "Cancelled"}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-4" style={{ backgroundColor: "#2f4a3c", color: "#c8d4bf" }}>
        &copy; 2026 Casa Gracia's Hotel. All rights reserved.
      </footer>

      {createdBooking && (
        <ReceiptModal
          booking={createdBooking}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          onCancelBooking={handleReceiptCancelCallback}
        />
      )}
    </div>
  );
}

export default Reservation;
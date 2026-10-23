import { useState, useEffect, useRef } from "react";
import ReceiptModal from "./ReceiptModal.jsx";
import { API_URL } from "./config.js";

function Reservation() {
  const [activeCategory, setActiveCategory] = useState("villa"); 
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState("form"); // "form" | "success"

  const [createdBooking, setCreatedBooking] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [allBookings, setAllBookings] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [lookupToast, setLookupToast] = useState("");

  const categoryContainerRef = useRef(null);

  const rooms = [
    { id: "villa-1", name: "Villa 1", unitNumber: 1, type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg", maxCapacity: 10 },
    { id: "villa-2", name: "Villa 2", unitNumber: 2, type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg", maxCapacity: 10 },
    { id: "villa-3", name: "Villa 3", unitNumber: 3, type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg", maxCapacity: 10 },
    { id: "villa-4", name: "Villa 4", unitNumber: 4, type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg", maxCapacity: 10 },
    { id: "villa-5", name: "Villa 5", unitNumber: 5, type: "villa", typeName: "Villa Type Room", price: "₱3,500 / night", priceNum: 3500, image: "/villa-1.jpg", maxCapacity: 10 },

    { id: "kubo-1", name: "Kubo 1", unitNumber: 1, type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg", maxCapacity: 6 },
    { id: "kubo-2", name: "Kubo 2", unitNumber: 2, type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg", maxCapacity: 6 },
    { id: "kubo-3", name: "Kubo 3", unitNumber: 3, type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg", maxCapacity: 6 },
    { id: "kubo-4", name: "Kubo 4", unitNumber: 4, type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg", maxCapacity: 6 },
    { id: "kubo-5", name: "Kubo 5", unitNumber: 5, type: "kubo", typeName: "Kubo Type Room", price: "₱2,200 / night", priceNum: 2200, image: "/kubo-1.jpg", maxCapacity: 6 },
  ];

  const categories = [
    {
      id: "villa",
      name: "Villa Type Room",
      price: "₱3,500 / night",
      image: "/villa-1.jpg",
      description: "Spacious air-conditioned rooms designed for family comfort (up to 10 guests).",
      maxCapacity: 10,
    },
    {
      id: "kubo",
      name: "Kubo Type Room",
      price: "₱2,200 / night",
      image: "/kubo-1.jpg",
      description: "Cozy tropical kubo experience surrounded by natural breeze (up to 6 guests).",
      maxCapacity: 6,
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

  const fetchExistingBookings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setExistingBookings(data);
          return data;
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote bookings:", err);
    }
    try {
      const local = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
      setExistingBookings(local);
      return local;
    } catch {
      return [];
    }
  };

  const getAllCombinedBookings = () => {
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
    } catch (e) {
      local = [];
    }
    const combined = [...existingBookings];
    for (const b of local) {
      if (!combined.some((item) => String(item.id) === String(b.id))) {
        combined.push(b);
      }
    }
    return combined;
  };

  const isUnitBooked = (unit, checkInDate = checkIn, checkOutDate = checkOut) => {
    if (!unit) return false;
    if (!checkInDate || !checkOutDate) return false;

    const newStart = new Date(checkInDate);
    const newEnd = new Date(checkOutDate);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newEnd <= newStart) {
      return false;
    }

    const all = getAllCombinedBookings();

    return all.some((b) => {
      if (b.status === "Cancelled") return false;

      const isSameType =
        b.roomId === unit.type ||
        (b.roomName && b.roomName.toLowerCase().includes(unit.type));
      if (!isSameType) return false;

      const matchesUnitNumber =
        b.unitNumber !== undefined &&
        b.unitNumber !== null &&
        Number(b.unitNumber) === Number(unit.unitNumber);

      const matchesUnitId =
        b.roomUnitId && b.roomUnitId === unit.id;

      const matchesUnitName =
        b.roomName && (
          b.roomName === unit.name ||
          b.roomName.startsWith(`${unit.name} `) ||
          b.roomName.startsWith(`${unit.name}(`) ||
          b.roomName.includes(` ${unit.name} `) ||
          b.roomName.includes(unit.name)
        );

      const isSameUnit = matchesUnitNumber || matchesUnitId || matchesUnitName;
      if (!isSameUnit) return false;

      if (!b.checkIn || !b.checkOut) return false;
      const existStart = new Date(b.checkIn);
      const existEnd = new Date(b.checkOut);
      if (isNaN(existStart.getTime()) || isNaN(existEnd.getTime())) return false;

      // Overlap rule: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
      return newStart < existEnd && newEnd > existStart;
    });
  };

  const isRoomReserved = (roomId) => {
    const unit = rooms.find((r) => r.id === roomId);
    if (!unit) return false;
    return isUnitBooked(unit);
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
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isBookingModalOpen) {
        handleCloseBookingModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBookingModalOpen, modalStep]);

  useEffect(() => {
    if (activeCategory) {
      const availableRooms = rooms.filter((r) => r.type === activeCategory);
      const firstAvailable = availableRooms.find((r) => !isRoomReserved(r.id));
      setSelectedRoom(firstAvailable || availableRooms[0]);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        fetchExistingBookings();
      }
    }
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (isBookingModalOpen) {
      const currentType = selectedRoom?.type || activeCategory || "villa";
      const currentCategoryRooms = rooms.filter((r) => r.type === currentType);

      if (checkIn && checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          if (!selectedRoom || isUnitBooked(selectedRoom, checkIn, checkOut)) {
            const nextFree = currentCategoryRooms.find((u) => !isUnitBooked(u, checkIn, checkOut));
            setSelectedRoom(nextFree || null);
          }
          return;
        }
      }

      if (!selectedRoom) {
        const firstAvail = currentCategoryRooms.find((u) => !isUnitBooked(u, checkIn, checkOut)) || currentCategoryRooms[0];
        setSelectedRoom(firstAvail);
      }
    }
  }, [checkIn, checkOut, existingBookings, isBookingModalOpen, activeCategory]);

  const roomMaxCapacity = selectedRoom?.maxCapacity || (selectedRoom?.type === "villa" ? 10 : 6);

  useEffect(() => {
    if (selectedRoom) {
      const maxCap = selectedRoom.maxCapacity || (selectedRoom.type === "villa" ? 10 : 6);
      if (Number(guests) > maxCap) {
        setGuests(maxCap);
      }
    }
  }, [selectedRoom]);

  const handleOpenBookingModal = (room) => {
    fetchExistingBookings();
    const currentType = room?.type || activeCategory || "villa";
    setActiveCategory(currentType);
    const categoryRooms = rooms.filter((r) => r.type === currentType);

    let chosen = null;
    if (room && !isUnitBooked(room, checkIn, checkOut)) {
      chosen = room;
    } else {
      chosen = categoryRooms.find((r) => !isUnitBooked(r, checkIn, checkOut)) || null;
    }

    setSelectedRoom(chosen);
    setConfirmation("");
    setModalStep("form");
    setIsBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setConfirmation("");
    setIsSubmitting(false);
    if (modalStep === "success") {
      setCheckIn("");
      setCheckOut("");
      setGuests(1);
      setModalStep("form");
      setCreatedBooking(null);
    }
  };

  const handleGuestsChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      setGuests("");
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    if (num > roomMaxCapacity) {
      setGuests(roomMaxCapacity);
    } else {
      setGuests(num);
    }
  };

  const handleGuestsBlur = () => {
    if (guests === "" || Number(guests) < 1) {
      setGuests(1);
    } else if (Number(guests) > roomMaxCapacity) {
      setGuests(roomMaxCapacity);
    }
  };

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
  const guestCount = Math.max(1, Math.min(roomMaxCapacity, Number(guests) || 1));

  const extraGuestRate = selectedRoom?.type === "villa" ? 500 : 300;
  const extraGuests = Math.max(0, guestCount - 2);
  const extraGuestFeePerNight = extraGuests * extraGuestRate;
  const totalDailyRate = basePricePerNight + extraGuestFeePerNight;

  const calculatedTotal = totalDailyRate * effectiveNights;
  const vatIncluded = (calculatedTotal * 12) / 112;
  const vatableSales = calculatedTotal - vatIncluded;
  const formattedVat = `₱${vatIncluded.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedVatable = `₱${vatableSales.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!selectedRoom) {
      setConfirmation("error:Please select a unit number before confirming your reservation.");
      return;
    }

    if (isUnitBooked(selectedRoom, checkIn, checkOut)) {
      setConfirmation(`error:${selectedRoom.name} is already booked for the chosen dates. Please choose another unit.`);
      return;
    }

    if (!trimmedName) {
      setConfirmation("error:Please enter your full name.");
      return;
    }

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setConfirmation("error:Please enter a valid email address (e.g., name@example.com).");
      return;
    }

    if (!checkIn) {
      setConfirmation("error:Please select a check-in date.");
      return;
    }

    if (!checkOut) {
      setConfirmation("error:Please select a check-out date.");
      return;
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setConfirmation("error:Please select valid check-in and check-out dates.");
      return;
    }

    if (end <= start) {
      setConfirmation("error:Check-out date must be later than check-in date.");
      return;
    }

    const numGuests = Number(guests);
    if (!numGuests || isNaN(numGuests) || numGuests < 1) {
      setConfirmation("error:Number of persons checking in must be at least 1.");
      return;
    }

    if (numGuests > roomMaxCapacity) {
      setConfirmation(`error:Maximum allowed guests for ${selectedRoom.name} is ${roomMaxCapacity}.`);
      return;
    }

    const startTime = Date.now();
    setIsSubmitting(true);
    setConfirmation("");

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          roomName: `${selectedRoom.name} (${selectedRoom.typeName})`,
          roomId: selectedRoom.type,
          roomUnitId: selectedRoom.id,
          unitNumber: selectedRoom.unitNumber,
          checkIn: checkIn,
          checkOut: checkOut,
          guests: guestCount,
          totalPrice: `₱${calculatedTotal.toLocaleString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const savedData = await response.json();

      // Ensure visible loading state of at least 1.2s
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }

      const newBookingRecord = {
        id: String(savedData?.id || `BK-${Date.now().toString().slice(-6)}`),
        receiptNo: savedData?.receiptNo || `RCP-${savedData?.id || Date.now().toString().slice(-6)}`,
        fullName: trimmedName,
        email: trimmedEmail,
        roomName: `${selectedRoom.name} (${selectedRoom.typeName})`,
        roomId: selectedRoom.type,
        roomUnitId: selectedRoom.id,
        unitNumber: selectedRoom.unitNumber,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: guestCount,
        pricePerNight: basePricePerNight,
        nights: effectiveNights,
        totalPrice: `₱${calculatedTotal.toLocaleString()}`,
        status: savedData?.status || "Confirmed",
        dateCreated: savedData?.dateCreated || new Date().toISOString(),
        createdAtMs: Date.now(),
      };

      try {
        const savedBookings = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
        const updatedBookings = [
          newBookingRecord,
          ...savedBookings.filter((b) => String(b.id) !== String(newBookingRecord.id)),
        ];
        localStorage.setItem("casa_bookings", JSON.stringify(updatedBookings));
      } catch (storageErr) {
        console.warn("Could not sync booking to localStorage:", storageErr);
      }

      setCreatedBooking(newBookingRecord);
      setModalStep("success");
      loadAllBookings(trimmedEmail);
    } catch (err) {
      console.error("Booking reservation error:", err);
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      setConfirmation(
        "error:The booking server did not respond. Please ensure the backend is running and try again."
      );
    } finally {
      setIsSubmitting(false);
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

      <div className="container py-4 py-md-5 page-safe-bottom" style={{ paddingBottom: "130px" }}>
        <h4 className="fw-bold mb-4 text-center" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
          Step 1: Select Accommodation Category
        </h4>

        <div ref={categoryContainerRef}>
          <div className="row g-4 justify-content-center mb-4">
            {categories.map((cat) => (
              <div className="col-md-5" key={cat.id}>
                <div
                  onClick={() => {
                    setActiveCategory(cat.id);
                    const catRooms = rooms.filter((r) => r.type === cat.id);
                    const availableDefault = catRooms.find((r) => !isRoomReserved(r.id)) || catRooms[0];
                    handleOpenBookingModal(availableDefault);
                  }}
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
                      <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: "#6b8f5e", color: "#ffffff" }}>
                        Book Now &rarr;
                      </span>
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
            <div className="p-3 p-md-4 rounded-4 mb-5 shadow-sm" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
              <h5 className="fw-bold mb-3 text-center" style={{ color: "#2f4a3c" }}>
                Select Specific {activeCategory === "villa" ? "Villa Unit" : "Kubo Unit"}
              </h5>
              <div className="villa-selection-grid">
                {rooms
                  .filter((room) => room.type === activeCategory)
                  .map((room) => {
                    const reserved = isRoomReserved(room.id);
                    const isSelected = selectedRoom?.id === room.id;

                    return (
                      <div className="villa-card-col" key={room.id}>
                        <div
                          onClick={() => !reserved && handleOpenBookingModal(room)}
                          className={`villa-unit-card h-100 ${isSelected ? "selected" : ""}`}
                          style={{
                            cursor: reserved ? "not-allowed" : "pointer",
                            border: isSelected ? "3px solid #6b8f5e" : "1.5px solid #d8e0c9",
                            borderRadius: "0.85rem",
                            overflow: "hidden",
                            backgroundColor: reserved ? "#f5f5f5" : isSelected ? "#f4f8f2" : "#ffffff",
                            opacity: reserved ? 0.7 : 1,
                            transition: "all 0.2s ease",
                            boxShadow: isSelected ? "0 4px 12px rgba(107, 143, 94, 0.25)" : "none",
                          }}
                        >
                          <div className="position-relative" style={{ width: "100%", height: "115px", overflow: "hidden" }}>
                            <img
                              src={room.image}
                              alt={room.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", filter: reserved ? "grayscale(60%)" : "none" }}
                            />
                            <span
                              className={`badge position-absolute top-0 end-0 m-2 px-2 py-1 rounded-pill ${
                                reserved ? "bg-danger" : "bg-success"
                              }`}
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: "600",
                                letterSpacing: "0.3px",
                                zIndex: 2,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                              }}
                            >
                              {reserved ? "Reserved" : "Available"}
                            </span>
                          </div>
                          <div className="p-2 p-sm-3 text-center d-flex flex-column justify-content-between flex-grow-1" style={{ wordBreak: "break-word" }}>
                            <div>
                              <h6 className="fw-bold mb-1" style={{ color: "#2f4a3c", fontSize: "0.95rem" }}>
                                {room.name}
                              </h6>
                              <div
                                className="fw-semibold text-muted"
                                style={{
                                  fontSize: "0.82rem",
                                  lineHeight: "1.3",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {room.price}
                              </div>
                            </div>
                            <div className="mt-2" style={{ minHeight: "26px" }}>
                              {reserved ? (
                                <span className="small text-muted" style={{ fontSize: "0.72rem" }}>
                                  Unavailable
                                </span>
                              ) : (
                                <span
                                  className="badge rounded-pill px-2 py-1 d-inline-flex align-items-center justify-content-center"
                                  style={{
                                    backgroundColor: isSelected ? "#6b8f5e" : "#2f4a3c",
                                    color: "#ffffff",
                                    fontSize: "0.72rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {isSelected ? "✓ Selected (Tap to Book)" : "Tap to Book"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Centered Modal Card for Booking Details & Receipt */}
        {isBookingModalOpen && (
          <div
            className="booking-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseBookingModal();
            }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              zIndex: 1050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              className="booking-modal-card card shadow-lg border-0 rounded-4 position-relative"
              style={{
                width: "min(95vw, 900px)",
                maxHeight: "90vh",
                overflowY: "auto",
                backgroundColor: "#ffffff",
                boxSizing: "border-box",
              }}
            >
              {/* Close "X" Button */}
              <button
                type="button"
                className="btn-close position-absolute top-0 end-0 m-3 z-3"
                onClick={handleCloseBookingModal}
                aria-label="Close"
                style={{ minHeight: "44px", minWidth: "44px", padding: "12px" }}
              ></button>

              <div className="card-body p-3 p-sm-4 p-md-5">
                {modalStep === "form" ? (
                  <>
                    <div className="text-center mb-4 pe-4">
                      <span className="badge rounded-pill px-3 py-1 mb-2" style={{ backgroundColor: "#6b8f5e", color: "#ffffff", fontSize: "0.8rem" }}>
                        {selectedRoom?.typeName || "Room Reservation"}
                      </span>
                      <h3 className="fw-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
                        Reserve {selectedRoom?.name || (activeCategory === "villa" ? "Villa" : "Kubo")}
                      </h3>
                      <p className="text-muted small mb-0">
                        Enter details below to view instant price breakdown and receive your receipt.
                      </p>
                    </div>

                    {confirmation && (
                      <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                        <span>⚠️</span>
                        <span>{confirmation.includes(":") ? confirmation.split(":").slice(1).join(":") : confirmation}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <div className="row g-4">
                        {/* Form (Left Column on Laptop, Full Width on Mobile) */}
                        <div className="col-12 col-md-7">
                          <div className="row g-3">
                            {/* Unit-Number Selector */}
                            <div className="col-12">
                              <label className="form-label small fw-semibold d-block mb-2" style={{ color: "#2f4a3c" }}>
                                {selectedRoom?.type === "villa" || activeCategory === "villa"
                                  ? "Choose Villa Number"
                                  : "Choose Kubo Number"}
                              </label>
                              <div className="d-flex flex-wrap gap-2">
                                {rooms
                                  .filter((r) => r.type === (selectedRoom?.type || activeCategory || "villa"))
                                  .map((unit) => {
                                    const isBooked = isUnitBooked(unit, checkIn, checkOut);
                                    const isSelected = selectedRoom?.id === unit.id;
                                    return (
                                      <button
                                        key={unit.id}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => setSelectedRoom(unit)}
                                        className="btn rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center justify-content-center"
                                        style={{
                                          minHeight: "40px",
                                          backgroundColor: isSelected
                                            ? "#2f4a3c"
                                            : isBooked
                                            ? "#e9ecef"
                                            : "#ffffff",
                                          color: isSelected
                                            ? "#ffffff"
                                            : isBooked
                                            ? "#6c757d"
                                            : "#2f4a3c",
                                          border: isSelected
                                            ? "2px solid #2f4a3c"
                                            : isBooked
                                            ? "1px solid #ced4da"
                                            : "1.5px solid #2f4a3c",
                                          cursor: isBooked ? "not-allowed" : "pointer",
                                          fontSize: "0.88rem",
                                          transition: "all 0.15s ease",
                                        }}
                                      >
                                        {unit.name} {isBooked ? "(Booked)" : ""}
                                      </button>
                                    );
                                  })}
                              </div>
                              {checkIn &&
                                checkOut &&
                                rooms
                                  .filter((r) => r.type === (selectedRoom?.type || activeCategory || "villa"))
                                  .every((u) => isUnitBooked(u, checkIn, checkOut)) && (
                                  <div className="alert alert-warning py-2 px-3 small mt-2 mb-0 d-flex align-items-center gap-2" role="alert">
                                    <span>⚠️</span>
                                    <span>
                                      All {selectedRoom?.type === "villa" || activeCategory === "villa" ? "Villa" : "Kubo"} units are booked for the selected dates. Please choose different dates.
                                    </span>
                                  </div>
                                )}
                            </div>

                            <div className="col-12 col-sm-6">
                              <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>
                                Full Name *
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Juan Dela Cruz"
                                required
                                style={{ minHeight: "44px", fontSize: "16px" }}
                              />
                            </div>
                            <div className="col-12 col-sm-6">
                              <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>
                                Email Address *
                              </label>
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
                                style={{ minHeight: "44px", fontSize: "16px" }}
                              />
                            </div>
                            <div className="col-12 col-sm-6">
                              <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>
                                Check-in Date *
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                                required
                                style={{ minHeight: "44px", fontSize: "16px" }}
                              />
                            </div>
                            <div className="col-12 col-sm-6">
                              <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>
                                Check-out Date *
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                                required
                                style={{ minHeight: "44px", fontSize: "16px" }}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold" style={{ color: "#2f4a3c" }}>
                                Number of Persons Checking In * (Max: {roomMaxCapacity})
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={roomMaxCapacity}
                                step="1"
                                className="form-control w-100"
                                style={{ minHeight: "44px", fontSize: "16px" }}
                                value={guests}
                                onChange={handleGuestsChange}
                                onBlur={handleGuestsBlur}
                                required
                              />
                              <small className="text-muted d-block mt-1" style={{ fontSize: "0.8rem" }}>
                                Base rate includes up to 2 persons. Extra persons: +₱{extraGuestRate}/night each (up to {roomMaxCapacity} guests max).
                              </small>
                            </div>
                          </div>
                        </div>

                        {/* Right Column (Live Cost Panel) on Laptop, Below Form on Mobile */}
                        <div className="col-12 col-md-5">
                          <div
                            className="p-3 p-md-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                            style={{ backgroundColor: "#f8faf6", border: "2px dashed #b8c9af" }}
                          >
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
                                  <div className="d-flex justify-content-between align-items-center mb-1 small text-muted">
                                    <span>VATable Sales:</span>
                                    <span className="font-monospace">{formattedVatable}</span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center mb-2 small text-muted">
                                    <span>12% VAT Included:</span>
                                    <span className="font-monospace">{formattedVat}</span>
                                  </div>
                                  <hr className="my-2" />
                                  <div className="d-flex justify-content-between align-items-center pt-1">
                                    <span className="fw-bold fs-6" style={{ color: "#2f4a3c" }}>Total Cost:</span>
                                    <span className="fw-bold fs-4 text-success font-monospace">₱{calculatedTotal.toLocaleString()}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-4 text-muted small">
                                  ⚠️ No unit currently available. Please choose different dates.
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <button
                                type="submit"
                                disabled={!selectedRoom || isUnitBooked(selectedRoom, checkIn, checkOut) || isSubmitting}
                                className="btn w-100 py-3 rounded-pill fw-bold text-white shadow mb-2 d-flex align-items-center justify-content-center gap-2"
                                style={{
                                  backgroundColor: isSubmitting ? "#6b8f5e" : (!selectedRoom || isUnitBooked(selectedRoom, checkIn, checkOut)) ? "#6c757d" : "#2f4a3c",
                                  border: "none",
                                  cursor: isSubmitting ? "wait" : (!selectedRoom || isUnitBooked(selectedRoom, checkIn, checkOut)) ? "not-allowed" : "pointer",
                                  minHeight: "48px",
                                }}
                              >
                                {isSubmitting ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <span>Confirm & Generate Receipt &rarr;</span>
                                )}
                              </button>
                              <small className="text-muted d-block text-center" style={{ fontSize: "0.75rem" }}>
                                ✓ Self-cancellation within 24h. Instant official receipt and record.
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>
                  </>
                ) : (
                  /* Success View in the SAME Card */
                  createdBooking && (
                    <div>
                      <div className="text-center my-2">
                        <div
                          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                          style={{
                            width: "68px",
                            height: "68px",
                            backgroundColor: "#eafaf1",
                            border: "3px solid #198754",
                            animation: "casaCheckPop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                          }}
                        >
                          <span style={{ fontSize: "36px", color: "#198754", lineHeight: 1 }}>✓</span>
                        </div>
                        <h3 className="fw-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
                          Successfully Booked!
                        </h3>
                        <p className="text-muted small mb-3">
                          Thank you! Your reservation has been recorded. Here is your official receipt summary:
                        </p>
                      </div>

                      <div
                        className="printable-receipt p-3 p-md-4 rounded-3 mb-4 mx-auto"
                        style={{
                          backgroundColor: "#fdfdfd",
                          border: "2px dashed #b0b8c1",
                          fontFamily: "'Courier New', Courier, monospace",
                          fontSize: "14px",
                          color: "#2c3e50",
                          maxWidth: "520px",
                          lineHeight: 1.6,
                        }}
                      >
                        <div className="text-center mb-2">
                          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: "bold", color: "#2f4a3c" }}>
                            Casa Gracia's Hotel & Resort
                          </div>
                          <div style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "#6c757d" }}>
                            Official Booking Receipt
                          </div>
                        </div>

                        <div style={{ borderTop: "2px dashed #b0b8c1", margin: "10px 0" }}></div>

                        <div className="d-flex justify-content-between py-1">
                          <strong>REFERENCE ID:</strong>
                          <span className="font-monospace fw-bold">{createdBooking.id}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>RECEIPT #:</strong>
                          <span>{createdBooking.receiptNo}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>GUEST NAME:</strong>
                          <span>{createdBooking.fullName}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>EMAIL:</strong>
                          <span>{createdBooking.email}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>ROOM:</strong>
                          <span>{createdBooking.roomName}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>GUESTS:</strong>
                          <span>{createdBooking.guests} Person(s)</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>CHECK-IN:</strong>
                          <span>{createdBooking.checkIn} (2:00 PM)</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>CHECK-OUT:</strong>
                          <span>{createdBooking.checkOut} (12:00 PM)</span>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <strong>DURATION:</strong>
                          <span>{createdBooking.nights} Night(s)</span>
                        </div>

                        <div style={{ borderTop: "2px dashed #b0b8c1", margin: "10px 0" }}></div>

                        <div className="d-flex justify-content-between py-1">
                          <span>VATable Sales:</span>
                          <span>{formattedVatable}</span>
                        </div>
                        <div className="d-flex justify-content-between py-1 text-muted">
                          <span>12% VAT Included:</span>
                          <span>{formattedVat}</span>
                        </div>

                        <div style={{ borderTop: "2px solid #2c3e50", marginTop: "8px", paddingTop: "8px" }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span style={{ fontWeight: "bold", fontSize: "16px" }}>TOTAL COST:</span>
                            <span style={{ fontWeight: "bold", fontSize: "20px", color: "#2f4a3c" }}>{createdBooking.totalPrice}</span>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-wrap justify-content-center gap-3">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="btn btn-outline-dark rounded-pill px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2"
                          style={{ minHeight: "44px" }}
                        >
                          🖨️ Print / Download Receipt
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseBookingModal}
                          className="btn rounded-pill px-4 py-2 fw-bold text-white shadow-sm"
                          style={{ backgroundColor: "#2f4a3c", border: "none", minHeight: "44px" }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

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
                <table className="table table-hover align-middle table-responsive-cards mb-0">
                  <thead style={{ backgroundColor: "#2f4a3c" }}>
                    <tr>
                      <th className="text-white">Booking Details</th>
                      <th className="text-white">Dates</th>
                      <th className="text-white">Guests</th>
                      <th className="text-white">Total</th>
                      <th className="text-white">Status</th>
                      <th className="text-white text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBookings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          No bookings found for this account.
                        </td>
                      </tr>
                    ) : (
                      allBookings.map((b) => {
                        const eligibleForSelfCancel = isBookingWithin24Hours(b);
                        const currentStatus = getDynamicStatus(b);

                        return (
                          <tr key={b.id}>
                            <td className="card-header-cell">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="fw-bold fs-6" style={{ color: "#2f4a3c" }}>{b.roomName}</span>
                                <span className="badge bg-dark font-monospace">{b.id}</span>
                              </div>
                              <div className="small text-muted">{b.fullName}</div>
                            </td>
                            <td data-label="Dates" className="small">
                              <div><strong>In:</strong> {b.checkIn} | <strong>Out:</strong> {b.checkOut}</div>
                            </td>
                            <td data-label="Guests">{b.guests}</td>
                            <td data-label="Total" className="fw-bold text-success font-monospace">{b.totalPrice}</td>
                            <td data-label="Status">
                              <div className="d-flex flex-wrap gap-1 align-items-center">
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
                                    <span className="badge bg-info text-dark" style={{ fontSize: "0.7rem" }}>
                                      ⏱️ &lt;24h Eligible
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="card-action-cell text-center">
                              <div className="d-flex flex-wrap gap-2 w-100 justify-content-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCreatedBooking(b);
                                    setIsReceiptOpen(true);
                                  }}
                                  className="btn btn-outline-success rounded-pill fw-semibold px-3"
                                  style={{ minHeight: "40px", flex: "1 1 auto" }}
                                >
                                  🧾 View Receipt
                                </button>

                                {currentStatus !== "Cancelled" && currentStatus !== "Completed" ? (
                                  eligibleForSelfCancel ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelBookingFromList(b)}
                                      className="btn btn-outline-danger rounded-pill fw-semibold px-3"
                                      style={{ minHeight: "40px", flex: "1 1 auto" }}
                                    >
                                      🚫 Cancel
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelBookingFromList(b)}
                                      className="btn btn-outline-secondary rounded-pill fw-semibold px-3"
                                      style={{ minHeight: "40px", flex: "1 1 auto" }}
                                      title="More than 24h passed - Click to view Admin contact details"
                                    >
                                      🔒 Contact Admin
                                    </button>
                                  )
                                ) : (
                                  <span className="badge bg-light text-muted rounded-pill px-3 py-2 border d-flex align-items-center justify-content-center" style={{ minHeight: "40px", flex: "1 1 auto" }}>
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
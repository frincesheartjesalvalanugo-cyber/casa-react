import { useState } from "react";

function ReceiptModal({ booking: initialBooking, isOpen, onClose, onCancelBooking }) {
  const [booking, setBooking] = useState(initialBooking);
  const [activeTab, setActiveTab] = useState("receipt");
  const [emailSentToast, setEmailSentToast] = useState(false);
  const [cancelToast, setCancelToast] = useState(false);
  const [contactAdminAlert, setContactAdminAlert] = useState(false);

  if (!isOpen || !booking) return null;

  const checkWithin24Hours = () => {
    let createdMs = booking.createdAtMs;
    if (!createdMs && booking.dateCreated) {
      createdMs = new Date(booking.dateCreated).getTime();
    }
    if (!createdMs || isNaN(createdMs)) return true;
    const elapsedMs = Date.now() - createdMs;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    return elapsedHours <= 24;
  };

  const canSelfCancel = checkWithin24Hours();

  const calculateNights = () => {
    if (booking.nights) return booking.nights;
    if (booking.checkIn && booking.checkOut) {
      const start = new Date(booking.checkIn);
      const end = new Date(booking.checkOut);
      if (!isNaN(start) && !isNaN(end) && end > start) {
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }
    }
    return 1;
  };

  const nights = calculateNights();
  const guestCount = Math.max(1, Number(booking.guests) || 1);
  const nightlySubtotal = guestCount * 1000;
  const subtotal = nightlySubtotal * nights;
  const vatIncluded = (subtotal * 12) / 112;
  const vatableSales = subtotal - vatIncluded;
  const formattedTotal = `\u20B1${subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedSubtotal = `\u20B1${subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedVat = `\u20B1${vatIncluded.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedVatable = `\u20B1${vatableSales.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const receiptNo = booking.receiptNo || `RCP-${booking.id || "BK-000000"}`;
  const dateIssued = booking.dateCreated
    ? new Date(booking.dateCreated).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
    : new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

  const handlePrint = () => {
    window.print();
  };

  const handleResendEmail = () => {
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 3000);
  };

  const handleCancelReservation = () => {
    if (!canSelfCancel) {
      setContactAdminAlert(true);
      return;
    }

    if (window.confirm(`Are you sure you want to cancel booking reference ${booking.id}?`)) {
      const updatedBooking = { ...booking, status: "Cancelled" };
      setBooking(updatedBooking);

      try {
        const savedBookings = JSON.parse(localStorage.getItem("casa_bookings") || "[]");
        const newBookings = savedBookings.map((b) =>
          b.id === booking.id ? { ...b, status: "Cancelled" } : b
        );
        localStorage.setItem("casa_bookings", JSON.stringify(newBookings));
      } catch (err) {
        console.error("Error updating booking status:", err);
      }

      if (onCancelBooking) {
        onCancelBooking(booking.id);
      }

      setCancelToast(true);
      setTimeout(() => setCancelToast(false), 4000);
    }
  };

  const dashedLine = {
    borderTop: "2px dashed #b0b8c1",
    margin: "12px 0",
  };

  const monoStyle = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#2c3e50",
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-receipt, .printable-receipt * {
            visibility: visible;
          }
          .printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ width: "min(95vw, 480px)", maxHeight: "90vh", margin: "1rem auto" }}>
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">

          <div
            className="modal-header border-0 text-white p-3 no-print"
            style={{ backgroundColor: "#2f4a3c" }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5">{"\uD83E\uDDFE"}</span>
              <h6 className="modal-title fw-bold mb-0">Booking Receipt</h6>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="bg-light border-bottom px-3 pt-2 no-print">
            <ul className="nav nav-tabs border-0 gap-1">
              <li className="nav-item">
                <button
                  className={`nav-link fw-semibold border-0 rounded-top-3 px-3 py-2 small ${
                    activeTab === "receipt"
                      ? "active bg-white text-success border-top border-start border-end"
                      : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("receipt")}
                >
                  {"\uD83E\uDDFE"} Receipt
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-semibold border-0 rounded-top-3 px-3 py-2 small ${
                    activeTab === "email"
                      ? "active bg-white text-success border-top border-start border-end"
                      : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("email")}
                >
                  {"\uD83D\uDCE7"} Email
                </button>
              </li>
            </ul>
          </div>

          {emailSentToast && (
            <div className="alert alert-success d-flex align-items-center justify-content-between m-3 mb-0 shadow-sm no-print small">
              <div>{"\uD83D\uDCE9"} <strong>Email Sent!</strong> Receipt sent to <u>{booking.email}</u>.</div>
              <button type="button" className="btn-close ms-2" onClick={() => setEmailSentToast(false)}></button>
            </div>
          )}
          {cancelToast && (
            <div className="alert alert-warning d-flex align-items-center justify-content-between m-3 mb-0 shadow-sm no-print small">
              <div>{"\u274C"} <strong>Cancelled!</strong> Booking <u>{booking.id}</u> has been cancelled.</div>
              <button type="button" className="btn-close ms-2" onClick={() => setCancelToast(false)}></button>
            </div>
          )}
          {contactAdminAlert && (
            <div className="alert alert-danger m-3 mb-0 shadow-sm no-print small">
              <div className="fw-bold mb-1">{"\uD83D\uDCDE"} 24-Hour Cancellation Period Expired</div>
              <p className="mb-2">Self-cancellation is only available within 24 hours. Please contact Admin directly.</p>
              <div className="fw-bold border-top pt-2">
                {"\uD83D\uDCDE"} +63 (0912) 345-6789 | {"\uD83D\uDCE7"} reservations@casagracia.com
              </div>
            </div>
          )}

          <div className="modal-body p-3 bg-light">

            {activeTab === "receipt" && (
              <div
                className="printable-receipt bg-white p-4 rounded-3"
                style={{
                  border: "2px dashed #b0b8c1",
                  ...monoStyle,
                }}
              >
                <div className="text-center mb-1">
                  <div style={{ fontFamily: "'Georgia', 'Playfair Display', serif", fontSize: "24px", fontWeight: "bold", color: "#2f4a3c" }}>
                    Casa Gracia's
                  </div>
                  <div style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase" }}>
                    Hotel & Resort
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "2px" }}>
                    Beachfront Paradise, Resort Road
                  </div>
                </div>

                <div className="text-center my-3">
                  <span
                    className="px-3 py-1 rounded-pill fw-bold"
                    style={{
                      fontSize: "13px",
                      letterSpacing: "1px",
                      border: `2px solid ${
                        booking.status === "Cancelled" ? "#dc3545"
                        : booking.status === "Confirmed" ? "#198754"
                        : "#c5a000"
                      }`,
                      color: booking.status === "Cancelled" ? "#dc3545"
                        : booking.status === "Confirmed" ? "#198754"
                        : "#7a6b00",
                      backgroundColor: booking.status === "Cancelled" ? "#fff0f0"
                        : booking.status === "Confirmed" ? "#eafaf1"
                        : "#fdf8e1",
                    }}
                  >
                    STATUS: {(booking.status || "PENDING").toUpperCase()}
                  </span>
                </div>

                <div style={dashedLine}></div>

                <div style={{ padding: "4px 0" }}>
                  <div><strong>BOOKING #:</strong> {booking.id}</div>
                  <div><strong>RECEIPT #:</strong> {receiptNo}</div>
                  <div><strong>DATE:</strong> {dateIssued}</div>
                  <div><strong>NAME:</strong> {booking.fullName}</div>
                  <div><strong>EMAIL:</strong> {booking.email}</div>
                  <div><strong>ROOM:</strong> {booking.roomName}</div>
                  <div><strong>GUESTS:</strong> {guestCount} person(s)</div>
                  <div><strong>CHECK-IN:</strong> {booking.checkIn} (2:00 PM)</div>
                  <div><strong>CHECK-OUT:</strong> {booking.checkOut} (12:00 PM)</div>
                  <div><strong>DURATION:</strong> {nights} night(s)</div>
                </div>

                <div style={dashedLine}></div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                      <th style={{ textAlign: "left", paddingBottom: "6px", fontSize: "13px" }}>DESCRIPTION</th>
                      <th style={{ textAlign: "right", paddingBottom: "6px", fontSize: "13px" }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px 0" }}>
                        {booking.roomName}<br />
                        <span style={{ fontSize: "12px", color: "#6c757d" }}>
                          {guestCount} guest(s) x {"\u20B1"}1,000/night x {nights} night(s)
                        </span>
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "bold" }}>
                        {"\u20B1"}{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={dashedLine}></div>

                <div className="d-flex justify-content-between" style={{ padding: "2px 0" }}>
                  <span><strong>SUBTOTAL:</strong></span>
                  <span>{formattedSubtotal}</span>
                </div>
                <div className="d-flex justify-content-between" style={{ padding: "2px 0", fontSize: "13px", color: "#6c757d" }}>
                  <span>VATable Sales:</span>
                  <span>{formattedVatable}</span>
                </div>
                <div className="d-flex justify-content-between" style={{ padding: "2px 0", fontSize: "13px", color: "#6c757d" }}>
                  <span>12% VAT Included:</span>
                  <span>{formattedVat}</span>
                </div>

                <div style={{ borderTop: "2px solid #2c3e50", marginTop: "8px", paddingTop: "8px" }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontWeight: "bold", fontSize: "16px" }}>TOTAL DUE:</span>
                    <span style={{ fontWeight: "bold", fontSize: "20px", color: "#2f4a3c" }}>{formattedTotal}</span>
                  </div>
                </div>

                <div className="text-center" style={{ marginTop: "16px" }}>
                  {booking.status === "Cancelled" ? (
                    <span
                      className="d-inline-block px-4 py-2 rounded-pill fw-bold"
                      style={{ fontSize: "13px", color: "#dc3545", border: "2px solid #dc3545", backgroundColor: "#fff0f0" }}
                    >
                      {"\u274C"} RESERVATION CANCELLED
                    </span>
                  ) : canSelfCancel ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger rounded-pill px-4 py-2"
                      style={{ fontSize: "13px", fontFamily: "'Courier New', Courier, monospace", fontWeight: "bold" }}
                      onClick={handleCancelReservation}
                    >
                      {"\u274C"} Cancel Booking (within 24h)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-pill px-4 py-2"
                      style={{ fontSize: "13px", fontFamily: "'Courier New', Courier, monospace", fontWeight: "bold" }}
                      onClick={() => setContactAdminAlert(true)}
                    >
                      {"\uD83D\uDCDE"} Contact Admin to Cancel
                    </button>
                  )}
                </div>

                <div style={{ marginTop: "14px", fontSize: "11px", color: "#6c757d", textAlign: "center", lineHeight: "1.5" }}>
                  Self-cancellation is allowed within <strong>24 hours</strong> of booking.<br />
                  After 24 hours, contact Casa Gracia Admin.
                </div>

                <div style={dashedLine}></div>

                <div className="text-center" style={{ color: "#2f4a3c", fontSize: "13px", fontStyle: "italic", lineHeight: "1.6" }}>
                  Maraming Salamat po! We look forward<br />
                  to welcoming you at<br />
                  Casa Gracia's Hotel & Resort.
                </div>
              </div>
            )}

            {activeTab === "email" && (
              <div className="bg-white rounded-4 shadow-sm border overflow-hidden">
                <div className="bg-dark text-white p-3 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary">INBOX</span>
                    <span className="small text-truncate" style={{ maxWidth: "300px" }}>
                      Booking Confirmation - Casa Gracia's ({booking.id})
                    </span>
                  </div>
                  <button onClick={handleResendEmail} className="btn btn-sm btn-outline-light rounded-pill px-3 no-print">
                    {"\uD83D\uDCE7"} Resend
                  </button>
                </div>

                <div className="p-3 bg-light border-bottom small">
                  <div className="row g-2">
                    <div className="col-auto text-muted">From:</div>
                    <div className="col fw-bold text-dark">Casa Gracia Reservations &lt;reservations@casagracia.com&gt;</div>
                  </div>
                  <div className="row g-2 mt-1">
                    <div className="col-auto text-muted">To:</div>
                    <div className="col font-monospace text-primary">{booking.email}</div>
                  </div>
                  <div className="row g-2 mt-1">
                    <div className="col-auto text-muted">Date:</div>
                    <div className="col text-muted">{new Date().toLocaleString()}</div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-center pb-3 mb-3 border-bottom">
                    <div className="fs-4 fw-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
                      Casa Gracia's Hotel
                    </div>
                    <p className={booking.status === "Cancelled" ? "text-danger fw-semibold mb-0" : "text-success fw-semibold mb-0"}>
                      {booking.status === "Cancelled" ? "\u274C Reservation: CANCELLED" : "\u2705 Booking Confirmed & Received"}
                    </p>
                  </div>

                  <p className="mb-2">Dear <strong>{booking.fullName}</strong>,</p>
                  <p className="text-muted small mb-3">
                    {booking.status === "Cancelled"
                      ? "Your reservation has been cancelled. If this was a mistake, please contact us."
                      : "Thank you for choosing Casa Gracia's Hotel! Your reservation request has been received. Here are your booking details."}
                  </p>

                  <div className="card border-0 bg-light rounded-3 p-3 mb-3 small">
                    <div className="row g-2">
                      <div className="col-6"><span className="text-muted">Reference:</span><br /><strong>{booking.id}</strong></div>
                      <div className="col-6"><span className="text-muted">Receipt No:</span><br /><strong>{receiptNo}</strong></div>
                      <div className="col-6"><span className="text-muted">Room:</span><br /><strong>{booking.roomName}</strong></div>
                      <div className="col-6"><span className="text-muted">Guests:</span><br /><strong>{guestCount} person(s)</strong></div>
                    </div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between"><span className="text-muted">Check-in:</span><strong>{booking.checkIn} (2:00 PM)</strong></div>
                    <div className="d-flex justify-content-between"><span className="text-muted">Check-out:</span><strong>{booking.checkOut} (12:00 PM)</strong></div>
                    <div className="d-flex justify-content-between"><span className="text-muted">Duration:</span><strong>{nights} night(s)</strong></div>
                    <div className="d-flex justify-content-between"><span className="text-muted">Rate:</span><strong>{guestCount} guest(s) @ {"\u20B1"}1,000/night</strong></div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold">Total:</span>
                      <span className="fw-bold fs-5 text-success">{formattedTotal}</span>
                    </div>
                  </div>

                  <p className="small text-muted mb-3">
                    Self-cancellation is available within 24 hours. After that, contact Admin directly.
                  </p>

                  <div className="text-center pt-2 border-top text-muted small">
                    Casa Gracia's Hotel & Resort {"\u00A9"} All Rights Reserved.
                  </div>
                </div>
              </div>
            )}
          </div>

        
          <div
            className="modal-footer border-0 px-3 py-3 no-print"
            style={{ backgroundColor: "#f0f2f4" }}
          >
            <div className="d-flex w-100 gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-bold flex-fill d-flex align-items-center justify-content-center gap-2"
                onClick={handlePrint}
                style={{ fontSize: "14px", minHeight: "44px" }}
              >
                {"\uD83D\uDDA8\uFE0F"} Print Slip
              </button>
              <button
                type="button"
                className="btn text-white rounded-pill px-4 py-2 fw-bold flex-fill d-flex align-items-center justify-content-center"
                style={{ backgroundColor: "#2f4a3c", fontSize: "14px", minHeight: "44px" }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;
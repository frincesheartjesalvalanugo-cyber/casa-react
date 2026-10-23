import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getStoredSessionUser, isAuthorizedAdmin } from "./authUtils";

function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const stored = getStoredSessionUser();
    if (stored) {
      setSession(stored);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        let userRole = "user";
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data()?.role) {
            userRole = userDoc.data().role;
          }
        } catch (e) {
          console.warn("Firestore role check warning:", e);
        }

        const activeSession = {
          uid: user.uid,
          name: user.displayName || user.email?.split("@")[0] || "User",
          email: user.email,
          role: userRole === "admin" || isAuthorizedAdmin(user.email, userRole) ? "Admin" : "Guest",
        };
        setSession(activeSession);
      } else {
        setCurrentUser(null);
        if (!localStorage.getItem("casa_current_user")) {
          setSession(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const isLoggedIn = !!currentUser || !!session;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Logout error:", e);
    }
    localStorage.removeItem("casa_current_user");
    localStorage.removeItem("casa_admin_logged");
    setSession(null);
    setCurrentUser(null);
    window.location.reload();
  };

  const getBookingUrl = (room) => {
    const roomParam = room ? `room=${room}` : "";
    if (isLoggedIn) {
      return `/reservation.html${roomParam ? `?${roomParam}` : ""}`;
    }
    const queryParts = ["redirect=reservation"];
    if (roomParam) queryParts.push(roomParam);
    return `/login.html?${queryParts.join("&")}`;
  };

  const handleBookClick = (e, room) => {
    e.preventDefault();
    const hasActiveAuth = !!auth.currentUser || !!currentUser || !!session || !!getStoredSessionUser();
    const roomParam = room ? `room=${room}` : "";
    if (hasActiveAuth) {
      window.location.href = `/reservation.html${roomParam ? `?${roomParam}` : ""}`;
    } else {
      const queryParts = ["redirect=reservation"];
      if (roomParam) queryParts.push(roomParam);
      window.location.href = `/login.html?${queryParts.join("&")}`;
    }
  };

  const isAdmin = session && isAuthorizedAdmin(session, session.role);

  return (
    <div style={{ backgroundColor: "#eef2e6", minHeight: "100vh" }}>
      <nav className="navbar navbar-expand-lg navbar-dark sticky-top px-3 px-md-4" style={{ backgroundColor: "#2f4a3c", borderBottom: "1px solid #24392e" }}>
        <div className="container-fluid">
          <a className="navbar-brand fw-bold fs-4 text-white" href="/" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "1px" }}>
            Casa Gracia's
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link active fw-bold px-3 text-white" href="/">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link px-3" href="#about" style={{ color: "#c8d4bf" }}>About Us</a>
              </li>
              <li className="nav-item">
                <a className="nav-link px-3" href="#reviews" style={{ color: "#c8d4bf" }}>Reviews</a>
              </li>

              <li className="nav-item dropdown position-static">
                <a className="nav-link dropdown-toggle px-3" href="#rooms" id="roomsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false" style={{ color: "#c8d4bf" }}>
                  Rooms & Accommodations
                </a>
                <div className="dropdown-menu w-100 shadow-lg border-0 p-3 p-md-4 mt-0 rounded-0 rounded-bottom" aria-labelledby="roomsDropdown" style={{ backgroundColor: "#ffffff", borderTop: "3px solid #6b8f5e" }}>
                  <div className="container">
                    <div className="row g-4 text-center justify-content-center">
                      <div className="col-12 col-md-6 border-0 border-md-end" style={{ borderColor: "#d8e0c9" }}>
                        <div className="p-2 p-md-3">
                          <img src="/villa-1.jpg" alt="Villa Type Room" className="img-fluid rounded-3 mb-3 shadow-sm" style={{ height: "160px", width: "100%", objectFit: "cover", aspectRatio: "16/9" }} />
                          <h5 className="fw-bold text-uppercase mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Villa Type Room</h5>
                          <p className="small mb-3" style={{ color: "#7a8a6f" }}>Spacious and air-conditioned rooms designed for family comfort.</p>
                          <a
                            className="btn rounded-pill px-4 fw-bold text-white d-inline-flex align-items-center justify-content-center"
                            href={getBookingUrl("villa")}
                            onClick={(e) => handleBookClick(e, "villa")}
                            style={{ backgroundColor: "#6b8f5e", border: "none", minHeight: "44px" }}
                          >
                            Reserve / View Details
                          </a>
                        </div>
                      </div>

                      <div className="col-12 col-md-6">
                        <div className="p-2 p-md-3">
                          <img src="/kubo-1.jpg" alt="Kubo Type Room" className="img-fluid rounded-3 mb-3 shadow-sm" style={{ height: "160px", width: "100%", objectFit: "cover", aspectRatio: "16/9" }} />
                          <h5 className="fw-bold text-uppercase mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Kubo Type Room</h5>
                          <p className="small mb-3" style={{ color: "#7a8a6f" }}>Cozy tropical experience surrounded by natural breeze.</p>
                          <a
                            className="btn rounded-pill px-4 fw-bold text-white d-inline-flex align-items-center justify-content-center"
                            href={getBookingUrl("kubo")}
                            onClick={(e) => handleBookClick(e, "kubo")}
                            style={{ backgroundColor: "#6b8f5e", border: "none", minHeight: "44px" }}
                          >
                            Reserve / View Details
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>

              <li className="nav-item">
                <a className="nav-link px-3" href="#contact" style={{ color: "#c8d4bf" }}>Contact</a>
              </li>
            </ul>
            <div className="d-flex align-items-center justify-content-center justify-content-lg-end flex-wrap gap-2 mt-3 mt-lg-0 pb-2 pb-lg-0">
              <a
                href={getBookingUrl()}
                onClick={(e) => handleBookClick(e)}
                className="btn rounded-pill px-3 fw-semibold text-white shadow-sm d-inline-flex align-items-center justify-content-center"
                style={{ backgroundColor: "#6b8f5e", border: "none", minHeight: "44px" }}
              >
                Book Now
              </a>
              {session ? (
                <>
                  {isAdmin && (
                    <a href="/admin-dashboard.html" className="btn btn-outline-warning rounded-pill px-3 fw-semibold d-inline-flex align-items-center justify-content-center" style={{ minHeight: "44px" }}>
                      Admin Portal
                    </a>
                  )}
                  <button onClick={handleLogout} className="btn btn-outline-light rounded-pill px-3 d-inline-flex align-items-center justify-content-center" style={{ minHeight: "44px" }}>
                    Logout
                  </button>
                </>
              ) : (
                <a href="/login.html" className="btn btn-outline-light rounded-pill px-4 d-inline-flex align-items-center justify-content-center" style={{ minHeight: "44px" }}>
                  Login
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      <header className="hero-section text-white d-flex align-items-center justify-content-center text-center overflow-hidden position-relative" style={{ minHeight: "calc(100vh - 76px)", backgroundImage: "url('/Casa-Gracias-hero.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", padding: "60px 16px" }}>
        <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: "rgba(36, 57, 46, 0.6)" }}></div>
        <div className="container hero-content position-relative z-1 p-4 p-md-5 rounded-4 shadow-lg text-white" style={{ maxWidth: "780px" }}>
          <h1 className="display-5 display-md-4 fw-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "1px" }}>Welcome to Casa Gracia's</h1>
          <p className="lead fs-6 fs-md-5 mb-4" style={{ color: "#eef2e6" }}>Experience the perfect blend of local hospitality and tropical elegance.</p>
          <div className="d-flex flex-wrap justify-content-center gap-3">
            <a
              className="btn text-white btn-lg rounded-pill px-4 px-md-5 fw-bold shadow"
              href={getBookingUrl()}
              onClick={(e) => handleBookClick(e)}
              style={{ backgroundColor: "#6b8f5e", border: "none" }}
            >
              Book Now
            </a>
            <a className="btn btn-outline-light btn-lg rounded-pill px-4 px-md-5 fw-bold" href="#about">
              Discover More
            </a>
          </div>
        </div>
      </header>

      <section id="about" className="container py-5 text-center">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h2 className="fw-bold fs-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>About Us</h2>
            <p className="lead mt-3" style={{ color: "#5a6b5d" }}>Casa Gracia's Hotel is more than just a place to stay; it's an experience. We pride ourselves on providing comfortable accommodations and warm hospitality, ensuring every guest feels right at home.</p>
            <img src="/Casa-Gracias-logo.jpg" alt="Casa Gracia's Logo" className="mt-4 shadow rounded-5 d-block mx-auto img-fluid" style={{ maxWidth: "230px", border: "3px solid #d8e0c9" }} />
          </div>
        </div>
      </section>

      <section id="rooms" className="py-5" style={{ backgroundColor: "#e4ebd9" }}>
        <div className="container">
          <div className="row text-center mb-5">
            <div className="col-lg-12">
              <h2 className="fw-bold fs-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Our Accommodations</h2>
            </div>
          </div>
          <div className="row g-4 justify-content-center mb-5">
            <div className="col-12 col-md-6 col-lg-5">
              <div className="card shadow-lg border-0 rounded-4 h-100 overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
                <img src="/villa-1.jpg" alt="Villa Type Room" className="w-100" style={{ height: "200px", objectFit: "cover", aspectRatio: "16/9" }} />
                <div className="card-body p-4 text-center d-flex flex-column">
                  <h4 className="card-title fw-bold mb-3" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Villa Type Room</h4>
                  <p className="card-text small mb-4 flex-grow-1" style={{ color: "#7a8a6f" }}>Private, spacious, and air-conditioned accommodation for families.</p>
                  <a
                    href={getBookingUrl("villa")}
                    onClick={(e) => handleBookClick(e, "villa")}
                    className="btn rounded-pill w-100 d-inline-flex align-items-center justify-content-center text-white fw-bold py-2 text-decoration-none"
                    style={{ backgroundColor: "#6b8f5e", border: "none", minHeight: "44px" }}
                  >
                    Book Villa
                  </a>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-5">
              <div className="card shadow-lg border-0 rounded-4 h-100 overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
                <img src="/kubo-1.jpg" alt="Kubo Type Room" className="w-100" style={{ height: "200px", objectFit: "cover", aspectRatio: "16/9" }} />
                <div className="card-body p-4 text-center d-flex flex-column">
                  <h4 className="card-title fw-bold mb-3" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Kubo Type Room</h4>
                  <p className="card-text small mb-4 flex-grow-1" style={{ color: "#7a8a6f" }}>Cozy tropical kubo experience perfect for nature lovers.</p>
                  <a
                    href={getBookingUrl("kubo")}
                    onClick={(e) => handleBookClick(e, "kubo")}
                    className="btn rounded-pill w-100 d-inline-flex align-items-center justify-content-center text-white fw-bold py-2 text-decoration-none"
                    style={{ backgroundColor: "#6b8f5e", border: "none", minHeight: "44px" }}
                  >
                    Book Kubo
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <a href="#reviews" className="btn rounded-pill px-5 py-3 fw-bold text-white shadow-sm" style={{ backgroundColor: "#2f4a3c", border: "none" }}>
              ★ Read Guest Reviews
            </a>
          </div>
        </div>
      </section>

      <section id="reviews" className="py-5" style={{ backgroundColor: "#ffffff", borderTop: "1px solid #d8e0c9", borderBottom: "1px solid #d8e0c9" }}>
        <div className="container text-center">
          <h2 className="fw-bold fs-1 mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Guest Reviews</h2>
          <p className="small mb-5" style={{ color: "#7a8a6f" }}>See what our happy guests have to say about their stay</p>

          <div className="row g-4 justify-content-center">
            <div className="col-md-4">
              <div className="p-4 rounded-4 shadow-sm h-100 text-start" style={{ backgroundColor: "#eef2e6", border: "1px solid #d8e0c9" }}>
                <div className="mb-2" style={{ color: "#f5a623" }}>★★★★★</div>
                <p className="small fst-italic mb-3" style={{ color: "#2f4a3c" }}>
                  "Amazing experience! The Villa room was so spacious, clean, and refreshing for our family vacation. Highly recommended!"
                </p>
                <div className="fw-bold small" style={{ color: "#2f4a3c" }}>— Maria Santos</div>
                <div className="text-muted extra-small" style={{ fontSize: "0.8rem", color: "#7a8a6f" }}>Stayed in Villa Type Room</div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-4 rounded-4 shadow-sm h-100 text-start" style={{ backgroundColor: "#eef2e6", border: "1px solid #d8e0c9" }}>
                <div className="mb-2" style={{ color: "#f5a623" }}>★★★★★</div>
                <p className="small fst-italic mb-3" style={{ color: "#2f4a3c" }}>
                  "Loved the peaceful tropical vibes of the Kubo room! The breeze and hospitality at Casa Gracia's are unmatched."
                </p>
                <div className="fw-bold small" style={{ color: "#2f4a3c" }}>— John Reyes</div>
                <div className="text-muted extra-small" style={{ fontSize: "0.8rem", color: "#7a8a6f" }}>Stayed in Kubo Type Room</div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-4 rounded-4 shadow-sm h-100 text-start" style={{ backgroundColor: "#eef2e6", border: "1px solid #d8e0c9" }}>
                <div className="mb-2" style={{ color: "#f5a623" }}>★★★★★</div>
                <p className="small fst-italic mb-3" style={{ color: "#2f4a3c" }}>
                  "Booking was seamless and the staff made sure we had everything we needed. Will definitely return soon!"
                </p>
                <div className="fw-bold small" style={{ color: "#2f4a3c" }}>— Angela & Mark</div>
                <div className="text-muted extra-small" style={{ fontSize: "0.8rem", color: "#7a8a6f" }}>Stayed in Villa Type Room</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-5" style={{ backgroundColor: "#e4ebd9" }}>
        <div className="container text-center">
          <h2 className="fw-bold fs-1 mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Contact Us</h2>
          <p className="small mb-5" style={{ color: "#7a8a6f" }}>Have questions or special requests? Reach out to us anytime!</p>

          <div className="row g-4 justify-content-center">
            <div className="col-md-4">
              <div className="p-4 rounded-4 shadow-sm h-100 text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
                <div className="fs-2 mb-3" style={{ color: "#6b8f5e" }}>📞</div>
                <h5 className="fw-bold mb-2" style={{ color: "#2f4a3c", fontFamily: "'Playfair Display', serif" }}>Phone</h5>
                <p className="small mb-3" style={{ color: "#7a8a6f" }}>Direct call & SMS inquiry</p>
                <a href="tel:09563002047" className="btn rounded-pill px-4 py-2 fw-bold text-white text-decoration-none d-inline-flex align-items-center justify-content-center" style={{ backgroundColor: "#2f4a3c", border: "none", minHeight: "44px" }}>
                  09563002047
                </a>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-4 rounded-4 shadow-sm h-100 text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
                <div className="fs-2 mb-3" style={{ color: "#6b8f5e" }}>✉️</div>
                <h5 className="fw-bold mb-2" style={{ color: "#2f4a3c", fontFamily: "'Playfair Display', serif" }}>Email</h5>
                <p className="small mb-3" style={{ color: "#7a8a6f" }}>Send your inquiries or booking details</p>
                <a href="mailto:casagraciashotel@gmail.com" className="btn rounded-pill px-4 py-2 fw-bold text-white text-decoration-none d-inline-flex align-items-center justify-content-center" style={{ backgroundColor: "#2f4a3c", border: "none", minHeight: "44px" }}>
                  casagraciashotel@gmail.com
                </a>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-4 rounded-4 shadow-sm h-100 text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #d8e0c9" }}>
                <div className="fs-2 mb-3" style={{ color: "#6b8f5e" }}>💬</div>
                <h5 className="fw-bold mb-2" style={{ color: "#2f4a3c", fontFamily: "'Playfair Display', serif" }}>Facebook Messenger</h5>
                <p className="small mb-3" style={{ color: "#7a8a6f" }}>Chat with us on Messenger</p>
                <a href="https://m.me" target="_blank" rel="noopener noreferrer" className="btn rounded-pill px-4 py-2 fw-bold text-white text-decoration-none d-inline-flex align-items-center justify-content-center" style={{ backgroundColor: "#2f4a3c", border: "none", minHeight: "44px" }}>
                  Casa Gracia's Hotel
                </a>
              </div>
            </div>
          </div>

          <div className="mt-5 d-flex justify-content-center px-2">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3893.938720397941!2d121.52081207483447!3d12.58629038769476!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bb49b5018598c9%3A0xd03c70d93a1300de!2sCasa%20Gracias%20resort!5e0!3m2!1sen!2sph!4v1789033362799!5m2!1sen!2sph"
              style={{ border: 0, width: "100%", maxWidth: "600px", height: "350px", borderRadius: "1rem" }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="Casa Gracias Resort Location Map"
            ></iframe>
          </div>
        </div>
      </section>

      <footer className="text-center py-4" style={{ backgroundColor: "#2f4a3c", color: "#c8d4bf", borderTop: "1px solid #24392e" }}>
        <div className="container">
          <p className="mb-0">&copy; 2026 Casa Gracia's Hotel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
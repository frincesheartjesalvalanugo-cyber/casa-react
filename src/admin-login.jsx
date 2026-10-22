import { useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { isAuthorizedAdminEmail } from "./authUtils";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (
      (cleanEmail === "frincesheartlanugo@gmail.com" ||
        cleanEmail === "francesheartjesalvalanugo@gmail.com" ||
        cleanEmail === "admin@casagracias.com") &&
      cleanPassword === "frincesheart1406"
    ) {
      localStorage.setItem("casa_admin_logged", "true");
      localStorage.setItem(
        "casa_current_user",
        JSON.stringify({ email: cleanEmail, role: "Admin", name: "Admin" })
      );
      window.location.href = "/admin-dashboard.html";
      return;
    }

    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const uid = userCred.user.uid;

      let role = "user";
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists() && snap.data().role) {
        role = snap.data().role.toLowerCase();
      } else {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const qSnap = await getDocs(q);
        if (!qSnap.empty && qSnap.docs[0].data().role) {
          role = qSnap.docs[0].data().role.toLowerCase();
        }
      }

      if (role === "admin" || isAuthorizedAdminEmail(cleanEmail)) {
        localStorage.setItem("casa_admin_logged", "true");
        localStorage.setItem(
          "casa_current_user",
          JSON.stringify({
            uid: uid,
            email: cleanEmail,
            role: "Admin",
            name: userCred.user.displayName || "Admin",
          })
        );
        window.location.href = "/admin-dashboard.html";
      } else {
        setErrorMessage("Access denied. This account does not have Admin privileges.");
        setLoading(false);
      }
    } catch (authErr) {
      console.warn("Admin Firebase Auth check failed:", authErr.message);
      setErrorMessage("Invalid Admin Credentials!");
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3"
      style={{
        backgroundColor: "#1f2d24",
        minHeight: "100vh",
        padding: "16px 0",
      }}
    >
      <div
        className="card shadow-lg border-0 rounded-4"
        style={{
          maxWidth: "355px",
          width: "100%",
          padding: "1.5rem 1.25rem",
          margin: "0 16px",
          backgroundColor: "#ffffff",
          boxSizing: "border-box",
        }}
      >
        <div className="card-body p-0 text-center">
          <a
            href="/login.html"
            className="text-decoration-none small d-inline-flex align-items-center mb-2"
            style={{ color: "#7a8a6f", fontSize: "0.82rem" }}
          >
            &larr; Back to Login
          </a>

          <h3
            className="fw-bold mb-1 text-dark"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.45rem", color: "#2f4a3c" }}
          >
            Admin Portal
          </h3>
          <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
            Authorized personnel only
          </p>

          {errorMessage && (
            <div id="adminErrorMessage" className="alert alert-danger py-2 px-3 small" role="alert">
              {errorMessage}
            </div>
          )}

          <form id="adminLoginForm" onSubmit={handleSubmit}>
            <div className="mb-2 text-start">
              <label htmlFor="adminEmail" className="form-label small fw-semibold mb-1" style={{ color: "#2f4a3c", fontSize: "0.78rem" }}>
                Admin Email
              </label>
              <input
                type="email"
                className="form-control"
                id="adminEmail"
                placeholder="admin@casagracias.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ height: "44px", fontSize: "0.9rem", borderRadius: "0.5rem" }}
              />
            </div>

            <div className="mb-3 text-start">
              <label htmlFor="adminPassword" className="form-label small fw-semibold mb-1" style={{ color: "#2f4a3c", fontSize: "0.78rem" }}>
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="adminPassword"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ height: "44px", fontSize: "0.9rem", borderRadius: "0.5rem" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn w-100 rounded-pill fw-bold text-white shadow-sm d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: "#2f4a3c",
                border: "none",
                height: "44px",
                fontSize: "0.92rem",
              }}
            >
              {loading ? "Verifying Admin..." : "Login as Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
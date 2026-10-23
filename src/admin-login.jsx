import { useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { isAuthorizedAdminEmail, signInWithGoogle, isInAppBrowser } from "./authUtils";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inAppBrowser = isInAppBrowser();

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setLoading(true);
    try {
      const userCred = await signInWithGoogle();
      const googleUser = userCred.user;
      const cleanEmail = googleUser.email.toLowerCase();
      const uid = googleUser.uid;

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
            name: googleUser.displayName || "Admin",
          })
        );
        window.location.href = "/admin-dashboard.html";
      } else {
        setErrorMessage("Access denied. This account does not have Admin privileges.");
        setLoading(false);
      }
    } catch (authErr) {
      console.warn("Admin Google Auth check failed:", authErr.message);
      setErrorMessage(authErr.message || "Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

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
          maxWidth: "380px",
          width: "100%",
          padding: "1.5rem 1.25rem",
          margin: "0 auto",
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

          <div className="d-flex align-items-center my-3">
            <hr className="flex-grow-1 my-0" />
            <span className="px-2 small text-muted" style={{ fontSize: "0.75rem" }}>or</span>
            <hr className="flex-grow-1 my-0" />
          </div>

          {inAppBrowser && (
            <div className="alert alert-warning py-2 px-3 small text-start mb-2" style={{ fontSize: "0.78rem" }}>
              Google sign-in doesn't work inside this app's browser. Tap the ... menu and choose 'Open in Chrome/Browser', or log in with your email and password.
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || inAppBrowser}
            className="btn w-100 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2 border shadow-sm"
            style={{
              backgroundColor: "#ffffff",
              color: "#5f6368",
              height: "44px",
              fontSize: "0.88rem",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
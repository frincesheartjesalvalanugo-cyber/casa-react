import { useState } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "firebase/firestore";
import { isAuthorizedAdminEmail } from "./authUtils";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  const roomQuery = room ? `?room=${room}` : "";

  const scanRoleAndRedirect = async (userObj, fallbackEmail = "") => {
    const userEmail = (userObj?.email || fallbackEmail || "").trim().toLowerCase();
    const uid = userObj?.uid;
    let detectedRole = "user";
    let userName = userObj?.displayName || userEmail.split("@")[0] || "User";

    setStatusMessage("Verifying account permissions...");
    setStatusType("info");

    try {
      if (isAuthorizedAdminEmail(userEmail)) {
        detectedRole = "admin";
      }

      if (uid) {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.role) {
            detectedRole = data.role.toLowerCase();
          }
          if (data.name || data.displayName) {
            userName = data.name || data.displayName;
          }
        } else {
          const q = query(collection(db, "users"), where("email", "==", userEmail));
          const qSnap = await getDocs(q);

          if (!qSnap.empty) {
            const data = qSnap.docs[0].data();
            if (data.role) {
              detectedRole = data.role.toLowerCase();
            }
            if (data.name || data.displayName) {
              userName = data.name || data.displayName;
            }
          } else {
            await setDoc(userDocRef, {
              uid: uid,
              name: userName,
              email: userEmail,
              role: detectedRole,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            });
          }
        }
      } else if (userEmail) {
        const q = query(collection(db, "users"), where("email", "==", userEmail));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const data = qSnap.docs[0].data();
          if (data.role) {
            detectedRole = data.role.toLowerCase();
          }
          if (data.name || data.displayName) {
            userName = data.name || data.displayName;
          }
        }
      }
    } catch (firestoreErr) {
      console.warn("Firestore scan warning (using fallback check):", firestoreErr);
      if (isAuthorizedAdminEmail(userEmail)) {
        detectedRole = "admin";
      }
    }

    const sessionUser = {
      uid: uid || `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: userName,
      email: userEmail,
      role: detectedRole === "admin" ? "Admin" : "Guest",
    };

    localStorage.setItem("casa_current_user", JSON.stringify(sessionUser));

    try {
      const existingUsers = JSON.parse(localStorage.getItem("casa_registered_users") || "[]");
      const exists = existingUsers.some((u) => u.email?.toLowerCase() === userEmail);
      if (!exists && userEmail) {
        existingUsers.unshift({
          id: sessionUser.uid,
          name: sessionUser.name,
          email: userEmail,
          role: sessionUser.role,
          dateRegistered: new Date().toISOString().split("T")[0],
          status: "Active",
        });
        localStorage.setItem("casa_registered_users", JSON.stringify(existingUsers));
      }
    } catch (e) {
      console.error("Local user registry update error:", e);
    }

    if (detectedRole === "admin") {
      localStorage.setItem("casa_admin_logged", "true");
      setStatusType("success");
      setStatusMessage("Admin role verified! Opening Admin Portal...");
      setTimeout(() => {
        window.location.href = "/admin-dashboard.html";
      }, 600);
    } else {
      setStatusType("success");
      setStatusMessage(`Welcome ${userName}! Opening Reservation...`);
      setTimeout(() => {
        window.location.href = `/reservation.html${roomQuery}`;
      }, 600);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setStatusMessage("Signing in with Google...");
    setStatusType("info");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await scanRoleAndRedirect(result.user);
    } catch (error) {
      console.error("Google login failed:", error);
      setStatusType("danger");
      setStatusMessage(error.message || "Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatusMessage("Signing in...");
    setStatusType("info");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Check direct admin credentials
    if (
      (cleanEmail === "frincesheartlanugo@gmail.com" ||
        cleanEmail === "francesheartjesalvalanugo@gmail.com" ||
        cleanEmail === "admin@casagracias.com") &&
      cleanPassword === "frincesheart1406"
    ) {
      await scanRoleAndRedirect({ email: cleanEmail, displayName: "Admin" });
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      await scanRoleAndRedirect(userCred.user);
    } catch (firebaseErr) {
      console.warn("Firebase Auth attempt failed:", firebaseErr.message);

      // Check registered users in local storage as fallback
      const localUsers = JSON.parse(localStorage.getItem("casa_registered_users") || "[]");
      const matchedUser = localUsers.find(
        (u) => u.email?.toLowerCase() === cleanEmail && (!u.password || u.password === cleanPassword)
      );

      if (matchedUser) {
        await scanRoleAndRedirect({
          email: matchedUser.email,
          displayName: matchedUser.name,
          uid: matchedUser.id,
        });
      } else {
        setStatusType("danger");
        setStatusMessage("Invalid email or password. Please try again.");
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3"
      style={{
        backgroundColor: "#eef2e6",
        minHeight: "100vh",
        padding: "16px 0",
      }}
    >
      <div
        className="rounded-4 shadow-lg"
        style={{
          backgroundColor: "#ffffff",
          maxWidth: "355px",
          width: "100%",
          padding: "1.5rem 1.25rem",
          margin: "0 16px",
          border: "1px solid #d8e0c9",
          boxSizing: "border-box",
        }}
      >
        <div className="text-center">
          <a
            href="/"
            className="text-decoration-none small d-inline-flex align-items-center mb-2"
            style={{ color: "#7a8a6f", fontSize: "0.82rem" }}
          >
            &larr; Back to Home
          </a>

          <h3
            className="fw-bold mb-1"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2f4a3c",
              fontSize: "1.45rem",
              lineHeight: "1.2",
            }}
          >
            Casa Gracia's
          </h3>
          <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
            Sign in to access your portal
          </p>

          {statusMessage && (
            <div
              className={`alert alert-${statusType} py-1 px-2 small mb-2 d-flex align-items-center justify-content-center gap-2`}
              role="alert"
              style={{ fontSize: "0.78rem" }}
            >
              {loading && <div className="spinner-border spinner-border-sm" role="status" />}
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-2 text-start">
              <label htmlFor="loginEmail" className="form-label small fw-semibold mb-1" style={{ color: "#2f4a3c", fontSize: "0.78rem" }}>
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                id="loginEmail"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  height: "44px",
                  fontSize: "0.9rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #c8d4bf",
                }}
              />
            </div>

            <div className="mb-3 text-start">
              <label htmlFor="loginPassword" className="form-label small fw-semibold mb-1" style={{ color: "#2f4a3c", fontSize: "0.78rem" }}>
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="loginPassword"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  height: "44px",
                  fontSize: "0.9rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #c8d4bf",
                }}
              />
            </div>

            <button
              type="submit"
              id="loginBtn"
              className="btn w-100 rounded-pill fw-bold text-white shadow-sm d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: "#2f4a3c",
                border: "none",
                height: "44px",
                fontSize: "0.92rem",
              }}
              disabled={loading}
            >
              {loading ? "Signing In..." : "Login"}
            </button>
          </form>

          <div className="d-flex align-items-center my-2">
            <hr className="flex-grow-1 my-0" />
            <span className="px-2 small text-muted" style={{ fontSize: "0.75rem" }}>or</span>
            <hr className="flex-grow-1 my-0" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn w-100 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2 border shadow-sm"
            style={{
              backgroundColor: "#ffffff",
              color: "#5f6368",
              height: "44px",
              fontSize: "0.88rem",
            }}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            Sign in with Google
          </button>

          <p className="mt-2 mb-0 small" style={{ color: "#7a8a6f", fontSize: "0.82rem" }}>
            Don't have an account?{" "}
            <a
              href={`/signup.html${roomQuery}`}
              className="text-decoration-none fw-bold"
              style={{ color: "#6b8f5e" }}
            >
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
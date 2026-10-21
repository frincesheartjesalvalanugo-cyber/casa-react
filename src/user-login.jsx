import { useState } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup } from "firebase/auth";
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

function UserLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  const roomQuery = room ? `?room=${room}` : "";

  const checkRoleAndRedirect = async (userEmail, uid, displayName) => {
    let role = "user";
    const cleanEmail = (userEmail || "").trim().toLowerCase();

    if (cleanEmail === "admin@casagracias.com") {
      role = "admin";
    } else {
      try {
        if (uid) {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists() && snap.data().role) {
            role = snap.data().role.toLowerCase();
          }
        }
        if (role === "user") {
          const q = query(collection(db, "users"), where("email", "==", cleanEmail));
          const qSnap = await getDocs(q);
          if (!qSnap.empty && qSnap.docs[0].data().role) {
            role = qSnap.docs[0].data().role.toLowerCase();
          }
        }
      } catch (err) {
        console.warn("Firestore role check warning:", err);
      }
    }

    localStorage.setItem(
      "casa_current_user",
      JSON.stringify({
        uid: uid || `USR-${Math.floor(100 + Math.random() * 900)}`,
        name: displayName || cleanEmail.split("@")[0],
        email: cleanEmail,
        role: role === "admin" ? "Admin" : "Guest",
      })
    );

    if (role === "admin") {
      localStorage.setItem("casa_admin_logged", "true");
      window.location.href = "/admin-dashboard.html";
    } else {
      window.location.href = `/reservation.html${roomQuery}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage("Please fill out all fields.");
      return;
    }

    setLoading(true);
    try {
      const existingUsers = JSON.parse(localStorage.getItem("casa_registered_users") || "[]");
      const userExists = existingUsers.some(
        (u) => u.email.toLowerCase() === cleanEmail.toLowerCase()
      );

      if (!userExists) {
        const newUser = {
          id: `USR-${Math.floor(100 + Math.random() * 900)}`,
          name: cleanEmail.split("@")[0],
          email: cleanEmail,
          password: cleanPassword,
          role: cleanEmail.toLowerCase() === "admin@casagracias.com" ? "Admin" : "Guest",
          dateRegistered: new Date().toISOString().split("T")[0],
          status: "Active",
        };
        existingUsers.unshift(newUser);
        localStorage.setItem("casa_registered_users", JSON.stringify(existingUsers));
      }

      await checkRoleAndRedirect(cleanEmail, null, cleanEmail.split("@")[0]);
    } catch (err) {
      console.error("Error logging in:", err);
      setErrorMessage("Login failed. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      const existingUsers = JSON.parse(localStorage.getItem("casa_registered_users") || "[]");
      const userExists = existingUsers.some(
        (u) => u.email.toLowerCase() === googleUser.email.toLowerCase()
      );

      if (!userExists) {
        const newUser = {
          id: googleUser.uid,
          name: googleUser.displayName || googleUser.email.split("@")[0],
          email: googleUser.email,
          role: "Guest",
          dateRegistered: new Date().toISOString().split("T")[0],
          status: "Active",
        };
        existingUsers.unshift(newUser);
        localStorage.setItem("casa_registered_users", JSON.stringify(existingUsers));

        try {
          await setDoc(doc(db, "users", googleUser.uid), {
            uid: googleUser.uid,
            name: newUser.name,
            email: googleUser.email.toLowerCase(),
            role: "user",
            createdAt: serverTimestamp(),
          });
        } catch (fErr) {
          console.warn("Firestore sync warning:", fErr);
        }
      }

      await checkRoleAndRedirect(googleUser.email, googleUser.uid, googleUser.displayName);
    } catch (error) {
      console.error("Google login failed:", error);
      setErrorMessage("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: "#eef2e6" }}>
      <div className="p-4 rounded-4 shadow-lg" style={{ backgroundColor: "#ffffff", maxWidth: 400, width: "100%", border: "1px solid #d8e0c9" }}>
        <div className="text-center">
          <a href={`/login.html${roomQuery}`} className="text-decoration-none small d-block text-start mb-3" style={{ color: "#7a8a6f" }}>
            &larr; Back
          </a>

          <h3 className="fw-bold mb-3" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>User Login</h3>
          <p className="small mb-4" style={{ color: "#7a8a6f" }}>Enter registered email to log in</p>

          {errorMessage && (
            <div id="errorMessage" className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}

          <form id="userLoginForm" onSubmit={handleSubmit}>
            <div className="form-floating mb-3 text-start">
              <input
                type="email"
                className="form-control"
                id="loginEmail"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="loginEmail">Email Address</label>
            </div>

            <div className="form-floating mb-4 text-start">
              <input
                type="password"
                className="form-control"
                id="loginPassword"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="loginPassword">Password</label>
            </div>

            <button
              type="submit"
              id="loginBtn"
              className="w-100 py-2 rounded-pill fw-bold"
              style={{ backgroundColor: "#2f4a3c", color: "#ffffff", border: "none" }}
            >
              Login
            </button>
          </form>

          <div className="d-flex align-items-center my-3">
            <hr className="flex-grow-1" />
            <span className="px-2 small" style={{ color: "#7a8a6f" }}>or</span>
            <hr className="flex-grow-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-100 py-2 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2 border"
            style={{ backgroundColor: "#ffffff", color: "#5f6368" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Sign in with Google
          </button>

          <p className="mt-3 small" style={{ color: "#7a8a6f" }}>
            Don't have an account?{" "}
            <a href={`/signup.html${roomQuery}`} className="text-decoration-none fw-bold" style={{ color: "#6b8f5e" }}>
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserLogin;
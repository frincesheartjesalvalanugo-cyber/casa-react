import { useState } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("danger");
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const redirectTarget = params.get("redirect");
  const room = params.get("room");
  const roomQuery = room ? `?room=${room}` : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMessage("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setAlertType("danger");
      setAlertMessage("Please fill out all fields.");
      return;
    }

    setLoading(true);
    let assignedUid = `USR-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      assignedUid = userCred.user.uid;

      await setDoc(doc(db, "users", assignedUid), {
        uid: assignedUid,
        name: cleanEmail.split("@")[0],
        email: cleanEmail.toLowerCase(),
        role: "user",
        createdAt: serverTimestamp(),
      });
    } catch (fbErr) {
      console.warn("Firebase Auth/Firestore signup notice:", fbErr.message);
    }

    try {
      const existingUsers = JSON.parse(localStorage.getItem("casa_registered_users") || "[]");
      const userExists = existingUsers.some(
        (u) => u.email.toLowerCase() === cleanEmail.toLowerCase()
      );

      if (!userExists) {
        const newUser = {
          id: assignedUid,
          name: cleanEmail.split("@")[0],
          email: cleanEmail,
          password: cleanPassword,
          role: "Guest",
          dateRegistered: new Date().toISOString().split("T")[0],
          status: "Active",
        };
        existingUsers.unshift(newUser);
        localStorage.setItem("casa_registered_users", JSON.stringify(existingUsers));
      }

      localStorage.setItem("casa_current_user", JSON.stringify({
        uid: assignedUid,
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
        role: "Guest",
      }));
    } catch (err) {
      console.error("Error updating user list:", err);
    }

    setAlertType("success");
    if (redirectTarget === "reservation") {
      setAlertMessage("Account created successfully! Redirecting to reservation...");
      setTimeout(() => {
        window.location.href = `/reservation.html${roomQuery}`;
      }, 1000);
    } else {
      setAlertMessage("Account created successfully! Opening Home...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  };

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
            href={`/login.html${roomQuery}`}
            className="text-decoration-none small d-inline-flex align-items-center mb-2"
            style={{ color: "#7a8a6f", fontSize: "0.82rem" }}
          >
            &larr; Back to Login
          </a>

          <h3
            className="fw-bold mb-1"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c", fontSize: "1.45rem" }}
          >
            Create Account
          </h3>
          <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
            Sign up to save your account
          </p>

          {alertMessage && (
            <div id="alertMessage" className={`alert alert-${alertType} py-2 px-3 small`} role="alert">
              {alertMessage}
            </div>
          )}

          <form id="signupForm" onSubmit={handleSubmit}>
            <div className="mb-2 text-start">
              <label htmlFor="signupEmail" className="form-label small fw-semibold mb-1" style={{ color: "#2f4a3c", fontSize: "0.78rem" }}>
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                id="signupEmail"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ height: "44px", fontSize: "0.9rem", borderRadius: "0.5rem" }}
              />
            </div>

            <div className="mb-3 text-start">
              <label htmlFor="signupPassword" className="form-label small fw-semibold mb-1" style={{ color: "#2f4a3c", fontSize: "0.78rem" }}>
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="signupPassword"
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
              id="signupBtn"
              disabled={loading}
              className="btn w-100 rounded-pill fw-bold text-white shadow-sm d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: "#2f4a3c",
                border: "none",
                height: "44px",
                fontSize: "0.92rem",
              }}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-3 mb-0 small" style={{ color: "#7a8a6f", fontSize: "0.82rem" }}>
            Already have an account?{" "}
            <a href={`/login.html${window.location.search}`} className="text-decoration-none fw-bold" style={{ color: "#6b8f5e" }}>
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
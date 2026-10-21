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
    setAlertMessage("Account created successfully! Redirecting to reservation...");

    setTimeout(() => {
      window.location.href = `/reservation.html${roomQuery}`;
    }, 1000);
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: "#eef2e6" }}>
      <div className="p-4 rounded-4 shadow-lg" style={{ backgroundColor: "#ffffff", maxWidth: 400, width: "100%", border: "1px solid #d8e0c9" }}>
        <div className="text-center">
          <a href={`/login.html${roomQuery}`} className="text-decoration-none small d-block text-start mb-3" style={{ color: "#7a8a6f" }}>
            &larr; Back
          </a>

          <h3 className="fw-bold mb-3" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>Create Account</h3>
          <p className="small mb-4" style={{ color: "#7a8a6f" }}>Sign up to save your account</p>

          {alertMessage && (
            <div id="alertMessage" className={`alert alert-${alertType}`} role="alert">
              {alertMessage}
            </div>
          )}

          <form id="signupForm" onSubmit={handleSubmit}>
            <div className="form-floating mb-3 text-start">
              <input
                type="email"
                className="form-control"
                id="signupEmail"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="signupEmail">Email Address</label>
            </div>

            <div className="form-floating mb-4 text-start">
              <input
                type="password"
                className="form-control"
                id="signupPassword"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="signupPassword">Password</label>
            </div>

            <button
              type="submit"
              id="signupBtn"
              disabled={loading}
              className="w-100 py-2 rounded-pill fw-bold"
              style={{ backgroundColor: "#2f4a3c", color: "#ffffff", border: "none" }}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-3 small" style={{ color: "#7a8a6f" }}>
            Already have an account?{" "}
            <a href={`/login.html${roomQuery}`} className="text-decoration-none fw-bold" style={{ color: "#6b8f5e" }}>
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
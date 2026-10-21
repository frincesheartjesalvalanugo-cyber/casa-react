import { useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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

    if (cleanEmail === "frincesheartlanugo@gmail.com" && cleanPassword === "frincesheart1406") {
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

      if (role === "admin") {
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
        setErrorMessage("Access denied. This account does not have Admin privileges in Firebase Console.");
        setLoading(false);
      }
    } catch (authErr) {
      console.warn("Admin Firebase Auth check failed:", authErr.message);
      setErrorMessage("Invalid Admin Credentials!");
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark d-flex align-items-center justify-content-center vh-100">
      <div className="card shadow-lg border-0 rounded-4 p-4" style={{ maxWidth: 400, width: "100%" }}>
        <div className="card-body text-center">
          <a href="/login.html" className="text-decoration-none text-muted small d-block text-start mb-3">
            &larr; Back
          </a>

          <h3 className="fw-bold mb-3 text-dark">Admin Portal</h3>
          <p className="text-muted small mb-4">Authorized personnel only</p>

          {errorMessage && (
            <div id="adminErrorMessage" className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}

          <form id="adminLoginForm" onSubmit={handleSubmit}>
            <div className="form-floating mb-3 text-start">
              <input
                type="email"
                className="form-control"
                id="adminEmail"
                placeholder="admin@casagracias.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="adminEmail">Admin Email</label>
            </div>

            <div className="form-floating mb-4 text-start">
              <input
                type="password"
                className="form-control"
                id="adminPassword"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="adminPassword">Password</label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary w-100 py-2 rounded-pill fw-bold"
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
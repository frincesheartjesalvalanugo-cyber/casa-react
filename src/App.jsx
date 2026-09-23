import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";
import Login from "./login.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Authentication, User Synchronization, & Role Retrieval
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setRole(userSnap.data().role || "user");
          } else {
            const defaultRole = currentUser.email?.toLowerCase() === "admin@casagracias.com" ? "admin" : "user";
            await setDoc(userRef, {
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              role: defaultRole,
              createdAt: serverTimestamp(),
            });
            setRole(defaultRole);
          }
        } catch (err) {
          console.warn("Error fetching role from Firestore:", err);
          setRole("user");
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

// Logout Handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRole(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: "#eef2e6" }}>
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!user ? (
        <Login />
      ) : (
        <div className="d-flex flex-column align-items-center justify-content-center vh-100" style={{ backgroundColor: "#eef2e6" }}>
          <h2 className="fw-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
            Welcome, {user.displayName || user.email}!
          </h2>
          <p className="small mb-2" style={{ color: "#7a8a6f" }}>{user.email}</p>
          <span className="badge bg-success mb-4 text-uppercase">Role: {role || "user"}</span>
          <div className="d-flex gap-2">
            {role === "admin" ? (
              <a href="/admin-dashboard.html" className="btn btn-dark rounded-pill px-4 fw-bold">
                Go to Admin Dashboard
              </a>
            ) : (
              <a href="/reservation.html" className="btn btn-success rounded-pill px-4 fw-bold">
                Go to Reservations
              </a>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-outline-secondary rounded-pill px-4 fw-bold"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
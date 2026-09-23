import { useState } from "react";
import { auth, googleProvider, db } from "./firebase";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
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

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  const roomQuery = room ? `?room=${room}` : "";

  // Helper to scan role from Firestore (Firebase Console) & route accordingly
  const scanRoleAndRedirect = async (userObj, fallbackEmail = "") => {
    const userEmail = (userObj?.email || fallbackEmail || "").trim().toLowerCase();
    const uid = userObj?.uid;
    let detectedRole = "user";
    let userName = userObj?.displayName || userEmail.split("@")[0] || "User";

    setStatusMessage("Scanning role in Firebase Console...");
    setStatusType("info");

    try {
      // 1. Check if designated admin email
      if (userEmail === "admin@casagracias.com") {
        detectedRole = "admin";
      }

      // 2. Check Firestore 'users' collection by UID
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
          // Check by email query if UID document doesn't exist
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
            // New user: Save to Firestore so it immediately appears in Firebase Console
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
        // Query by email in Firestore
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
      if (userEmail === "admin@casagracias.com") {
        detectedRole = "admin";
      }
    }

    // Save session to localStorage so existing app pages can read user data
    const sessionUser = {
      uid: uid || `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: userName,
      email: userEmail,
      role: detectedRole === "admin" ? "Admin" : "Guest",
    };

    localStorage.setItem("casa_current_user", JSON.stringify(sessionUser));

    // Update registered users list for Admin Dashboard
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

    // Automatically route / pop up the appropriate portal based on scanned role
    if (detectedRole === "admin") {
      localStorage.setItem("casa_admin_logged", "true");
      setStatusType("success");
      setStatusMessage("Admin role verified from Firebase! Opening Admin Portal...");
      setTimeout(() => {
        window.location.href = "/admin-dashboard.html";
      }, 700);
    } else {
      setStatusType("success");
      setStatusMessage(`Welcome ${userName}! Opening Reservation...`);
      setTimeout(() => {
        window.location.href = `/reservation.html${roomQuery}`;
      }, 700);
    }
  };

  // Google Sign-In handler
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

  // Email / Password Form Submit
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   const cleanEmail = email.trim();
  //   const cleanPassword = password.trim();

  //   if (!cleanEmail || !cleanPassword) {
  //     setStatusType("danger");
  //     setStatusMessage("Please enter both email and password.");
  //     return;
  //   }

  //   setLoading(true);
  //   setStatusMessage("Authenticating...");
  //   setStatusType("info");

  //   // Quick check for default admin credentials
  //   if (cleanEmail.toLowerCase() === "admin@casagracias.com" && cleanPassword === "admincasagracias2021") {
  //     await scanRoleAndRedirect({ email: cleanEmail, displayName: "Admin" }, cleanEmail);
  //     return;
  //   }

  //   try {
  //     // Attempt Firebase Authentication sign-in
  //     const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
  //     await scanRoleAndRedirect(userCredential.user, cleanEmail);
  //   } catch (authError) {
  //     console.warn("Firebase Auth sign-in failed, attempting fallback check:", authError.code);

  //     // Check if user was registered locally or in Firestore
  //     try {
  //       const existingUsers = JSON.parse(localStorage.getItem("casa_registered_users") || "[]");
  //       const matched = existingUsers.find(
  //         (u) => u.email.toLowerCase() === cleanEmail.toLowerCase()
  //       );

  //       if (matched) {
  //         await scanRoleAndRedirect(
  //           { email: cleanEmail, displayName: matched.name },
  //           cleanEmail
  //         );
  //         return;
  //       }

  //       // If user not found in Auth, offer seamless sign-up/creation in Firebase Auth
  //       if (authError.code === "auth/user-not-found" || authError.code === "auth/invalid-credential") {
  //         try {
  //           const newUserCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
  //           await scanRoleAndRedirect(newUserCred.user, cleanEmail);
  //           return;
  //         } catch (createErr) {
  //           console.warn("Auto-signup fallback error:", createErr);
  //           setStatusType("danger");
  //           setStatusMessage("Invalid email or password. Please check your credentials.");
  //           setLoading(false);
  //           return;
  //         }
  //       }
  //     } catch (fallbackErr) {
  //       console.error("Fallback check failed:", fallbackErr);
  //     }

  //     setStatusType("danger");
  //     setStatusMessage(authError.message || "Authentication failed. Please check your credentials.");
  //     setLoading(false);
  //   }
  // };
   async function handleSubmit(event) {
        event.preventDefault() //prevent refresh
        // console.log(fullName);
        try {
            await fetch('http://localhost:8080/api/logins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setEmail: email, 
                    setPassword: password

                })
            })
        } catch (err) {
            console.log(err);
        }
        
    } 

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: "#eef2e6" }}>
      <div
        className="p-4 p-md-5 rounded-4 shadow-lg"
        style={{
          backgroundColor: "#ffffff",
          maxWidth: 440,
          width: "100%",
          border: "1px solid #d8e0c9",
        }}
      >
        <div className="text-center">
          <a
            href="/home.html"
            className="text-decoration-none small d-inline-flex align-items-center mb-3"
            style={{ color: "#7a8a6f" }}
          >
            &larr; Back to Home
          </a>

          <h2 className="fw-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2f4a3c" }}>
            Casa Gracia's
          </h2>
          <p className="small mb-4" style={{ color: "#7a8a6f" }}>
            Sign in to access your portal
          </p>

          {statusMessage && (
            <div
              className={`alert alert-${statusType} py-2 px-3 small d-flex align-items-center justify-content-center gap-2`}
              role="alert"
            >
              {loading && <div className="spinner-border spinner-border-sm" role="status" />}
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-floating mb-3 text-start">
              <input
                type="email"
                className="form-control"
                id="loginEmail"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <label htmlFor="loginEmail">Email Address</label>
            </div>

            <div className="form-floating mb-3 text-start">
              <input
                type="password"
                className="form-control"
                id="loginPassword"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <label htmlFor="loginPassword">Password</label>
            </div>

            <button
              type="submit"
              id="loginBtn"
              className="btn w-100 py-3 rounded-pill fw-bold text-white shadow-sm"
              style={{ backgroundColor: "#2f4a3c", border: "none" }}
              disabled={loading}
            >
              {loading ? "Scanning & Logging in..." : "Login"}
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
            className="btn w-100 py-2 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2 border shadow-sm"
            style={{ backgroundColor: "#ffffff", color: "#5f6368" }}
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

          <p className="mt-4 mb-0 small" style={{ color: "#7a8a6f" }}>
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
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminLogin from "./admin-login.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AdminLogin />
  </StrictMode>
);
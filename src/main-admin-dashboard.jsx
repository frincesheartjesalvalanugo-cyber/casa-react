import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminDashboard from "./admin-dashboard.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AdminDashboard />
  </StrictMode>
);
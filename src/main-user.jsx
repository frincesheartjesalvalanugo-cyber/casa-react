import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import LoginUser from "./user-login.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LoginUser />
  </StrictMode>
);
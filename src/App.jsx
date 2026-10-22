import React from "react";
import Home from "./home.jsx";

/**
 * Root App Component
 * Loads the Casa Gracia's Landing Page by default on "/" (root URL).
 * Regular visitors always see the landing page first.
 * The Login page, Booking/Reservation, and Admin Backend can only be reached
 * by clicking action buttons (e.g., "Book Now", "Login") from this landing page.
 */
export default function App() {
  return <Home />;
}
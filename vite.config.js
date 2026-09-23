import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        login: resolve(import.meta.dirname, "login.html"),
        userLogin: resolve(import.meta.dirname, "user-login.html"),
        adminLogin: resolve(import.meta.dirname, "admin-login.html"),
        signup: resolve(import.meta.dirname, "signup.html"),
        adminDashboard: resolve(import.meta.dirname, "admin-dashboard.html"),
        home: resolve(import.meta.dirname, "home.html"),
        reservation: resolve(import.meta.dirname, "reservation.html"),
      },
    },
  },
});
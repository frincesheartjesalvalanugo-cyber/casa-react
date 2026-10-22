/**
 * Centralized Authentication & Admin Authorization Utilities
 * Casa Gracia's Hotel & Resort
 */

export const ADMIN_EMAILS = [
  "frincesheartlanugo@gmail.com",
  "francesheartjesalvalanugo@gmail.com",
  "admin@casagracias.com",
];

export const ADMIN_AUTH_SECRET = "casa-admin-secret-2026";

/**
 * Checks if a given email is in the authorized admin list
 */
export function isAuthorizedAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Checks if a user object or role represents an authorized admin
 */
export function isAuthorizedAdmin(user, role) {
  const email = (typeof user === "string" ? user : user?.email || "")?.trim().toLowerCase();
  if (email && isAuthorizedAdminEmail(email)) {
    return true;
  }
  if (role && typeof role === "string" && role.trim().toLowerCase() === "admin") {
    return true;
  }
  return false;
}

/**
 * Reads any saved session from localStorage
 */
export function getStoredSessionUser() {
  const keys = ["casa_current_user", "currentUser", "user", "loggedUser", "casa_user"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.email || parsed.userEmail)) {
          return parsed;
        }
      }
    } catch {
      // ignore json parse error
    }
  }
  return null;
}

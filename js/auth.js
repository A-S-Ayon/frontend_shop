/**
 * auth.js — Shared Authentication Helpers
 * =========================================
 * Include this file on every page that needs to check login state.
 * It provides:
 *   - Token storage helpers (get/set/clear)
 *   - Page-guard functions (requireAuth, requireAdmin)
 *   - Current user loader
 *   - Logout helper
 *
 * Depends on: api.js (must be loaded before this file)
 */

// ─── Token Storage ───────────────────────────────────────────

/**
 * Returns the stored JWT token, or null if not logged in.
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Stores a JWT token in localStorage after login/verify.
 */
function setToken(token) {
  localStorage.setItem('token', token);
}

/**
 * Removes the stored JWT token (used during logout).
 */
function clearToken() {
  localStorage.removeItem('token');
}

/**
 * Returns true if the user is currently logged in.
 */
function isLoggedIn() {
  return Boolean(getToken());
}

// ─── Page Guards ─────────────────────────────────────────────

/**
 * Call this at the top of any page that requires authentication.
 * If the user is not logged in, they're redirected to login.html.
 *
 * Usage: requireAuth(); // at the top of your page JS
 */
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Call this at the top of any admin-only page.
 * Fetches /auth/me and checks that role_id === 1.
 * If the user is not an admin, redirects to index.html.
 *
 * Usage: await requireAdmin();
 * @returns {object|null} the user object if admin, null otherwise
 */
async function requireAdmin() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return null;
  }
  const { data, error } = await authMe();
  if (error || !data || data.role_id !== 3) {
    alert('Access denied. Admins only.');
    window.location.href = 'index.html';
    return null;
  }
  return data;
}

// ─── Current User ─────────────────────────────────────────────

/**
 * Fetches the current user's info from /auth/me.
 * Stores the result in window.currentUser so other code can access it.
 * Returns null if not logged in or on error.
 *
 * @returns {{ user_id: string, role_id: number }|null}
 */
/**
 * Decodes the JWT payload (the middle part, base64-encoded) without
 * verifying the signature. Safe to use on the client for reading fields
 * like name, email, sub, role_id that the backend embedded at login.
 * @returns {object} the decoded payload, or {} on error
 */
function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return {}; }
}

async function loadCurrentUser() {
  const token = getToken();
  if (!token) { window.currentUser = null; return null; }

  // Decode JWT to get user_id immediately (no network needed)
  const jwtPayload = decodeJwtPayload(token);

  // Get /auth/me first to confirm token is still valid
  const { data: meData } = await authMe();
  if (!meData && !jwtPayload?.sub) { window.currentUser = null; return null; }

  // The user's real ID (UUID)
  const userId = meData?.user_id || jwtPayload?.sub || jwtPayload?.user_id;

  // Try every likely profile endpoint in parallel to get the real name
  const [profileMe, profileById] = await Promise.all([
    getUserProfile(),                          // GET /users/me
    userId ? getUserById(userId) : { data: null }, // GET /users/{id}
  ]);

  // Pick whichever profile response has a name
  const profileData = [profileMe.data, profileById.data]
    .filter(Boolean)
    .find(d => d.name || d.username || d.full_name)
    || profileMe.data
    || profileById.data
    || {};

  // Merge — later keys win. Priority: profile endpoint > /auth/me > JWT
  window.currentUser = {
    ...jwtPayload,
    ...(meData    || {}),
    ...profileData,
  };
  return window.currentUser;
}


// ─── Logout ──────────────────────────────────────────────────

/**
 * Clears the stored token and redirects to login.html.
 */
function logout() {
  clearToken();
  window.currentUser = null;
  window.location.href = 'login.html';
}

// ─── Role Helpers ─────────────────────────────────────────────

/**
 * Returns true if the currently logged-in user is an admin (role_id === 1).
 * Requires loadCurrentUser() to have been called first.
 */
function isAdmin() {
  return window.currentUser?.role_id === 3;
}

/**
 * Returns true if the currently logged-in user is a customer (role_id === 2).
 */
function isCustomer() {
  return window.currentUser?.role_id === 2;
}

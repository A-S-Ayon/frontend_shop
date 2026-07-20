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
async function loadCurrentUser() {
  if (!getToken()) {
    window.currentUser = null;
    return null;
  }
  const { data } = await authMe();
  window.currentUser = data || null;
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

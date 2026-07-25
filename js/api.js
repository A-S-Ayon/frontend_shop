/**
 * api.js — Centralized API Layer
 * ================================
 * Every single backend call lives here as its own function.
 * Each function returns an object: { data, error }
 *   - data  → the parsed JSON response (or null on failure)
 *   - error → an error message string (or null on success)
 *
 * Usage example:
 *   const { data, error } = await authLogin('user@email.com', 'pass');
 *   if (error) showError(error);
 *   else storeToken(data.access_token);
 */

// ─── Configuration ───────────────────────────────────────────
// Change this to your Render URL when you're ready to deploy.
const BASE_URL = 'https://e-commerce-management-lhdp.onrender.com';

// ─── Internal Helper ─────────────────────────────────────────
/**
 * apiFetch — the single fetch wrapper used by every API function.
 *
 * @param {string} method   - HTTP method: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
 * @param {string} path     - URL path like '/auth/login'
 * @param {object} [body]   - Request body (will be JSON-serialised)
 * @param {boolean} [auth]  - If true, reads JWT from localStorage and adds Authorization header
 * @returns {{ data: any, error: string|null }}
 */
async function apiFetch(method, path, body = null, auth = false) {
  try {
    const headers = { 'Content-Type': 'application/json' };

    // Attach the Bearer token if this endpoint requires auth
    if (auth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const options = { method, headers };
    if (body !== null) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);

    // 204 No Content — success with no body
    if (response.status === 204) {
      return { data: null, error: null };
    }

    // Try to parse the response as JSON
    let json;
    try {
      json = await response.json();
    } catch {
      // Response wasn't JSON (e.g. a 500 plain-text error)
      return { data: null, error: `Server error (${response.status})` };
    }

    // If the HTTP status is an error, extract the error message.
    // FastAPI typically returns { detail: "..." } for errors.
    if (!response.ok) {
      // On 401 Unauthorized, wipe the stored token and redirect to login
      if (response.status === 401) {
        localStorage.removeItem('token');
        // Only redirect if we're not already on an auth page
        if (!window.location.pathname.includes('login') &&
            !window.location.pathname.includes('signup') &&
            !window.location.pathname.includes('verify') &&
            !window.location.pathname.includes('forgot') &&
            !window.location.pathname.includes('reset')) {
          window.location.href = 'login.html';
        }
      }

      // Extract a human-readable error string from FastAPI's response
      const detail = json?.detail;
      if (typeof detail === 'string') return { data: null, error: detail };
      if (Array.isArray(detail)) {
        // Pydantic validation errors come as an array
        const msg = detail.map(d => d.msg || JSON.stringify(d)).join('; ');
        return { data: null, error: msg };
      }
      return { data: null, error: `Request failed (${response.status})` };
    }

    return { data: json, error: null };

  } catch (err) {
    // Network error (offline, CORS, bad URL, etc.)
    console.error('API fetch error:', err);
    return { data: null, error: 'Network error — is the server running?' };
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH  (/auth/...)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /auth/signup
 * Registers a new user. Does NOT return a token.
 * A 6-digit verification code is sent to the user's email.
 * @returns {{ data: { message: string }, error }}
 */
async function authSignup(name, email, password) {
  return apiFetch('POST', '/auth/signup', { name, email, password });
}

/**
 * POST /auth/verify-email
 * Verifies email with the code sent after signup.
 * Returns an access token on success.
 * @returns {{ data: { access_token: string, token_type: string }, error }}
 */
async function authVerifyEmail(email, code) {
  return apiFetch('POST', '/auth/verify-email', { email, code });
}

/**
 * POST /auth/resend-code
 * Re-sends the 6-digit verification code to the given email.
 * @returns {{ data: { message: string }, error }}
 */
async function authResendCode(email) {
  return apiFetch('POST', '/auth/resend-code', { email });
}

/**
 * POST /auth/login
 * Logs in with email + password. Returns an access token.
 * Returns 403 if the user hasn't verified their email yet.
 * @returns {{ data: { access_token: string, token_type: string }, error }}
 */
async function authLogin(email, password) {
  return apiFetch('POST', '/auth/login', { email, password });
}

/**
 * GET /auth/me
 * Returns the currently logged-in user's info from the JWT.
 * @returns {{ data: { user_id: string, role_id: number }, error }}
 */
async function authMe() {
  return apiFetch('GET', '/auth/me', null, true);
}

/**
 * GET /users/me
 * Returns the full profile of the current user including name, email, etc.
 * @returns {{ data: { id, name, username, email, role_id }, error }}
 */
async function getUserProfile() {
  return apiFetch('GET', '/users/me', null, true);
}

/**
 * POST /auth/forgot-password
 * Sends a password-reset link to the given email.
 * @returns {{ data: { message: string }, error }}
 */
async function authForgotPassword(email) {
  return apiFetch('POST', '/auth/forgot-password', { email });
}

/**
 * POST /auth/reset-password
 * Resets the password using the token from the reset email.
 * @returns {{ data: { message: string }, error }}
 */
async function authResetPassword(token, new_password) {
  return apiFetch('POST', '/auth/reset-password', { token, new_password });
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS  (/products, /categories)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /categories
 * Public. Returns all product categories.
 * @returns {{ data: Array<{ id: number, name: string }>, error }}
 */
async function getCategories() {
  return apiFetch('GET', '/categories');
}

/**
 * GET /products?category_id=...
 * Public. Returns a list of products, optionally filtered by category.
 * @param {number|null} categoryId - Pass null to get all products
 * @returns {{ data: Array<Product>, error }}
 */
async function getProducts(categoryId = null) {
  const query = categoryId ? `?category_id=${categoryId}` : '';
  return apiFetch('GET', `/products${query}`);
}

/**
 * GET /products/{id}
 * Public. Returns a single product by ID.
 * @returns {{ data: Product, error }}
 */
async function getProduct(id) {
  return apiFetch('GET', `/products/${id}`);
}

/**
 * POST /products
 * Admin only. Creates a new product.
 * @param {{ category_id, name, description, price, image_url }} productData
 * @returns {{ data: Product, error }}
 */
async function createProduct(productData) {
  return apiFetch('POST', '/products', productData, true);
}

/**
 * PUT /products/{id}
 * Admin only. Updates an existing product.
 * @param {number} id
 * @param {{ category_id, name, description, price, image_url, is_active }} productData
 * @returns {{ data: Product, error }}
 */
async function updateProduct(id, productData) {
  return apiFetch('PUT', `/products/${id}`, productData, true);
}

/**
 * PATCH /products/{id}/stock
 * Admin only. Updates the stock quantity for a product.
 * @param {number} id
 * @param {number} quantity - new stock quantity
 * @returns {{ data: Product, error }}
 */
async function updateProductStock(id, quantity) {
  return apiFetch('PATCH', `/products/${id}/stock`, { quantity }, true);
}

// ═══════════════════════════════════════════════════════════════
// CART  (/cart)  — requires auth (customer)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /cart
 * Returns the current user's cart items.
 * @returns {{ data: Array<CartItem>, error }}
 */
async function getCart() {
  return apiFetch('GET', '/cart', null, true);
}

/**
 * POST /cart/items
 * Adds an item (or updates quantity if already in cart).
 * @returns {{ data: CartItem, error }}
 */
async function addToCart(product_id, quantity) {
  return apiFetch('POST', '/cart/items', { product_id, quantity }, true);
}

/**
 * PUT /cart/items/{product_id}
 * Updates the quantity of a cart item.
 * @returns {{ data: CartItem, error }}
 */
async function updateCartItem(product_id, quantity) {
  return apiFetch('PUT', `/cart/items/${product_id}`, { quantity }, true);
}

/**
 * DELETE /cart/items/{product_id}
 * Removes an item from the cart. Returns 204.
 * @returns {{ data: null, error }}
 */
async function removeFromCart(product_id) {
  return apiFetch('DELETE', `/cart/items/${product_id}`, null, true);
}

// ═══════════════════════════════════════════════════════════════
// WALLET  (/wallet)  — requires auth
// ═══════════════════════════════════════════════════════════════

/**
 * GET /wallet
 * Returns the current user's wallet balance.
 * @returns {{ data: { id, user_id, balance }, error }}
 */
async function getWallet() {
  return apiFetch('GET', '/wallet', null, true);
}

/**
 * GET /wallet/transactions
 * Returns the current user's transaction history.
 * @returns {{ data: Array<{ id, amount, type, created_at }>, error }}
 */
async function getWalletTransactions() {
  return apiFetch('GET', '/wallet/transactions', null, true);
}

/**
 * POST /wallet/credit
 * Admin only. Credits a user's wallet with a given amount.
 * Used for testing / demo purposes.
 * @param {string} user_id
 * @param {number} amount
 * @returns {{ data: object, error }}
 */
async function creditWallet(user_id, amount) {
  return apiFetch('POST', '/wallet/credit', { user_id, amount }, true);
}

// ═══════════════════════════════════════════════════════════════
// ADDRESSES  (/addresses)  — requires auth
// ═══════════════════════════════════════════════════════════════

/**
 * GET /addresses
 * Returns all saved shipping addresses for the current user.
 * @returns {{ data: Array<Address>, error }}
 */
async function getAddresses() {
  return apiFetch('GET', '/addresses', null, true);
}

/**
 * POST /addresses
 * Creates a new shipping address.
 * @param {object} addressData
 * @returns {{ data: Address, error }}
 */
async function createAddress(addressData) {
  return apiFetch('POST', '/addresses', addressData, true);
}

/**
 * DELETE /addresses/{address_id}
 * Deletes a saved address. Returns 204.
 * @returns {{ data: null, error }}
 */
async function deleteAddress(address_id) {
  return apiFetch('DELETE', `/addresses/${address_id}`, null, true);
}

// ═══════════════════════════════════════════════════════════════
// ORDERS  (/orders)  — requires auth
// ═══════════════════════════════════════════════════════════════

/**
 * POST /orders/checkout
 * Places an order. Deducts wallet balance and clears the cart.
 * Fails (400) if cart is empty, stock is insufficient, or wallet balance is too low.
 * @param {number} address_id - the shipping address to use
 * @returns {{ data: Order, error }}
 */
async function checkout(address_id) {
  return apiFetch('POST', '/orders/checkout', { address_id }, true);
}

/**
 * GET /orders
 * Returns the current user's order history (summary, not full details).
 * @returns {{ data: Array<{ id, total_amount, status, created_at }>, error }}
 */
async function getOrders() {
  return apiFetch('GET', '/orders', null, true);
}

/**
 * GET /orders/{order_id}
 * Returns the full order object including items, address, and fulfillment.
 * @returns {{ data: Order, error }}
 */
async function getOrder(order_id) {
  return apiFetch('GET', `/orders/${order_id}`, null, true);
}

/**
 * GET /orders/{order_id}/invoice
 * Returns the invoice PDF as a file download.
 * We build the URL here so the caller can open it in a new tab.
 * The token is passed in the Authorization header via a fetch blob approach.
 * @returns the raw fetch Response (not wrapped in {data,error})
 */
async function fetchOrderInvoice(order_id) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/orders/${order_id}/invoice`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response; // caller checks response.ok and creates a blob URL
}

/**
 * GET /orders/admin/all?status=...
 * Admin only. Returns all orders, optionally filtered by status.
 * @param {string|null} status - e.g. 'Paid', 'Shipped', etc.
 * @returns {{ data: Array<AdminOrder>, error }}
 */
async function getAllOrdersAdmin(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch('GET', `/orders/admin/all${query}`, null, true);
}

/**
 * PATCH /orders/{order_id}/fulfillment
 * Admin only. Advances fulfillment status (must be sequential).
 * Allowed values: "Shipped" | "Out for Delivery" | "Delivered"
 * Returns 400 with an error message if the transition is invalid.
 * @returns {{ data: { id, fulfillment_status, fulfillment_updated_at }, error }}
 */
async function updateFulfillmentStatus(order_id, status) {
  return apiFetch('PATCH', `/orders/${order_id}/fulfillment`, { status }, true);
}

/**
 * POST /orders/{order_id}/confirm-receipt
 * Customer only. Confirms that the delivered order was received.
 * Only works when fulfillment_status === "Delivered".
 * @returns {{ data: { id, received_confirmed_at }, error }}
 */
async function confirmReceipt(order_id) {
  return apiFetch('POST', `/orders/${order_id}/confirm-receipt`, null, true);
}

/**
 * GET /orders/{order_id}/status-history
 * Returns the full timeline of fulfillment status changes.
 * @returns {{ data: Array<{ status, changed_at, changed_by_name }>, error }}
 */
async function getOrderStatusHistory(order_id) {
  return apiFetch('GET', `/orders/${order_id}/status-history`, null, true);
}

// ═══════════════════════════════════════════════════════════════
// REVIEWS  (/reviews)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /reviews
 * Submits a product review. User must have purchased the product.
 * Fails (400) if already reviewed or not a buyer.
 * @param {{ product_id, rating, comment }} reviewData
 * @returns {{ data: object, error }}
 */
async function postReview(product_id, rating, comment) {
  return apiFetch('POST', '/reviews', { product_id, rating, comment }, true);
}

/**
 * GET /reviews/product/{product_id}
 * Public. Returns all reviews for a specific product.
 * @returns {{ data: Array<Review>, error }}
 */
async function getProductReviews(product_id) {
  return apiFetch('GET', `/reviews/product/${product_id}`);
}

/**
 * GET /reviews/product/{product_id}/summary
 * Public. Returns the review count and average rating.
 * @returns {{ data: { review_count, avg_rating }, error }}
 */
async function getProductReviewSummary(product_id) {
  return apiFetch('GET', `/reviews/product/${product_id}/summary`);
}

// ═══════════════════════════════════════════════════════════════
// WISHLIST  (/wishlist)  — requires auth
// ═══════════════════════════════════════════════════════════════

/**
 * GET /wishlist
 * Returns the current user's wishlist.
 * @returns {{ data: Array<WishlistItem>, error }}
 */
async function getWishlist() {
  return apiFetch('GET', '/wishlist', null, true);
}

/**
 * POST /wishlist
 * Adds a product to the wishlist.
 * Returns { message: "Already in wishlist" } if already there (still 201).
 * @returns {{ data: object, error }}
 */
async function addToWishlist(product_id) {
  return apiFetch('POST', '/wishlist', { product_id }, true);
}

/**
 * DELETE /wishlist/{product_id}
 * Removes a product from the wishlist. Returns 204.
 * @returns {{ data: null, error }}
 */
async function removeFromWishlist(product_id) {
  return apiFetch('DELETE', `/wishlist/${product_id}`, null, true);
}

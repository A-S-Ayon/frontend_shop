/**
 * nav.js — Shared Navigation Bar
 * =================================
 * Renders and injects the navigation bar into every page.
 * Call renderNav() after the DOM is ready (it's called automatically below).
 *
 * The nav bar shows:
 *  - Logo → index.html
 *  - Main links: Products, Cart, Orders, Wishlist, Wallet
 *  - If admin: an "Admin" link
 *  - If logged in: a user dropdown with logout
 *  - If NOT logged in: Login + Sign Up buttons
 *
 * Depends on: auth.js, api.js
 */

/**
 * Highlights the nav link that matches the current page.
 * @param {string} currentPage - e.g. 'index.html', 'cart.html'
 */
function getActiveClass(currentPage) {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  return page === currentPage ? 'active' : '';
}

/**
 * Renders the full navigation bar HTML and injects it into #nav-root.
 * Automatically called on DOMContentLoaded.
 */
async function renderNav() {
  const navRoot = document.getElementById('nav-root');
  if (!navRoot) return;

  // Load the current user (non-blocking — nav renders even if this fails)
  const user = await loadCurrentUser();
  const loggedIn = Boolean(user);
  const admin = user?.role_id === 3;

  const mainLinks = `
    <a href="index.html"    class="navbar__link ${getActiveClass('index.html')}">🛍️ Shop</a>
    ${loggedIn ? `<a href="cart.html"     class="navbar__link ${getActiveClass('cart.html')}">🛒 Cart <span class="nav-cart-count" id="nav-cart-count">0</span></a>` : ''}
    ${loggedIn ? `<a href="orders.html"   class="navbar__link ${getActiveClass('orders.html')}">📦 Orders</a>` : ''}
    ${loggedIn ? `<a href="wishlist.html" class="navbar__link ${getActiveClass('wishlist.html')}">❤️ Wishlist</a>` : ''}
    ${loggedIn ? `<a href="wallet.html"   class="navbar__link ${getActiveClass('wallet.html')}">💰 Wallet</a>` : ''}
    ${admin    ? `<a href="admin.html"    class="navbar__link ${getActiveClass('admin.html')}">⚙️ Admin</a>` : ''}
  `;

  const actionsHTML = loggedIn
    ? `<div class="nav-dropdown" id="user-dropdown">
         <button class="nav-dropdown__toggle" onclick="document.getElementById('user-dropdown').classList.toggle('open')">
           👤 Account ▾
         </button>
         <div class="nav-dropdown__menu">
           <a href="wallet.html"  class="nav-dropdown__item">💰 Wallet</a>
           <a href="orders.html"  class="nav-dropdown__item">📦 My Orders</a>
           <a href="wishlist.html"class="nav-dropdown__item">❤️ Wishlist</a>
           <hr style="margin:4px 0;border-color:var(--border)">
           <button class="nav-dropdown__item nav-dropdown__item--danger" onclick="logout()">🚪 Logout</button>
         </div>
       </div>`
    : `<a href="login.html"  class="btn btn--ghost btn--sm">Log In</a>
       <a href="signup.html" class="btn btn--primary btn--sm">Sign Up</a>`;

  navRoot.innerHTML = `
    <nav class="navbar">
      <div class="navbar__inner">
        <a href="index.html" class="navbar__logo">Shopify</a>
        
        <div class="navbar__links" id="navbar-links">
          ${mainLinks}
        </div>

        <div class="navbar__actions">
          ${actionsHTML}
          <button class="navbar__hamburger" onclick="toggleMobileMenu()" aria-label="Open menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      <!-- Mobile menu (shown on small screens) -->
      <div id="mobile-menu" style="display:none; padding: 12px 20px; border-top: 1px solid var(--border); flex-direction: column; gap:8px;">
        ${mainLinks.replace(/class="navbar__link/g, 'class="navbar__link" style="justify-content:flex-start')}
        <hr style="border-color:var(--border)">
        ${loggedIn
          ? `<button class="btn btn--danger btn--sm" onclick="logout()">🚪 Logout</button>`
          : `<a href="login.html" class="btn btn--ghost btn--sm">Log In</a>
             <a href="signup.html" class="btn btn--primary btn--sm">Sign Up</a>`
        }
      </div>
    </nav>
  `;

  // If logged in, load and display cart item count
  if (loggedIn) {
    updateNavCartCount();
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

/** Toggles the mobile nav menu */
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;
  if (menu.style.display === 'none') {
    menu.style.display = 'flex';
  } else {
    menu.style.display = 'none';
  }
}

/**
 * Fetches the cart and updates the cart badge count in the nav.
 * Called after nav renders (if logged in).
 */
async function updateNavCartCount() {
  const badge = document.getElementById('nav-cart-count');
  if (!badge) return;
  const { data } = await getCart();
  if (data && Array.isArray(data)) {
    const total = data.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = total > 99 ? '99+' : total;
    badge.style.display = total === 0 ? 'none' : 'inline-flex';
  }
}

// ─── Auto-render when DOM is ready ───────────────────────────
document.addEventListener('DOMContentLoaded', renderNav);

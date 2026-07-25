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
    <a href="index.html"    class="navbar__link ${getActiveClass('index.html')}">Shop</a>
    ${loggedIn ? `<a href="cart.html"     class="navbar__link ${getActiveClass('cart.html')}">Cart <span class="nav-cart-count" id="nav-cart-count">0</span></a>` : ''}
    ${loggedIn ? `<a href="orders.html"   class="navbar__link ${getActiveClass('orders.html')}">Orders</a>` : ''}
    ${loggedIn ? `<a href="wishlist.html" class="navbar__link ${getActiveClass('wishlist.html')}">Wishlist</a>` : ''}
    ${loggedIn ? `<a href="wallet.html"   class="navbar__link ${getActiveClass('wallet.html')}">Wallet</a>` : ''}
    ${admin    ? `<a href="admin.html"    class="navbar__link ${getActiveClass('admin.html')}">Admin</a>` : ''}
  `;

  // Check every field name the backend might use for the username
  const userName = user?.username
                || user?.name
                || user?.full_name
                || user?.display_name
                || user?.sub        // JWT 'sub' field sometimes holds username
                || user?.email?.split('@')[0]
                || 'User';
  const userId   = user?.id || user?.user_id || user?.sub || '';
  const initials = userName.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const shortId  = userId ? (String(userId).length > 8 ? String(userId).slice(0, 8) + '…' : userId) : '—';

  const actionsHTML = loggedIn
    ? `<div class="nav-dropdown" id="user-dropdown">
         <button class="nav-dropdown__toggle" onclick="document.getElementById('user-dropdown').classList.toggle('open')">
           <span class="nav-avatar">${initials}</span>
           <span class="nav-username">${userName}</span>
           <span style="font-size:0.7rem;opacity:0.7;">▾</span>
         </button>
         <div class="nav-dropdown__menu">
           <div class="nav-profile-card">
             <div class="nav-profile-card__avatar">${initials}</div>
             <div class="nav-profile-card__info">
               <div class="nav-profile-card__name">${userName}</div>
               <div class="nav-profile-card__id">ID: ${shortId}</div>
             </div>
           </div>
           <hr style="margin:4px 0;border-color:var(--border)">
           <a href="wallet.html"   class="nav-dropdown__item">Wallet</a>
           <a href="orders.html"   class="nav-dropdown__item">My Orders</a>
           <a href="wishlist.html" class="nav-dropdown__item">Wishlist</a>
           <hr style="margin:4px 0;border-color:var(--border)">
           <button class="nav-dropdown__item nav-dropdown__item--danger" onclick="logout()">Logout</button>
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
          <!-- Day / Night toggle -->
          <button class="theme-toggle" id="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle dark/light mode" title="Toggle dark/light mode">
            <svg id="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
            </svg>
            <svg id="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style="display:none">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
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
          ? `<button class="btn btn--danger btn--sm" onclick="logout()">Logout</button>`
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

/**
 * Injects the floating customer support button into the page.
 * Clicking it opens the Telegram support bot in a new tab.
 */
function renderSupportButton() {
  // Avoid duplicate if somehow called twice
  if (document.getElementById('support-fab')) return;

  const fab = document.createElement('a');
  fab.id        = 'support-fab';
  fab.href      = 'https://web.telegram.org/k/#@as_ayon_bot';
  fab.target    = '_blank';
  fab.rel       = 'noopener noreferrer';
  fab.title     = 'Customer Support — Chat with us on Telegram';
  fab.setAttribute('aria-label', 'Customer Support');
  fab.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.26l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.299z"/>
    </svg>
    <span class="support-fab__tooltip">Customer Support</span>
  `;
  document.body.appendChild(fab);
}

// ─── Auto-render when DOM is ready ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();   // apply saved theme ASAP (before nav renders)
  renderNav().then(() => syncThemeIcon()); // sync icon after nav HTML is in DOM
  renderSupportButton();
});

// ═══════════════════════════════════════════════════════════════
// THEME  — Day / Night toggle
// ═══════════════════════════════════════════════════════════════

/** Apply the saved theme from localStorage immediately (no flash). */
function initTheme() {
  const saved = localStorage.getItem('shopify_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
}

/** Sync the sun/moon SVG icon to match the current theme. */
function syncThemeIcon() {
  const isLight = document.body.classList.contains('light-mode');
  const moon = document.getElementById('theme-icon-moon');
  const sun  = document.getElementById('theme-icon-sun');
  if (moon) moon.style.display = isLight ? 'none'  : 'block';
  if (sun)  sun.style.display  = isLight ? 'block' : 'none';
}

/** Toggle between dark and light mode, persist choice. */
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('shopify_theme', isLight ? 'light' : 'dark');
  syncThemeIcon();
}

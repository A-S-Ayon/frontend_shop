/**
 * index.js — Home / Product Catalog Page
 * ========================================
 * - Loads categories into the filter dropdown
 * - Loads all products (or filtered by category)
 * - Renders product cards with add-to-cart and wishlist buttons
 * - Handles client-side search filtering
 *
 * Depends on: api.js, auth.js
 */

// ─── State ───────────────────────────────────────────────────
let allProducts = []; // all products fetched from the server (for client search)

// ─── Utility Helpers ─────────────────────────────────────────

/** Returns a placeholder image div if product has no image. */
function productImageHTML(product) {
  if (product.image_url) {
    return `<img src="${escHtml(product.image_url)}" alt="${escHtml(product.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'product-card__img-placeholder\\'>🛍️</div>'" />`;
  }
  return `<div class="product-card__img-placeholder">🛍️</div>`;
}

/** Escapes HTML special chars to prevent XSS. */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Returns a stock label with appropriate CSS class. */
function stockLabel(stock) {
  if (stock === 0) return `<span class="product-card__stock out">Out of stock</span>`;
  if (stock <= 5)  return `<span class="product-card__stock low">Only ${stock} left</span>`;
  return `<span class="product-card__stock">${stock} in stock</span>`;
}

// ─── Render ───────────────────────────────────────────────────

/**
 * Renders product cards into #product-grid.
 * @param {Array} products
 */
function renderProducts(products) {
  const grid    = document.getElementById('product-grid');
  const empty   = document.getElementById('products-empty');
  const loading = document.getElementById('products-loading');

  loading.style.display = 'none';

  if (!products || products.length === 0) {
    empty.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');

  grid.innerHTML = products.map(p => `
    <div class="product-card animate-fade-in-up" data-id="${p.id}">
      <a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit;">
        <div class="product-card__img">
          ${productImageHTML(p)}
        </div>
      </a>
      <div class="product-card__body">
        <div class="product-card__category">${escHtml(p.category_name || '')}</div>
        <a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit;">
          <div class="product-card__name">${escHtml(p.name)}</div>
        </a>
        <div class="product-card__price">$${Number(p.price).toFixed(2)}</div>
        ${stockLabel(p.stock)}
        <div class="product-card__actions">
          <button
            class="btn btn--primary"
            style="flex:1;"
            onclick="handleAddToCart(${p.id}, '${escHtml(p.name)}')"
            ${p.stock === 0 ? 'disabled' : ''}
          >
            🛒 Add to Cart
          </button>
          <button
            class="btn-wish"
            onclick="handleAddToWishlist(${p.id})"
            title="Add to Wishlist"
            id="wish-btn-${p.id}"
          >
            ♡
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Category Filter ──────────────────────────────────────────

/** Loads categories and populates the dropdown. */
async function loadCategories() {
  const { data, error } = await getCategories();
  if (error || !data) return;

  const select = document.getElementById('category-filter');
  data.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

/** Called when the category dropdown or search changes. */
async function applyFilter() {
  const categoryId = document.getElementById('category-filter').value || null;
  const search     = document.getElementById('search-input').value.toLowerCase().trim();

  // If category changed, re-fetch from server
  document.getElementById('products-loading').style.display = 'block';
  document.getElementById('product-grid').innerHTML = '';
  document.getElementById('products-empty').classList.add('hidden');
  document.getElementById('products-error').classList.add('hidden');

  const { data, error } = await getProducts(categoryId ? parseInt(categoryId) : null);

  if (error) {
    document.getElementById('products-loading').style.display = 'none';
    document.getElementById('products-error').classList.remove('hidden');
    document.getElementById('products-error-msg').textContent = error;
    return;
  }

  // Store for client-side search
  allProducts = data || [];

  // Filter by search term on the client (avoids extra API calls)
  const filtered = search
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.description || '').toLowerCase().includes(search)
      )
    : allProducts;

  renderProducts(filtered);
}

/** Clears all filters and reloads. */
function resetFilter() {
  document.getElementById('category-filter').value = '';
  document.getElementById('search-input').value = '';
  applyFilter();
}

// ─── Cart Action ──────────────────────────────────────────────

async function handleAddToCart(productId, productName) {
  // Must be logged in to add to cart
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const { error } = await addToCart(productId, 1);
  if (error) {
    alert(`Could not add to cart: ${error}`);
  } else {
    // Brief visual feedback
    showToast(`"${productName}" added to cart! 🛒`);
    updateNavCartCount(); // Refresh the nav cart badge
  }
}

// ─── Wishlist Action ──────────────────────────────────────────

async function handleAddToWishlist(productId) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const btn = document.getElementById(`wish-btn-${productId}`);
  if (btn) btn.innerHTML = '…';

  const { data, error } = await addToWishlist(productId);

  if (error) {
    alert(`Could not add to wishlist: ${error}`);
    if (btn) btn.innerHTML = '♡';
  } else {
    if (btn) {
      btn.innerHTML = '♥';
      btn.classList.add('active');
    }
    showToast('Added to wishlist! ❤️');
  }
}

// ─── Toast Notification ───────────────────────────────────────

/**
 * Shows a small toast notification at the bottom of the screen.
 * @param {string} message
 */
function showToast(message) {
  // Remove existing toast if any
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '12px 24px',
    borderRadius: 'var(--radius-full)',
    boxShadow: 'var(--shadow-lg)',
    fontSize: '0.9rem',
    fontWeight: '500',
    zIndex: '9999',
    animation: 'fadeInUp 0.3s ease',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(toast);
  // Auto-remove after 2.5 seconds
  setTimeout(() => toast.remove(), 2500);
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Load categories and initial product list in parallel
  await Promise.all([loadCategories(), applyFilter()]);

  // Category dropdown change handler
  document.getElementById('category-filter').addEventListener('change', applyFilter);

  // Search box: filter with a small delay after typing (debounce)
  let searchTimer;
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      // Filter client-side — no new API call needed
      const search = document.getElementById('search-input').value.toLowerCase().trim();
      const filtered = search
        ? allProducts.filter(p =>
            p.name.toLowerCase().includes(search) ||
            (p.description || '').toLowerCase().includes(search)
          )
        : allProducts;
      renderProducts(filtered);
    }, 300); // 300ms debounce
  });
});

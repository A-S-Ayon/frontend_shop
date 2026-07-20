/**
 * wishlist.js — Wishlist Page
 * =============================
 * Requires auth. Loads saved wishlist items, renders them as product cards,
 * and handles remove + move-to-cart actions.
 *
 * Depends on: api.js, auth.js
 */

let wishlistItems = [];

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showWishlistAlert(message, type = 'error') {
  const box = document.getElementById('wishlist-alert');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type]}</span><span>${message}</span>`;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 3000);
}

// ─── Render ───────────────────────────────────────────────────

function renderWishlist() {
  document.getElementById('wishlist-loading').style.display = 'none';
  const grid  = document.getElementById('wishlist-grid');
  const empty = document.getElementById('wishlist-empty');

  if (!wishlistItems || wishlistItems.length === 0) {
    empty.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = wishlistItems.map(item => `
    <div class="product-card animate-fade-in-up" id="wish-card-${item.product_id}">
      <a href="product.html?id=${item.product_id}" style="text-decoration:none;color:inherit;">
        <div class="product-card__img">
          ${item.image_url
            ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'product-card__img-placeholder\\'>🛍️</div>'" />`
            : `<div class="product-card__img-placeholder">🛍️</div>`
          }
        </div>
      </a>
      <div class="product-card__body">
        <a href="product.html?id=${item.product_id}" style="text-decoration:none;color:inherit;">
          <div class="product-card__name">${escHtml(item.name)}</div>
        </a>
        <div class="product-card__price">$${Number(item.price).toFixed(2)}</div>
        <div class="product-card__stock ${item.stock === 0 ? 'out' : item.stock <= 5 ? 'low' : ''}">
          ${item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
        </div>
        <div class="product-card__actions">
          <!-- Move to cart button -->
          <button
            class="btn btn--primary"
            style="flex:1;"
            onclick="handleMoveToCart(${item.product_id}, '${escHtml(item.name)}')"
            ${item.stock === 0 ? 'disabled' : ''}
            title="${item.stock === 0 ? 'Out of stock' : 'Add to cart'}"
          >
            🛒 Add to Cart
          </button>
          <!-- Remove from wishlist -->
          <button
            class="btn-wish active"
            onclick="handleRemoveFromWishlist(${item.product_id})"
            title="Remove from wishlist"
          >♥</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Adds the item to the cart (without removing from wishlist).
 * User can explicitly remove it from wishlist if they want.
 */
async function handleMoveToCart(productId, productName) {
  const { error } = await addToCart(productId, 1);
  if (error) {
    showWishlistAlert(`Could not add to cart: ${error}`);
  } else {
    showWishlistAlert(`"${productName}" added to cart! 🛒`, 'success');
    updateNavCartCount();
  }
}

/**
 * Removes an item from the wishlist and re-renders.
 */
async function handleRemoveFromWishlist(productId) {
  const { error } = await removeFromWishlist(productId);
  if (error) {
    showWishlistAlert(`Could not remove item: ${error}`);
    return;
  }
  // Remove from local state
  wishlistItems = wishlistItems.filter(i => i.product_id !== productId);
  renderWishlist();
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const { data, error } = await getWishlist();

  if (error) {
    document.getElementById('wishlist-loading').style.display = 'none';
    document.getElementById('wishlist-error').classList.remove('hidden');
    document.getElementById('wishlist-error-msg').textContent = error;
    return;
  }

  wishlistItems = data || [];
  renderWishlist();
});

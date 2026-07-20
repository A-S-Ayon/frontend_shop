/**
 * cart.js — Cart Page Logic
 * ==========================
 * Requires auth. Loads the cart, renders items with quantity controls,
 * handles quantity updates and item removal, updates the order summary.
 *
 * Depends on: api.js, auth.js
 */

// ─── State ───────────────────────────────────────────────────
let cartItems = []; // local copy of the cart

// ─── Helpers ─────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showError(msg) {
  document.getElementById('cart-loading').style.display = 'none';
  document.getElementById('cart-error').classList.remove('hidden');
  document.getElementById('cart-error-msg').textContent = msg;
}

// ─── Render ───────────────────────────────────────────────────

/**
 * Re-renders the cart items list and order summary from the cartItems array.
 * Called after any update (add, remove, qty change).
 */
function renderCart() {
  const loading  = document.getElementById('cart-loading');
  const empty    = document.getElementById('cart-empty');
  const content  = document.getElementById('cart-content');
  const itemList = document.getElementById('cart-items-list');
  const summary  = document.getElementById('order-summary-body');

  loading.style.display = 'none';

  if (!cartItems || cartItems.length === 0) {
    empty.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  content.classList.remove('hidden');

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);

  // Render each cart item row
  itemList.innerHTML = cartItems.map(item => `
    <div class="cart-item" id="cart-item-${item.product_id}">
      <!-- Product image / icon -->
      <div class="cart-item__img" style="background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">
        🛍️
      </div>

      <!-- Product info -->
      <div class="cart-item__info">
        <div class="cart-item__name">
          <a href="product.html?id=${item.product_id}" style="color:var(--text-primary);">
            ${escHtml(item.name)}
          </a>
        </div>
        <div class="cart-item__price">$${Number(item.price).toFixed(2)} each · ${item.stock} in stock</div>
      </div>

      <!-- Quantity control -->
      <div class="cart-item__actions">
        <div class="qty-control">
          <button
            onclick="changeQty(${item.product_id}, ${item.quantity - 1})"
            ${item.quantity <= 1 ? 'disabled' : ''}
          >−</button>
          <input
            type="number"
            value="${item.quantity}"
            min="1"
            max="${item.stock}"
            onchange="changeQty(${item.product_id}, parseInt(this.value))"
            id="qty-input-${item.product_id}"
          />
          <button
            onclick="changeQty(${item.product_id}, ${item.quantity + 1})"
            ${item.quantity >= item.stock ? 'disabled' : ''}
          >+</button>
        </div>

        <!-- Line total -->
        <div class="cart-item__total" id="line-total-${item.product_id}">
          $${Number(item.line_total).toFixed(2)}
        </div>

        <!-- Remove button -->
        <button
          class="btn btn--danger btn--sm btn--icon"
          onclick="handleRemoveItem(${item.product_id})"
          title="Remove item"
        >🗑️</button>
      </div>
    </div>
  `).join('');

  // Render order summary
  summary.innerHTML = `
    <div class="order-summary__row">
      <span>${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    <div class="order-summary__row">
      <span>Shipping</span>
      <span class="text-success">Free</span>
    </div>
    <div class="order-summary__row">
      <span>Total</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
  `;
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Changes the quantity of a cart item.
 * If qty <= 0, removes the item instead.
 */
async function changeQty(productId, newQty) {
  // Find the item to check stock limits
  const item = cartItems.find(i => i.product_id === productId);
  if (!item) return;

  if (newQty <= 0) {
    await handleRemoveItem(productId);
    return;
  }
  if (newQty > item.stock) {
    alert(`Only ${item.stock} in stock.`);
    // Reset the input to the current quantity
    const input = document.getElementById(`qty-input-${productId}`);
    if (input) input.value = item.quantity;
    return;
  }

  // Optimistically update local state for instant UI response
  item.quantity = newQty;
  item.line_total = item.price * newQty;
  renderCart();

  // Sync with server
  const { error } = await updateCartItem(productId, newQty);
  if (error) {
    alert(`Failed to update quantity: ${error}`);
    // Reload to get the real state
    loadCart();
  } else {
    updateNavCartCount();
  }
}

/**
 * Removes a single item from the cart.
 */
async function handleRemoveItem(productId) {
  const { error } = await removeFromCart(productId);
  if (error) {
    alert(`Failed to remove item: ${error}`);
    return;
  }
  // Remove from local state and re-render
  cartItems = cartItems.filter(i => i.product_id !== productId);
  renderCart();
  updateNavCartCount();
}

/**
 * Removes all items from the cart one by one.
 * (No bulk-clear endpoint, so we loop.)
 */
async function handleClearCart() {
  if (!confirm('Remove all items from your cart?')) return;
  for (const item of [...cartItems]) {
    await removeFromCart(item.product_id);
  }
  cartItems = [];
  renderCart();
  updateNavCartCount();
}

// ─── Load ────────────────────────────────────────────────────

async function loadCart() {
  document.getElementById('cart-loading').style.display = 'block';
  document.getElementById('cart-content').classList.add('hidden');
  document.getElementById('cart-empty').classList.add('hidden');
  document.getElementById('cart-error').classList.add('hidden');

  const { data, error } = await getCart();

  if (error) {
    showError(error);
    return;
  }

  cartItems = data || [];
  renderCart();
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Cart requires auth — redirect to login if not logged in
  if (!requireAuth()) return;
  loadCart();
});

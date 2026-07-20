/**
 * checkout.js — Checkout Page Logic
 * ===================================
 * Requires auth. Loads:
 *   1. Saved addresses (rendered as clickable radio cards)
 *   2. Cart summary with total
 *   3. Wallet balance
 * Handles:
 *   - Add new address form (toggle show/hide)
 *   - Place order button (calls POST /orders/checkout)
 *   - Shows API errors inline (e.g. "Insufficient wallet balance")
 *
 * Depends on: api.js, auth.js
 */

let selectedAddressId = null; // track which address card is selected

// ─── Helpers ─────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showCheckoutAlert(message, type = 'error') {
  const box = document.getElementById('checkout-alert');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type]}</span><span>${message}</span>`;
  box.classList.remove('hidden');
  // Scroll to the alert so the user sees it
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function hideCheckoutAlert() {
  document.getElementById('checkout-alert').classList.add('hidden');
}

function showAddressFormAlert(message, type = 'error') {
  const box = document.getElementById('address-form-alert');
  const icons = { success: '✅', error: '❌' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type]}</span><span>${message}</span>`;
  box.classList.remove('hidden');
}

// ─── Addresses ───────────────────────────────────────────────

/**
 * Renders address cards as radio-style selectable cards.
 * @param {Array} addresses
 */
function renderAddresses(addresses) {
  const list = document.getElementById('address-list');

  if (!addresses || addresses.length === 0) {
    list.innerHTML = `<p class="text-muted">No saved addresses. Add one below.</p>`;
    return;
  }

  list.innerHTML = addresses.map(addr => `
    <div
      class="address-card ${addr.is_default ? 'selected' : ''}"
      id="addr-card-${addr.id}"
      onclick="selectAddress(${addr.id})"
    >
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="address-card__label">
            ${escHtml(addr.label || 'Address')}
            ${addr.is_default ? '<span class="badge badge--accent" style="margin-left:8px;">Default</span>' : ''}
          </div>
          <div class="address-card__detail">
            ${escHtml(addr.recipient_name)} · ${escHtml(addr.phone)}<br />
            ${escHtml(addr.address_line1)}
            ${addr.address_line2 ? ', ' + escHtml(addr.address_line2) : ''}<br />
            ${escHtml(addr.city)}, ${escHtml(addr.state)} ${escHtml(addr.postal_code)}<br />
            ${escHtml(addr.country)}
          </div>
        </div>
        <button
          class="btn btn--danger btn--sm btn--icon"
          onclick="handleDeleteAddress(event, ${addr.id})"
          title="Delete address"
        >🗑️</button>
      </div>
    </div>
  `).join('');

  // Auto-select default address
  const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
  if (defaultAddr) selectAddress(defaultAddr.id);
}

/** Visually selects an address card and records the ID. */
function selectAddress(addressId) {
  // Deselect all
  document.querySelectorAll('.address-card').forEach(el => el.classList.remove('selected'));
  // Select this one
  const card = document.getElementById(`addr-card-${addressId}`);
  if (card) card.classList.add('selected');
  selectedAddressId = addressId;
}

/** Deletes an address from the list. */
async function handleDeleteAddress(event, addressId) {
  event.stopPropagation(); // don't trigger the selectAddress click
  if (!confirm('Delete this address?')) return;

  const { error } = await deleteAddress(addressId);
  if (error) {
    alert(`Could not delete address: ${error}`);
    return;
  }
  // Reload the address list
  loadAddresses();
}

async function loadAddresses() {
  const { data, error } = await getAddresses();
  if (error) {
    document.getElementById('address-list').innerHTML =
      `<div class="alert alert--error"><span>❌</span><span>${error}</span></div>`;
    return;
  }
  renderAddresses(data || []);
}

// ─── Cart Summary ─────────────────────────────────────────────

async function loadCartSummary() {
  const summaryEl = document.getElementById('order-summary-body');
  const { data, error } = await getCart();

  if (error) {
    summaryEl.innerHTML = `<p class="text-muted">Could not load cart.</p>`;
    return;
  }
  if (!data || data.length === 0) {
    // Empty cart — redirect back to cart page
    showCheckoutAlert('Your cart is empty. Add items before checking out.', 'warning');
    document.getElementById('place-order-btn').disabled = true;
    summaryEl.innerHTML = `<p class="text-muted">Cart is empty.</p>`;
    return;
  }

  const subtotal = data.reduce((sum, item) => sum + item.line_total, 0);

  summaryEl.innerHTML = `
    ${data.map(item => `
      <div class="order-summary__row">
        <span>${escHtml(item.name)} × ${item.quantity}</span>
        <span>$${Number(item.line_total).toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="order-summary__row">
      <span>Subtotal</span>
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

// ─── Wallet Balance ───────────────────────────────────────────

async function loadWalletBalance() {
  const { data } = await getWallet();
  const balanceEl = document.getElementById('wallet-balance');
  if (data) {
    balanceEl.textContent = `$${Number(data.balance).toFixed(2)}`;
  } else {
    balanceEl.textContent = 'N/A';
  }
}

// ─── Add Address Form ─────────────────────────────────────────

/** Toggles the "Add new address" form card. */
function toggleAddAddressForm(show) {
  const card = document.getElementById('add-address-form-card');
  if (show === undefined) {
    show = card.classList.contains('hidden');
  }
  if (show) {
    card.classList.remove('hidden');
    document.getElementById('toggle-add-address-btn').textContent = '✕ Cancel';
  } else {
    card.classList.add('hidden');
    document.getElementById('toggle-add-address-btn').textContent = '+ Add New Address';
    document.getElementById('address-form').reset();
    document.getElementById('address-form-alert').classList.add('hidden');
  }
}

async function handleSaveAddress(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('save-address-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner spinner--small"></span> Saving…';

  const addressData = {
    label:          document.getElementById('label').value.trim(),
    recipient_name: document.getElementById('recipient_name').value.trim(),
    phone:          document.getElementById('phone').value.trim(),
    address_line1:  document.getElementById('address_line1').value.trim(),
    address_line2:  document.getElementById('address_line2').value.trim() || null,
    city:           document.getElementById('city').value.trim(),
    state:          document.getElementById('state').value.trim(),
    postal_code:    document.getElementById('postal_code').value.trim(),
    country:        document.getElementById('country').value.trim(),
    is_default:     document.getElementById('is_default').checked,
  };

  const { data, error } = await createAddress(addressData);

  saveBtn.disabled = false;
  saveBtn.innerHTML = 'Save Address';

  if (error) {
    showAddressFormAlert(error);
    return;
  }

  // Success — hide form, reload addresses, and auto-select the new one
  toggleAddAddressForm(false);
  await loadAddresses();
  if (data?.id) selectAddress(data.id);
}

// ─── Place Order ──────────────────────────────────────────────

async function handlePlaceOrder() {
  hideCheckoutAlert();

  if (!selectedAddressId) {
    showCheckoutAlert('Please select a shipping address first.');
    return;
  }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner--small"></span> Placing Order…';

  const { data, error } = await checkout(selectedAddressId);

  btn.disabled = false;
  btn.innerHTML = 'Place Order';

  if (error) {
    // This can include helpful messages like:
    // "Insufficient stock for product X", "Insufficient wallet balance"
    showCheckoutAlert(error);
    return;
  }

  // Order placed! Redirect to the new order's detail page
  showCheckoutAlert('Order placed successfully! 🎉 Redirecting…', 'success');
  setTimeout(() => {
    window.location.href = `order-detail.html?id=${data.id}`;
  }, 1200);
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // Show content, hide loading
  document.getElementById('checkout-loading').style.display = 'none';
  document.getElementById('checkout-content').classList.remove('hidden');

  // Load all data in parallel
  await Promise.all([loadAddresses(), loadCartSummary(), loadWalletBalance()]);

  // Toggle add-address form
  document.getElementById('toggle-add-address-btn').addEventListener('click', () => toggleAddAddressForm());
  document.getElementById('cancel-address-btn').addEventListener('click', () => toggleAddAddressForm(false));

  // Address form submission
  document.getElementById('address-form').addEventListener('submit', handleSaveAddress);
});

/**
 * admin.js — Admin Dashboard
 * ===========================
 * Requires admin role (role_id === 3). Checks role on load.
 *
 * Three tabs:
 *   1. Products — table with Create/Edit/Stock modals
 *   2. Orders   — filterable table, fulfillment advance buttons
 *   3. Wallet   — credit-wallet form
 *
 * Depends on: api.js, auth.js
 */

// ─── State ───────────────────────────────────────────────────
let allCategories = [];
let allProducts   = [];
let editingProductId = null; // null = creating, number = editing

/**
 * localFulfillmentMap stores the fulfillment status we know about for each
 * order. Persisted in localStorage so it survives page refreshes.
 * Format: { "orderId": 'Shipped' | 'Out for Delivery' | 'Delivered' }
 */
const FULFILLMENT_STORAGE_KEY = 'shopify_fulfillment_map';

/** Load the map from localStorage (returns {} if nothing stored yet). */
function loadFulfillmentMap() {
  try {
    return JSON.parse(localStorage.getItem(FULFILLMENT_STORAGE_KEY) || '{}');
  } catch { return {}; }
}

/** Save the current map to localStorage. */
function saveFulfillmentMap(map) {
  try {
    localStorage.setItem(FULFILLMENT_STORAGE_KEY, JSON.stringify(map));
  } catch { /* storage full or private mode — silently ignore */ }
}

/** Record a fulfillment status for an order and persist it. */
function setFulfillmentStatus(orderId, status) {
  const map = loadFulfillmentMap();
  map[String(orderId)] = status;
  saveFulfillmentMap(map);
}

/** Get the best-known fulfillment status for an order. */
function getFulfillmentStatus(orderId, apiValue) {
  const map = loadFulfillmentMap();
  // Prefer whatever is newer: if the API returned a real value, trust it
  // and update our local map to match. Otherwise fall back to local map.
  if (apiValue) {
    map[String(orderId)] = apiValue;
    saveFulfillmentMap(map);
    return apiValue;
  }
  return map[String(orderId)] || null;
}

// ─── Helpers ─────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showTabAlert(alertId, message, type = 'error') {
  const el = document.getElementById(alertId);
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.className = `alert alert--${type}`;
  el.innerHTML = `<span class="alert__icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// ─── Tab Switching ────────────────────────────────────────────

function switchTab(tabName) {
  // Hide all panels and deactivate all buttons
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  // Activate selected panel and button
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');

  // Load data for the tab if needed
  if (tabName === 'products') loadAdminProducts();
  if (tabName === 'orders')   loadAdminOrders();
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════

async function loadAdminProducts() {
  document.getElementById('products-table-loading').style.display = 'block';
  document.getElementById('products-table-wrapper').style.display = 'none';

  const { data, error } = await getProducts();
  document.getElementById('products-table-loading').style.display = 'none';

  if (error) {
    showTabAlert('product-alert', `Failed to load products: ${error}`);
    return;
  }

  allProducts = data || [];
  renderProductsTable(allProducts);
}

function renderProductsTable(products) {
  document.getElementById('products-table-wrapper').style.display = 'block';
  const tbody = document.getElementById('products-tbody');

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:var(--space-8);">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td class="text-muted">#${p.id}</td>
      <td>
        <div style="font-weight:600;">${escHtml(p.name)}</div>
        <div class="text-small text-muted">${escHtml((p.description || '').substring(0, 60))}${(p.description || '').length > 60 ? '…' : ''}</div>
      </td>
      <td>${escHtml(p.category_name || '—')}</td>
      <td>$${Number(p.price).toFixed(2)}</td>
      <td>
        <span class="${p.stock === 0 ? 'text-danger' : p.stock <= 5 ? 'text-warning' : 'text-success'}">
          ${p.stock}
        </span>
      </td>
      <td>
        <span class="badge ${p.is_active !== false ? 'badge--success' : 'badge--muted'}">
          ${p.is_active !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn--secondary btn--sm" onclick="openProductModal(${p.id})">✏️ Edit</button>
          <button class="btn btn--ghost btn--sm" onclick="openStockModal(${p.id}, ${p.stock})">📦 Stock</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Product Create / Edit Modal ──────────────────────────────

function openProductModal(productId = null) {
  editingProductId = productId;
  const overlay = document.getElementById('product-modal-overlay');
  const title   = document.getElementById('product-modal-title');

  // Clear the form
  document.getElementById('product-modal-form').reset();
  document.getElementById('product-modal-alert').classList.add('hidden');

  if (productId) {
    // Edit mode — pre-fill form with existing product data
    title.textContent = 'Edit Product';
    document.getElementById('pm-active-group').style.display = 'block';
    const product = allProducts.find(p => p.id === productId);
    if (product) {
      document.getElementById('pm-product-id').value   = product.id;
      document.getElementById('pm-category').value     = product.category_id;
      document.getElementById('pm-name').value         = product.name;
      document.getElementById('pm-description').value  = product.description || '';
      document.getElementById('pm-price').value        = product.price;
      document.getElementById('pm-image-url').value    = product.image_url || '';
      document.getElementById('pm-active').value       = product.is_active !== false ? 'true' : 'false';
    }
  } else {
    // Create mode
    title.textContent = 'New Product';
    document.getElementById('pm-active-group').style.display = 'none';
  }

  // Populate category dropdown
  populateCategoryDropdown('pm-category', editingProductId
    ? allProducts.find(p => p.id === productId)?.category_id
    : null
  );

  overlay.classList.add('open');
}

function closeProductModal(e) {
  // If clicking on the overlay background itself, close; otherwise don't
  if (e && e.target !== document.getElementById('product-modal-overlay')) return;
  document.getElementById('product-modal-overlay').classList.remove('open');
}

function populateCategoryDropdown(selectId, selectedCategoryId = null) {
  const select = document.getElementById(selectId);
  // Keep the placeholder option, replace the rest
  select.innerHTML = `<option value="">Select category…</option>`;
  allCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    if (selectedCategoryId && cat.id === selectedCategoryId) option.selected = true;
    select.appendChild(option);
  });
}

async function handleSaveProduct() {
  const saveBtn = document.getElementById('product-modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner spinner--small"></span>';

  const categoryId  = parseInt(document.getElementById('pm-category').value);
  const name        = document.getElementById('pm-name').value.trim();
  const description = document.getElementById('pm-description').value.trim();
  const price       = parseFloat(document.getElementById('pm-price').value);
  const imageUrl    = document.getElementById('pm-image-url').value.trim() || null;
  const isActive    = document.getElementById('pm-active').value === 'true';

  if (!categoryId || !name || isNaN(price)) {
    showTabAlert('product-modal-alert', 'Please fill in all required fields.');
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Product';
    return;
  }

  let result;
  if (editingProductId) {
    // Update existing product
    result = await updateProduct(editingProductId, {
      category_id: categoryId, name, description, price, image_url: imageUrl, is_active: isActive,
    });
  } else {
    // Create new product
    result = await createProduct({
      category_id: categoryId, name, description, price, image_url: imageUrl,
    });
  }

  saveBtn.disabled = false;
  saveBtn.innerHTML = 'Save Product';

  if (result.error) {
    const alertEl = document.getElementById('product-modal-alert');
    alertEl.className = 'alert alert--error';
    alertEl.innerHTML = `<span class="alert__icon">❌</span><span>${escHtml(result.error)}</span>`;
    alertEl.classList.remove('hidden');
    return;
  }

  // Success — close modal and reload products
  document.getElementById('product-modal-overlay').classList.remove('open');
  showTabAlert('product-alert', `Product ${editingProductId ? 'updated' : 'created'} successfully! ✅`, 'success');
  loadAdminProducts();
}

// ─── Stock Modal ──────────────────────────────────────────────

function openStockModal(productId, currentStock) {
  document.getElementById('sm-product-id').value   = productId;
  document.getElementById('sm-quantity').value      = currentStock;
  document.getElementById('stock-modal-alert').classList.add('hidden');
  document.getElementById('stock-modal-title').textContent = `Update Stock — Product #${productId}`;
  document.getElementById('stock-modal-overlay').classList.add('open');
}

function closeStockModal(e) {
  if (e && e.target !== document.getElementById('stock-modal-overlay')) return;
  document.getElementById('stock-modal-overlay').classList.remove('open');
}

async function handleSaveStock() {
  const btn       = document.getElementById('stock-modal-save-btn');
  const productId = parseInt(document.getElementById('sm-product-id').value);
  const quantity  = parseInt(document.getElementById('sm-quantity').value);

  if (isNaN(quantity) || quantity < 0) {
    const alertEl = document.getElementById('stock-modal-alert');
    alertEl.className = 'alert alert--error';
    alertEl.innerHTML = `<span class="alert__icon">❌</span><span>Please enter a valid quantity.</span>`;
    alertEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner--small"></span>';

  const { error } = await updateProductStock(productId, quantity);

  btn.disabled = false;
  btn.innerHTML = 'Update Stock';

  if (error) {
    const alertEl = document.getElementById('stock-modal-alert');
    alertEl.className = 'alert alert--error';
    alertEl.innerHTML = `<span class="alert__icon">❌</span><span>${escHtml(error)}</span>`;
    alertEl.classList.remove('hidden');
    return;
  }

  document.getElementById('stock-modal-overlay').classList.remove('open');
  showTabAlert('product-alert', `Stock updated successfully! ✅`, 'success');
  loadAdminProducts();
}

// ═══════════════════════════════════════════════════════════════
// ORDERS TAB
// ═══════════════════════════════════════════════════════════════

const FULFILLMENT_STEPS = ['Shipped', 'Out for Delivery', 'Delivered'];

/** Returns the NEXT fulfillment step, or null if already at the end. */
function nextFulfillmentStep(currentStatus) {
  if (!currentStatus) return 'Shipped';
  const idx = FULFILLMENT_STEPS.indexOf(currentStatus);
  return idx >= 0 && idx < FULFILLMENT_STEPS.length - 1
    ? FULFILLMENT_STEPS[idx + 1]
    : null;
}

async function loadAdminOrders() {
  const statusFilter = document.getElementById('order-status-filter').value;
  document.getElementById('orders-table-loading').style.display = 'block';
  document.getElementById('orders-table-wrapper').style.display = 'none';
  document.getElementById('orders-empty-admin').classList.add('hidden');

  const { data, error } = await getAllOrdersAdmin(statusFilter || null);

  if (error) {
    document.getElementById('orders-table-loading').style.display = 'none';
    showTabAlert('fulfillment-alert', `Failed to load orders: ${error}`);
    return;
  }

  const orders = data || [];
  if (orders.length === 0) {
    document.getElementById('orders-table-loading').style.display = 'none';
    document.getElementById('orders-empty-admin').classList.remove('hidden');
    return;
  }

  // ── Fetch full details for every order in parallel ──────────
  // GET /orders/admin/all doesn't return fulfillment_status.
  // GET /orders/{id} does, but it may return 403 for orders belonging to
  // other users (backend restricts access to the order owner).
  // So we:
  //   1. Try the detail fetch (works for admin's own orders or if backend allows it)
  //   2. Fall back to localStorage (persisted from previous admin actions)
  //   3. Treat customer-confirmed orders (received_confirmed_at set) as Delivered
  const detailResults = await Promise.all(orders.map(o => getOrder(o.id)));

  const enrichedOrders = orders.map((order, i) => {
    const detail = detailResults[i]?.data; // may be null if 403
    const apiStatus = detail?.fulfillment_status || null;
    // If customer confirmed receipt, treat the order as Delivered regardless
    const confirmedByCustomer = Boolean(detail?.received_confirmed_at);
    const effectiveStatus = confirmedByCustomer && !apiStatus
      ? 'Delivered'
      : getFulfillmentStatus(order.id, apiStatus); // localStorage fallback
    return { ...order, fulfillment_status: effectiveStatus, received_confirmed_at: detail?.received_confirmed_at || null };
  });

  document.getElementById('orders-table-loading').style.display = 'none';
  document.getElementById('orders-table-wrapper').style.display = 'block';

  const tbody = document.getElementById('orders-tbody');

  // Status badge helper (inline to avoid global conflict)
  const statusBadge = (s) => {
    const map = { 'Paid':'badge--success','Pending':'badge--warning','Cancelled':'badge--danger','Refunded':'badge--muted' };
    return `<span class="badge ${map[s] || 'badge--accent'}">${escHtml(s)}</span>`;
  };
  const fulfillBadge = (s) => {
    if (!s) return `<span class="text-muted text-small">Pending</span>`;
    const map = { 'Shipped':'badge--info','Out for Delivery':'badge--warning','Delivered':'badge--success' };
    return `<span class="badge ${map[s] || 'badge--muted'}">${escHtml(s)}</span>`;
  };

  tbody.innerHTML = enrichedOrders.map(order => {
    // fulfillment_status is now fetched directly from the DB via GET /orders/{id}
    const knownStatus = order.fulfillment_status || null;

    const next = nextFulfillmentStep(knownStatus);
    const advanceBtn = next
      ? `<button
           class="btn btn--secondary btn--sm"
           id="fulfill-btn-${order.id}"
           onclick="handleAdvanceFulfillment(${order.id}, '${next}')"
         >
           🚚 Mark as ${next}
         </button>`
      : `<span class="badge badge--success">Delivered ✓</span>`;

    return `
      <tr id="order-row-${order.id}">
        <td>
          <a href="order-detail.html?id=${order.id}" style="color:var(--accent-hover);font-weight:600;">
            #${order.id}
          </a>
        </td>
        <td>${escHtml(order.customer_name || '—')}</td>
        <td class="text-muted text-small">${escHtml(order.email || '—')}</td>
        <td>$${Number(order.total_amount).toFixed(2)}</td>
        <td>${statusBadge(order.status)}</td>
        <td id="fulfill-badge-${order.id}">
          ${fulfillBadge(knownStatus)}
          ${order.received_confirmed_at ? '<br><span class="text-muted text-small" title="Customer confirmed receipt">✔ Confirmed</span>' : ''}
        </td>
        <td class="text-muted text-small">${new Date(order.created_at).toLocaleDateString()}</td>
        <td id="fulfill-action-${order.id}">${advanceBtn}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Advances an order's fulfillment status to the given next step.
 * Shows the API's error message if the transition is invalid.
 *
 * Rather than reloading the whole table (which would lose our local status
 * tracking if the API doesn't return fulfillment_status), we update the
 * specific row's badge and button in-place, AND store it in localFulfillmentMap.
 */
async function handleAdvanceFulfillment(orderId, nextStatus) {
  // Disable the button immediately to prevent double-clicks
  const btn = document.getElementById(`fulfill-btn-${orderId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner--small"></span> Updating…';
  }

  const { data, error } = await updateFulfillmentStatus(orderId, nextStatus);

  if (error) {
    // Re-enable button and show the specific API error
    if (btn) { btn.disabled = false; btn.innerHTML = `🚚 Mark as ${nextStatus}`; }
    showTabAlert('fulfillment-alert', `Order #${orderId}: ${error}`);
    return;
  }

  // ── Success: persist the new status to localStorage AND to the API response ──
  const confirmedStatus = data?.fulfillment_status || nextStatus;
  setFulfillmentStatus(orderId, confirmedStatus);

  // Update the fulfillment badge in this row without a full reload
  const badgeCell = document.getElementById(`fulfill-badge-${orderId}`);
  const actionCell = document.getElementById(`fulfill-action-${orderId}`);
  const fulfillBadge = (s) => {
    if (!s) return `<span class="text-muted text-small">Pending</span>`;
    const map = { 'Shipped':'badge--info','Out for Delivery':'badge--warning','Delivered':'badge--success' };
    return `<span class="badge ${map[s] || 'badge--muted'}">${s}</span>`;
  };

  if (badgeCell)  badgeCell.innerHTML  = fulfillBadge(nextStatus);

  // Compute what the NEXT button should be after this advance
  const afterNext = nextFulfillmentStep(nextStatus);
  if (actionCell) {
    actionCell.innerHTML = afterNext
      ? `<button
           class="btn btn--secondary btn--sm"
           id="fulfill-btn-${orderId}"
           onclick="handleAdvanceFulfillment(${orderId}, '${afterNext}')"
         >
           🚚 Mark as ${afterNext}
         </button>`
      : `<span class="badge badge--success">Delivered ✓</span>`;
  }

  showTabAlert('fulfillment-alert', `Order #${orderId} marked as "${nextStatus}" ✅`, 'success');
}

// ═══════════════════════════════════════════════════════════════
// WALLET TAB
// ═══════════════════════════════════════════════════════════════

async function handleCreditWallet(e) {
  e.preventDefault();
  const btn    = document.getElementById('credit-submit-btn');
  const userId = document.getElementById('credit-user-id').value.trim();
  const amount = parseFloat(document.getElementById('credit-amount').value);

  if (!userId) {
    showTabAlert('wallet-credit-alert', 'Please enter a User ID.');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showTabAlert('wallet-credit-alert', 'Please enter a valid amount greater than 0.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner--small"></span> Crediting…';

  const { data, error } = await creditWallet(userId, amount);

  btn.disabled = false;
  btn.innerHTML = '💰 Credit Wallet';

  if (error) {
    showTabAlert('wallet-credit-alert', error);
  } else {
    showTabAlert(
      'wallet-credit-alert',
      `Successfully credited $${amount.toFixed(2)} to user ${userId}. New balance: $${Number(data?.balance ?? 0).toFixed(2)}`,
      'success'
    );
    document.getElementById('wallet-credit-form').reset();
  }
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // requireAdmin() checks role_id === 1 via /auth/me
  const user = await requireAdmin();
  if (!user) return; // redirected away

  document.getElementById('admin-loading').style.display = 'none';
  document.getElementById('admin-content').classList.remove('hidden');

  // Load categories (needed for product modal dropdown)
  const { data: cats } = await getCategories();
  allCategories = cats || [];

  // Load the default (products) tab
  await loadAdminProducts();

  // Wallet credit form
  document.getElementById('wallet-credit-form').addEventListener('submit', handleCreditWallet);
});

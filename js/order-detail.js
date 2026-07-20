/**
 * order-detail.js — Order Detail Page
 * ======================================
 * Reads ?id= from URL. Loads full order details + status history.
 * Renders:
 *   - Fulfillment progress tracker (3 steps)
 *   - Status history timeline
 *   - Items table with totals
 *   - Shipping address
 *   - "Confirm Receipt" button (only when Delivered and not yet confirmed)
 *   - Invoice download link
 *
 * Depends on: api.js, auth.js
 */

const FULFILLMENT_STEPS = ['Shipped', 'Out for Delivery', 'Delivered'];
let currentOrderId = null;
let currentOrder   = null;

// ─── Helpers ─────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stepIndex(status) {
  return FULFILLMENT_STEPS.indexOf(status);
}

function orderStatusBadge(status) {
  const map = { 'Paid':'badge--success','Pending':'badge--warning','Cancelled':'badge--danger','Refunded':'badge--muted' };
  return `<span class="badge ${map[status] || 'badge--accent'}">${escHtml(status)}</span>`;
}

// ─── Full Fulfillment Progress Tracker ───────────────────────

/**
 * Renders the full 3-step horizontal progress tracker.
 * @param {string|null} fulfillmentStatus  - current step label (or null)
 * @param {string|null} updatedAt          - ISO timestamp of last update
 */
function renderFulfillmentTracker(fulfillmentStatus, updatedAt) {
  const current = stepIndex(fulfillmentStatus);

  if (current === -1 && !fulfillmentStatus) {
    return `<div class="text-muted" style="padding:var(--space-2) 0;">
      Your order has been received and is being prepared for shipment.
    </div>`;
  }

  const icons = ['📦', '🚚', '✅'];

  let html = '<div class="fulfillment-tracker">';
  FULFILLMENT_STEPS.forEach((step, i) => {
    const isComplete = i < current;
    const isActive   = i === current;
    const cls = isComplete ? 'tracker-step--complete' : (isActive ? 'tracker-step--active' : '');
    const icon = isComplete ? '✓' : (isActive ? icons[i] : icons[i]);

    html += `
      <div class="tracker-step ${cls}">
        <div class="tracker-step__circle">${icon}</div>
        <div class="tracker-step__label">${step}</div>
        ${isActive && updatedAt
          ? `<div class="tracker-step__date">${new Date(updatedAt).toLocaleDateString()}</div>`
          : ''}
      </div>
    `;
  });
  html += '</div>';
  return html;
}

// ─── Status History Timeline ──────────────────────────────────

function renderStatusHistory(history) {
  const loadingEl = document.getElementById('status-history-loading');
  const container = document.getElementById('status-history-container');
  const emptyEl   = document.getElementById('status-history-empty');

  loadingEl.style.display = 'none';

  if (!history || history.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = history.map(item => `
    <div class="timeline-item">
      <div class="timeline-item__status">${escHtml(item.status)}</div>
      <div class="timeline-item__meta">
        ${new Date(item.changed_at).toLocaleString()}
        ${item.changed_by_name ? ` · by ${escHtml(item.changed_by_name)}` : ''}
      </div>
    </div>
  `).join('');
}

// ─── Load Order ───────────────────────────────────────────────

async function loadOrderDetail(orderId) {
  const { data: order, error } = await getOrder(orderId);

  document.getElementById('order-loading').style.display = 'none';

  if (error) {
    document.getElementById('order-error').classList.remove('hidden');
    document.getElementById('order-error-msg').textContent = error;
    return;
  }

  currentOrder = order;
  document.title = `Order #${order.id} — Shopify`;
  document.getElementById('order-content').classList.remove('hidden');

  // ── Header ────────────────────────────────────────────────
  document.getElementById('order-title').textContent = `Order #${order.id}`;
  document.getElementById('order-meta').textContent =
    `Placed on ${new Date(order.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`;
  document.getElementById('order-status-badge').innerHTML = orderStatusBadge(order.status);

  // Invoice download button
  if (order.invoice_number) {
    document.getElementById('invoice-btn').style.display = 'inline-flex';
  }

  // ── Fulfillment Tracker ───────────────────────────────────
  document.getElementById('fulfillment-tracker-container').innerHTML =
    renderFulfillmentTracker(order.fulfillment_status, order.fulfillment_updated_at);

  // ── Confirm Receipt Button ────────────────────────────────
  // Show ONLY when: status is "Delivered" AND received_confirmed_at is null
  if (order.fulfillment_status === 'Delivered' && !order.received_confirmed_at) {
    document.getElementById('confirm-receipt-section').classList.remove('hidden');
  } else if (order.received_confirmed_at) {
    document.getElementById('receipt-confirmed-state').classList.remove('hidden');
  }

  // ── Items Table ───────────────────────────────────────────
  const itemsBody = document.getElementById('order-items-body');
  itemsBody.innerHTML = (order.items || []).map(item => `
    <tr>
      <td>
        <a href="product.html?id=${item.product_id}" style="color:var(--text-primary);">
          ${escHtml(item.name)}
        </a>
      </td>
      <td>${item.quantity}</td>
      <td>$${Number(item.unit_price).toFixed(2)}</td>
      <td><strong>$${Number(item.line_total).toFixed(2)}</strong></td>
    </tr>
  `).join('');
  document.getElementById('order-total').textContent = `$${Number(order.total_amount).toFixed(2)}`;

  // ── Shipping Address ──────────────────────────────────────
  document.getElementById('order-address').innerHTML = `
    <p style="color:var(--text-primary);font-weight:600;">${escHtml(order.recipient_name)}</p>
    <p class="text-muted" style="margin-top:4px;line-height:1.7;">
      ${escHtml(order.address_line1)}
      ${order.address_line2 ? `<br />${escHtml(order.address_line2)}` : ''}
      <br />${escHtml(order.city)}, ${escHtml(order.state)} ${escHtml(order.postal_code)}
      <br />${escHtml(order.country)}
      <br />${escHtml(order.phone)}
    </p>
  `;
}

// ─── Confirm Receipt ──────────────────────────────────────────

async function handleConfirmReceipt() {
  const btn = document.getElementById('confirm-receipt-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner--small"></span> Confirming…';

  const { data, error } = await confirmReceipt(currentOrderId);

  btn.disabled = false;
  btn.innerHTML = '✅ Confirm Receipt';

  if (error) {
    // Show the specific API error (e.g. "must be Delivered first", "already confirmed")
    const alertEl = document.getElementById('confirm-receipt-alert');
    alertEl.className = 'alert alert--error';
    alertEl.innerHTML = `<span class="alert__icon">❌</span><span>${escHtml(error)}</span>`;
    alertEl.classList.remove('hidden');
  } else {
    // Hide the button section, show the confirmed state
    document.getElementById('confirm-receipt-section').classList.add('hidden');
    document.getElementById('receipt-confirmed-state').classList.remove('hidden');
  }
}

// ─── Invoice Download ─────────────────────────────────────────

async function handleDownloadInvoice() {
  const btn = document.getElementById('invoice-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner--small"></span>';

  try {
    // Fetch the PDF with the auth header (can't use <a download> for this)
    const response = await fetchOrderInvoice(currentOrderId);
    btn.disabled = false;
    btn.innerHTML = '📄 Download Invoice';

    if (!response.ok) {
      alert('Could not download invoice. Please try again.');
      return;
    }

    // Create a temporary object URL from the blob and trigger download
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `invoice-order-${currentOrderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Clean up the object URL after a moment
    setTimeout(() => URL.revokeObjectURL(url), 5000);

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '📄 Download Invoice';
    alert('Download failed. Please try again.');
  }
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    document.getElementById('order-loading').style.display = 'none';
    document.getElementById('order-error').classList.remove('hidden');
    document.getElementById('order-error-msg').textContent = 'No order ID provided.';
    return;
  }

  currentOrderId = id;

  // Load order details and status history in parallel
  const [_, historyResult] = await Promise.all([
    loadOrderDetail(id),
    getOrderStatusHistory(id),
  ]);

  if (!historyResult.error) {
    renderStatusHistory(historyResult.data);
  }
});

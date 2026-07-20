/**
 * orders.js — Order History Page
 * ================================
 * Requires auth. Loads the current user's orders and renders
 * each one as a card with a mini fulfillment progress tracker.
 *
 * Depends on: api.js, auth.js
 */

// ─── Fulfillment Tracker Helpers ──────────────────────────────

/**
 * The three fulfillment steps in order.
 * null means the order hasn't started fulfillment yet.
 */
const FULFILLMENT_STEPS = ['Shipped', 'Out for Delivery', 'Delivered'];

/**
 * Returns the step index (0, 1, 2) for a given status, or -1 if null/unknown.
 */
function stepIndex(status) {
  return FULFILLMENT_STEPS.indexOf(status);
}

/**
 * Builds the mini fulfillment tracker HTML for use in the order list.
 * Shows 3 dots connected by lines, with active/complete visual states.
 * @param {string|null} fulfillmentStatus
 */
function renderMiniTracker(fulfillmentStatus) {
  const current = stepIndex(fulfillmentStatus);

  if (current === -1) {
    // Order hasn't been shipped yet
    return `<span class="text-muted text-small">Awaiting fulfillment</span>`;
  }

  let html = '<div class="tracker-mini">';
  FULFILLMENT_STEPS.forEach((step, i) => {
    const isComplete = i < current;
    const isActive   = i === current;

    html += `<div
      class="tracker-mini__dot ${isComplete ? 'tracker-mini__dot--complete' : ''} ${isActive ? 'tracker-mini__dot--active' : ''}"
      title="${step}"
    ></div>`;

    // Connecting line between dots
    if (i < FULFILLMENT_STEPS.length - 1) {
      html += `<div class="tracker-mini__line ${isComplete ? 'tracker-mini__line--complete' : ''}"></div>`;
    }
  });
  html += `</div>`;
  html += `<span class="text-small" style="color:var(--text-secondary)">${fulfillmentStatus}</span>`;
  return html;
}

/**
 * Returns a badge HTML for an order status string.
 */
function orderStatusBadge(status) {
  const map = {
    'Paid':      'badge--success',
    'Pending':   'badge--warning',
    'Cancelled': 'badge--danger',
    'Refunded':  'badge--muted',
  };
  const cls = map[status] || 'badge--accent';
  return `<span class="badge ${cls}">${status}</span>`;
}

// ─── Render ───────────────────────────────────────────────────

function renderOrders(orders) {
  document.getElementById('orders-loading').style.display = 'none';
  const list  = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');

  if (!orders || orders.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  list.style.display = 'flex';
  list.classList.remove('hidden');

  list.innerHTML = orders.map(order => `
    <div class="card animate-fade-in-up" style="cursor:pointer;" onclick="window.location.href='order-detail.html?id=${order.id}'">
      <div class="card__body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-3);">
          <!-- Order info -->
          <div>
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2);">
              <span class="font-bold">Order #${order.id}</span>
              ${orderStatusBadge(order.status)}
            </div>
            <div class="text-muted text-small">
              Placed on ${new Date(order.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
            </div>
          </div>

          <!-- Total + arrow -->
          <div style="text-align:right;">
            <div class="font-bold" style="font-size:1.1rem;">$${Number(order.total_amount).toFixed(2)}</div>
            <div class="text-muted text-small">View details →</div>
          </div>
        </div>

        <!-- Mini fulfillment tracker -->
        <div style="margin-top:var(--space-3);display:flex;align-items:center;gap:var(--space-2);">
          <span class="text-muted text-small" style="width:80px;flex-shrink:0;">Delivery:</span>
          ${renderMiniTracker(order.fulfillment_status || null)}
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const { data, error } = await getOrders();

  if (error) {
    document.getElementById('orders-loading').style.display = 'none';
    document.getElementById('orders-error').classList.remove('hidden');
    document.getElementById('orders-error-msg').textContent = error;
    return;
  }

  // Sort orders newest first (API may not guarantee order)
  const sorted = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  renderOrders(sorted);
});

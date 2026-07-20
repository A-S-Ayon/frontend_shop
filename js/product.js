/**
 * product.js — Product Detail Page
 * ==================================
 * Reads ?id= from the URL, fetches the product, renders details.
 * Also loads reviews + summary, and handles the review submission form.
 *
 * Depends on: api.js, auth.js
 */

// ─── Shared Helpers ───────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
    background:'var(--bg-elevated)', border:'1px solid var(--border)',
    color:'var(--text-primary)', padding:'12px 24px',
    borderRadius:'var(--radius-full)', boxShadow:'var(--shadow-lg)',
    fontSize:'0.9rem', fontWeight:'500', zIndex:'9999',
    animation:'fadeInUp 0.3s ease', whiteSpace:'nowrap',
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function showReviewAlert(message, type = 'error') {
  const box = document.getElementById('review-alert');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type]}</span><span>${message}</span>`;
  box.classList.remove('hidden');
}

/**
 * Renders a row of stars based on a numeric rating.
 * @param {number} rating - 1 to 5
 * @param {number} [outOf=5]
 */
function renderStars(rating, outOf = 5) {
  let html = '<div class="stars">';
  for (let i = 1; i <= outOf; i++) {
    if (i <= Math.floor(rating)) {
      html += '<span class="stars__filled">★</span>';
    } else {
      html += '<span class="stars__empty">★</span>';
    }
  }
  html += '</div>';
  return html;
}

// ─── Product Detail ───────────────────────────────────────────

let currentProductId = null;

async function loadProduct(id) {
  const { data: product, error } = await getProduct(id);

  document.getElementById('product-loading').style.display = 'none';

  if (error) {
    document.getElementById('product-error').classList.remove('hidden');
    document.getElementById('product-error-msg').textContent = error;
    return;
  }

  // Update page title
  document.title = `${product.name} — Shopify`;

  // Build product image HTML
  let imageHTML;
  if (product.image_url) {
    imageHTML = `<img src="${escHtml(product.image_url)}" alt="${escHtml(product.name)}" onerror="this.parentElement.innerHTML='<div style=\\'font-size:4rem;display:flex;align-items:center;justify-content:center;height:100%\\'>🛍️</div>'" />`;
  } else {
    imageHTML = `<div style="font-size:4rem;display:flex;align-items:center;justify-content:center;height:100%;background:var(--bg-elevated)">🛍️</div>`;
  }

  // Stock display
  let stockHTML;
  if (product.stock === 0) {
    stockHTML = `<span class="badge badge--danger">Out of Stock</span>`;
  } else if (product.stock <= 5) {
    stockHTML = `<span class="badge badge--warning">Only ${product.stock} left!</span>`;
  } else {
    stockHTML = `<span class="badge badge--success">In Stock (${product.stock})</span>`;
  }

  const isOutOfStock = product.stock === 0;

  // Render the product detail section
  const detailEl = document.getElementById('product-detail');
  detailEl.innerHTML = `
    <div class="product-detail__image">
      ${imageHTML}
    </div>
    <div class="product-detail__info">
      <div class="product-detail__category">${escHtml(product.category_name || '')}</div>
      <h1>${escHtml(product.name)}</h1>
      <div style="margin:var(--space-2) 0;" id="inline-review-summary"></div>
      <div class="product-detail__price">$${Number(product.price).toFixed(2)}</div>
      ${stockHTML}
      <p class="product-detail__desc">${escHtml(product.description || 'No description available.')}</p>

      <div class="product-detail__actions">
        <button
          class="btn btn--primary btn--lg"
          id="add-to-cart-btn"
          onclick="handleAddToCart(${product.id}, '${escHtml(product.name)}')"
          ${isOutOfStock ? 'disabled' : ''}
        >
          🛒 Add to Cart
        </button>
        <button
          class="btn-wish btn--lg"
          id="wish-btn"
          onclick="handleAddToWishlist(${product.id})"
          title="Add to Wishlist"
          style="width:48px;height:48px;font-size:1.3rem;"
        >
          ♡
        </button>
      </div>
    </div>
  `;
  detailEl.classList.remove('hidden');

  // Show the reviews section
  document.getElementById('reviews-section').classList.remove('hidden');
}

// ─── Reviews ──────────────────────────────────────────────────

async function loadReviews(productId) {
  const [summaryResult, reviewsResult] = await Promise.all([
    getProductReviewSummary(productId),
    getProductReviews(productId),
  ]);

  // Show summary in two places: inline with product, and in reviews section header
  if (!summaryResult.error && summaryResult.data) {
    const { review_count, avg_rating } = summaryResult.data;
    const summaryHTML = review_count > 0
      ? `${renderStars(avg_rating)} <span class="text-muted" style="font-size:0.875rem;">${Number(avg_rating).toFixed(1)} out of 5 (${review_count} review${review_count !== 1 ? 's' : ''})</span>`
      : `<span class="text-muted">No reviews yet</span>`;

    const inlineSummary = document.getElementById('inline-review-summary');
    if (inlineSummary) {
      inlineSummary.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${summaryHTML}</div>`;
    }
    document.getElementById('review-summary').innerHTML =
      `<div style="display:flex;align-items:center;gap:8px;">${summaryHTML}</div>`;
  }

  // Render reviews list
  document.getElementById('reviews-loading').style.display = 'none';
  const reviewsList = document.getElementById('reviews-list');
  const reviewsEmpty = document.getElementById('reviews-empty');

  if (reviewsResult.error || !reviewsResult.data || reviewsResult.data.length === 0) {
    reviewsEmpty.classList.remove('hidden');
    return;
  }

  const reviews = reviewsResult.data;
  reviewsList.style.display = 'flex';
  reviewsList.classList.remove('hidden');
  reviewsList.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-card__header">
        <div>
          <div class="review-card__author">${escHtml(r.user_name || 'Anonymous')}</div>
          ${renderStars(r.rating)}
        </div>
        <div class="review-card__date">${new Date(r.created_at).toLocaleDateString()}</div>
      </div>
      <p class="review-card__comment">${escHtml(r.comment || '')}</p>
    </div>
  `).join('');
}

// ─── Cart Action ──────────────────────────────────────────────

async function handleAddToCart(productId, productName) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  const btn = document.getElementById('add-to-cart-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner--small"></span>'; }

  const { error } = await addToCart(productId, 1);

  if (btn) { btn.disabled = false; btn.innerHTML = '🛒 Add to Cart'; }
  if (error) {
    alert(`Could not add to cart: ${error}`);
  } else {
    showToast(`"${productName}" added to cart! 🛒`);
    updateNavCartCount();
  }
}

// ─── Wishlist Action ──────────────────────────────────────────

async function handleAddToWishlist(productId) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  const btn = document.getElementById('wish-btn');
  if (btn) btn.innerHTML = '…';
  const { data, error } = await addToWishlist(productId);
  if (error) {
    alert(`Could not add to wishlist: ${error}`);
    if (btn) btn.innerHTML = '♡';
  } else {
    if (btn) { btn.innerHTML = '♥'; btn.classList.add('active'); }
    showToast('Added to wishlist! ❤️');
  }
}

// ─── Review Submission ────────────────────────────────────────

async function handleReviewSubmit(e) {
  e.preventDefault();

  const ratingInput = document.querySelector('input[name="rating"]:checked');
  const comment     = document.getElementById('review-comment').value.trim();

  if (!ratingInput) {
    showReviewAlert('Please select a star rating.');
    return;
  }
  if (!comment) {
    showReviewAlert('Please write a comment.');
    return;
  }

  const submitBtn = document.getElementById('review-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner spinner--small"></span> Submitting…';

  const { data, error } = await postReview(
    currentProductId,
    parseInt(ratingInput.value),
    comment
  );

  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Submit Review';

  if (error) {
    // Show the API error — it's helpful ("already reviewed", "must purchase first", etc.)
    showReviewAlert(error);
  } else {
    showReviewAlert('Review submitted! Thank you 🎉', 'success');
    // Hide the form and reload reviews
    document.getElementById('review-form-container').classList.add('hidden');
    // Re-load reviews after a short delay
    setTimeout(() => loadReviews(currentProductId), 800);
  }
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Read the product ID from the URL: product.html?id=42
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    document.getElementById('product-loading').style.display = 'none';
    document.getElementById('product-error').classList.remove('hidden');
    document.getElementById('product-error-msg').textContent = 'No product ID provided.';
    return;
  }

  currentProductId = id;

  // Load product info and reviews in parallel
  await Promise.all([
    loadProduct(id),
    loadReviews(id),
  ]);

  // Show review form only if logged in
  if (isLoggedIn()) {
    document.getElementById('review-form-container').classList.remove('hidden');
    document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);
  } else {
    document.getElementById('review-login-nudge').classList.remove('hidden');
  }
});

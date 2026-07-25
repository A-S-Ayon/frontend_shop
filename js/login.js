/**
 * login.js — Login Page Logic
 * =============================
 * Handles login form.
 * Special case: if the server returns a 403, it means the user
 * is registered but hasn't verified their email yet — we show
 * a specific banner with a "Go to Verify" button and "Resend Code".
 *
 * Depends on: api.js, auth.js
 */

function showAlert(message, type = 'error') {
  const box = document.getElementById('alert-box');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type]}</span><span>${message}</span>`;
  box.classList.remove('hidden');
}
function hideAlert() {
  document.getElementById('alert-box').classList.add('hidden');
  document.getElementById('alert-box').innerHTML = '';
}
function showUnverifiedBanner() {
  document.getElementById('unverified-banner').classList.remove('hidden');
}
function hideUnverifiedBanner() {
  document.getElementById('unverified-banner').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go home
  if (isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  // Fill in email if redirected from elsewhere (e.g. verify page)
  const params = new URLSearchParams(window.location.search);
  const emailFromUrl = params.get('email');
  if (emailFromUrl) {
    document.getElementById('email').value = decodeURIComponent(emailFromUrl);
  }

  const form      = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    hideUnverifiedBanner();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showAlert('Please enter your email and password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner--small"></span> Logging in…';

    // NOTE: authLogin in api.js will normally process 403 as an error.
    // The raw fetch response gives us status 403, which apiFetch converts
    // to an error message. We detect the 403 "not verified" message here.
    const { data, error } = await authLogin(email, password);

    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Log In';

    if (error) {
      // Check if the error is about email verification
      // The backend typically returns "Email not verified" or similar.
      if (error.toLowerCase().includes('verif') || error.toLowerCase().includes('not verified')) {
        showUnverifiedBanner();
        // Save email for the "Go to Verify" button
        window._loginEmail = email;
      } else {
        showAlert(error);
      }
      return;
    }

    // Success — store the token, save email, and go home
    setToken(data.access_token);
    // Keep email in sync so loadCurrentUser can fall back to it
    localStorage.setItem('shopify_user_email', email);
    window.location.href = 'index.html';

  });

  // ── "Go to Verification Page" button ──────────────────────
  document.getElementById('go-verify-btn').addEventListener('click', () => {
    const email = document.getElementById('email').value.trim() || window._loginEmail || '';
    window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
  });

  // ── "Resend Code" button from login page ──────────────────
  document.getElementById('resend-from-login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim() || window._loginEmail || '';
    if (!email) {
      showAlert('Enter your email address above first.');
      return;
    }

    const btn = document.getElementById('resend-from-login-btn');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const { data, error } = await authResendCode(email);

    btn.disabled = false;
    btn.textContent = 'Resend Code';

    if (error) {
      showAlert(error);
    } else {
      showAlert(data?.message || 'A new verification code has been sent!', 'success');
    }
  });
});

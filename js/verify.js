/**
 * verify.js — Email Verification Page Logic
 * ==========================================
 * Pre-fills the email from the URL query string (?email=...)
 * Handles code submission → stores token → redirects to home
 * Also handles the "Resend Code" button.
 *
 * Depends on: api.js, auth.js
 */

function showAlert(message, type = 'error') {
  const box = document.getElementById('alert-box');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  box.classList.remove('hidden');
}
function hideAlert() {
  const box = document.getElementById('alert-box');
  box.className = 'hidden';
  box.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go home
  if (isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  // ── Pre-fill email from URL query string ──────────────────
  // When signup.html redirects here, it adds ?email=user@example.com
  const params = new URLSearchParams(window.location.search);
  const emailFromUrl = params.get('email');
  const emailInput = document.getElementById('email');

  if (emailFromUrl) {
    emailInput.value = decodeURIComponent(emailFromUrl);
    // Update the subtitle to show which email it was sent to
    document.getElementById('verify-subtitle').textContent =
      `We sent a code to ${emailFromUrl}. Check your inbox.`;
  }

  // ── Verify form ───────────────────────────────────────────
  const form      = document.getElementById('verify-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const code  = document.getElementById('code').value.trim();

    if (!email || !code) {
      showAlert('Please enter your email and the verification code.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showAlert('The code must be exactly 6 digits.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner--small"></span> Verifying…';

    const { data, error } = await authVerifyEmail(email, code);

    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Verify & Log In';

    if (error) {
      showAlert(error);
      return;
    }

    // Store the token — the user is now logged in
    setToken(data.access_token);
    showAlert('Email verified! Welcome 🎉 Redirecting…', 'success');

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  });

  // ── Resend Code button ────────────────────────────────────
  const resendBtn = document.getElementById('resend-btn');

  resendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      showAlert('Enter your email address first.');
      return;
    }

    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';

    const { data, error } = await authResendCode(email);

    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend Code';

    if (error) {
      showAlert(error);
    } else {
      showAlert(data?.message || 'A new code has been sent to your email.', 'success');
    }
  });
});

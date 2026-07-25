/**
 * signup.js — Signup Page Logic
 * ================================
 * Handles the signup form submission.
 * On success, redirects to verify.html with the email in the URL.
 *
 * Depends on: api.js, auth.js
 */

// ─── Helper: show an alert message ───────────────────────────
/**
 * Displays a success or error alert inside the auth card.
 * @param {string} message - the text to show
 * @param {'success'|'error'|'info'} type
 */
function showAlert(message, type = 'error') {
  const box = document.getElementById('alert-box');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type]}</span><span>${message}</span>`;
  box.classList.remove('hidden');
}

function hideAlert() {
  const box = document.getElementById('alert-box');
  box.className = 'hidden';
  box.innerHTML = '';
}

// ─── Signup form handler ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, send them to the home page
  if (isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('signup-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    // Prevent the default browser form submission (page reload)
    e.preventDefault();
    hideAlert();

    // Read the form field values
    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Basic client-side validation
    if (!name || !email || !password) {
      showAlert('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      showAlert('Password must be at least 8 characters.');
      return;
    }

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner--small"></span> Creating account…';

    // Call the API
    const { data, error } = await authSignup(name, email, password);

    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Create Account';

    if (error) {
      // Show the API's error message directly — it's often helpful
      showAlert(error);
      return;
    }

    // Success! Save name + email so the nav can show the real name.
    // The backend has no profile endpoint that returns the name, so we
    // persist it here at sign-up time.
    localStorage.setItem('shopify_user_name',  name);
    localStorage.setItem('shopify_user_email', email);

    showAlert('Account created! Redirecting to verification…', 'success');
    setTimeout(() => {
      window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
    }, 1200);
  });
});

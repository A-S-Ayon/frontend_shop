/**
 * reset-password.js — Reset Password Page Logic
 * ===============================================
 * Reads the reset token from ?token=... in the URL.
 * Validates that both password fields match, then calls authResetPassword.
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

document.addEventListener('DOMContentLoaded', () => {
  // Extract the token from the URL: reset-password.html?token=abc123...
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('token');

  if (!resetToken) {
    // No token in the URL — the user probably navigated here directly
    showAlert('Invalid or missing reset token. Please request a new password reset link.');
    document.getElementById('submit-btn').disabled = true;
    return;
  }

  const form      = document.getElementById('reset-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword     = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate passwords match
    if (!newPassword || !confirmPassword) {
      showAlert('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      showAlert('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match. Please try again.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner--small"></span> Resetting…';

    // The API expects { token, new_password }
    const { data, error } = await authResetPassword(resetToken, newPassword);

    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Reset Password';

    if (error) {
      showAlert(error);
    } else {
      showAlert(
        data?.message || 'Password reset successfully! Redirecting to login…',
        'success'
      );
      // Disable the form, then redirect to login after a moment
      form.querySelectorAll('input, button').forEach(el => el.disabled = true);
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    }
  });
});

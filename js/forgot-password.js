/**
 * forgot-password.js — Forgot Password Page Logic
 * =================================================
 * Sends POST /auth/forgot-password with the user's email.
 * The backend emails them a reset link.
 */

function showAlert(message, type = 'error') {
  const box = document.getElementById('alert-box');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  box.className = `alert alert--${type}`;
  box.innerHTML = `<span class="alert__icon">${icons[type]}</span><span>${message}</span>`;
  box.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('forgot-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    if (!email) {
      showAlert('Please enter your email address.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner--small"></span> Sending…';

    const { data, error } = await authForgotPassword(email);

    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Send Reset Link';

    if (error) {
      showAlert(error);
    } else {
      // Show success regardless — don't leak whether the email exists
      showAlert(
        data?.message || 'If an account with that email exists, a reset link has been sent.',
        'success'
      );
      // Disable the form so they don't spam it
      form.querySelector('input').disabled = true;
      submitBtn.disabled = true;
    }
  });
});

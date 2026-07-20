/**
 * wallet.js — Wallet Page
 * ========================
 * Requires auth. Loads wallet balance and transaction history.
 * Renders a gradient balance card and a transactions table.
 *
 * Depends on: api.js, auth.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // Load balance and transactions in parallel
  const [walletResult, txResult] = await Promise.all([
    getWallet(),
    getWalletTransactions(),
  ]);

  document.getElementById('wallet-loading').style.display = 'none';

  // ── Wallet balance ────────────────────────────────────────
  if (walletResult.error) {
    document.getElementById('wallet-error').classList.remove('hidden');
    document.getElementById('wallet-error-msg').textContent = walletResult.error;
    return;
  }

  document.getElementById('wallet-content').classList.remove('hidden');
  const balance = Number(walletResult.data?.balance ?? 0);
  document.getElementById('wallet-balance-display').textContent = `$${balance.toFixed(2)}`;

  // ── Transactions ──────────────────────────────────────────
  document.getElementById('tx-loading').style.display = 'none';

  if (txResult.error || !txResult.data || txResult.data.length === 0) {
    document.getElementById('tx-empty').classList.remove('hidden');
    document.getElementById('tx-table-wrapper').style.display = 'none';
    return;
  }

  const transactions = txResult.data;

  // Sort newest first
  transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const tbody = document.getElementById('tx-body');
  tbody.innerHTML = transactions.map(tx => {
    // Credit (money in) is positive, debit (money out) is negative
    const isCredit = Number(tx.amount) >= 0;
    const amountStr = `${isCredit ? '+' : ''}$${Math.abs(Number(tx.amount)).toFixed(2)}`;
    const amountColor = isCredit ? 'var(--success)' : 'var(--danger)';

    // Friendly type label
    const typeLabel = tx.type
      ? tx.type.charAt(0).toUpperCase() + tx.type.slice(1).toLowerCase()
      : 'Transaction';

    return `
      <tr>
        <td>${new Date(tx.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}</td>
        <td>
          <span class="badge ${isCredit ? 'badge--success' : 'badge--danger'}">${typeLabel}</span>
        </td>
        <td style="text-align:right;font-weight:700;color:${amountColor};">${amountStr}</td>
      </tr>
    `;
  }).join('');
});

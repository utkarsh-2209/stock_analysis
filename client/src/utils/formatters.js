export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatLargeNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return '₹' + (value / 1e12).toFixed(2) + 'T';
  if (abs >= 1e7) return '₹' + (value / 1e7).toFixed(2) + ' Cr';
  if (abs >= 1e5) return '₹' + (value / 1e5).toFixed(2) + ' L';
  return '₹' + value.toLocaleString('en-IN');
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const pct = (value * 100).toFixed(2);
  return pct + '%';
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Number(value).toFixed(decimals);
}

export function formatChangePercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return sign + value.toFixed(2) + '%';
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function getScoreColor(score) {
  if (score >= 70) return '#00e676';
  if (score >= 40) return '#ffab00';
  return '#ff1744';
}

export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

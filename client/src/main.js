import { renderLanding } from './pages/landing.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSettings } from './pages/settings.js';

const app = document.getElementById('app');

function navigateTo(path) {
  window.location.hash = path;
}

function router() {
  const hash = window.location.hash.slice(1) || '/';

  // Parse route
  if (hash.startsWith('/stock/')) {
    const symbol = hash.replace('/stock/', '');
    renderDashboard(app, symbol, navigateTo);
  } else if (hash === '/settings') {
    renderSettings(app, navigateTo);
  } else {
    renderLanding(app, navigateTo);
  }
}

// Listen for hash changes
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// Initial render
router();

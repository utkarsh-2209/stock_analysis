import { searchStocks } from '../services/api.js';
import { debounce } from '../utils/formatters.js';

const POPULAR_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries' },
  { symbol: 'TCS', name: 'TCS' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { symbol: 'INFY', name: 'Infosys' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { symbol: 'SBIN', name: 'SBI' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel' },
  { symbol: 'ITC', name: 'ITC' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors' },
  { symbol: 'WIPRO', name: 'Wipro' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma' },
  { symbol: 'TITAN', name: 'Titan' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises' },
  { symbol: 'ZOMATO', name: 'Zomato' },
  { symbol: 'HAL', name: 'Hindustan Aero' },
  { symbol: 'LT', name: 'L&T' },
];

export function renderLanding(container, navigateTo) {
  container.innerHTML = `
    <div class="bg-gradient"></div>
    <nav class="navbar">
      <a class="navbar-brand" href="#/" id="nav-home">
        <div class="logo-icon">📊</div>
        <span class="logo-text">StockLens</span>
      </a>
      <div class="navbar-actions">
        <button class="nav-btn" id="nav-settings">
          ⚙️ Settings
        </button>
      </div>
    </nav>

    <div class="landing-page">
      <section class="hero fade-in-up">
        <div class="hero-badge">🇮🇳 Indian Market Analysis</div>
        <h1>Decode Any Stock in Seconds</h1>
        <p>AI-powered analysis for Indian stocks. Get quality scores, valuation insights, financial health reports, real-time news, and chart predictions — all in one place.</p>

        <div class="search-container" id="search-container">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              id="stock-search"
              placeholder="Search stocks — e.g. Reliance, TCS, HDFC..."
              autocomplete="off"
            >
          </div>
          <div class="search-dropdown" id="search-dropdown"></div>
        </div>
      </section>

      <section class="popular-section fade-in-up">
        <h2 class="section-title">Popular Stocks</h2>
        <div class="popular-grid stagger" id="popular-grid"></div>
      </section>

      <section class="features-section">
        <h2 class="section-title">Features</h2>
        <div class="features-grid stagger">
          <div class="feature-card">
            <div class="feature-icon" style="background: var(--accent-blue-dim);">🎯</div>
            <h3>Quality & Valuation Scores</h3>
            <p>Custom-computed quality, valuation, and financial health scores based on real fundamentals like ROE, P/E, debt ratios, and more.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background: var(--bullish-dim);">📰</div>
            <h3>Real-Time News</h3>
            <p>Latest news from Google News with sentiment analysis. Stay informed about market-moving events affecting your stocks.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background: var(--accent-purple-dim);">🤖</div>
            <h3>AI-Powered Analysis</h3>
            <p>Gemini AI reviews financials for manipulation red flags, assesses business quality, and provides an overall investment verdict.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background: var(--warning-dim);">📈</div>
            <h3>Chart Prediction</h3>
            <p>Upload candlestick chart screenshots and get AI-powered pattern recognition, support/resistance levels, and direction predictions.</p>
          </div>
        </div>
      </section>

      <div class="disclaimer">
        ⚠️ Disclaimer: All analysis is for educational/informational purposes only and does not constitute financial advice. Always do your own research before investing.
      </div>
    </div>
  `;

  // Render popular stocks grid
  const popularGrid = document.getElementById('popular-grid');
  POPULAR_STOCKS.forEach(stock => {
    const card = document.createElement('div');
    card.className = 'popular-card';
    card.innerHTML = `
      <div class="popular-card-symbol">${stock.symbol}</div>
      <div class="popular-card-name">${stock.name}</div>
    `;
    card.addEventListener('click', () => navigateTo(`/stock/${stock.symbol}`));
    popularGrid.appendChild(card);
  });

  // Search functionality
  const searchInput = document.getElementById('stock-search');
  const dropdown = document.getElementById('search-dropdown');
  let selectedIndex = -1;

  const doSearch = debounce(async (query) => {
    if (!query || query.length < 1) {
      dropdown.classList.remove('active');
      return;
    }

    dropdown.innerHTML = '<div class="search-loading"><div class="loading-spinner"></div></div>';
    dropdown.classList.add('active');

    try {
      const results = await searchStocks(query);
      if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-loading">No stocks found</div>';
        return;
      }

      selectedIndex = -1;
      dropdown.innerHTML = results.map((stock, i) => `
        <div class="search-item" data-symbol="${stock.symbol}" data-index="${i}">
          <div class="search-item-left">
            <span class="search-item-symbol">${stock.symbol}</span>
            <span class="search-item-name">${stock.name}</span>
          </div>
          <span class="search-item-sector">${stock.sector || ''}</span>
        </div>
      `).join('');

      dropdown.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          const sym = item.getAttribute('data-symbol');
          navigateTo(`/stock/${sym}`);
        });
      });
    } catch (err) {
      dropdown.innerHTML = '<div class="search-loading">Search error. Is the server running?</div>';
    }
  }, 250);

  searchInput.addEventListener('input', (e) => doSearch(e.target.value.trim()));

  searchInput.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.search-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
      const sym = items[selectedIndex].getAttribute('data-symbol');
      navigateTo(`/stock/${sym}`);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-container')) {
      dropdown.classList.remove('active');
    }
  });

  // Nav
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('/settings'));
  document.getElementById('nav-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('/');
  });

  // Focus search
  setTimeout(() => searchInput.focus(), 300);
}

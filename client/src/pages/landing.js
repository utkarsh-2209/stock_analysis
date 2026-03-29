import { searchStocks, predictChart } from '../services/api.js';
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

        </div>
      </section>

      <section class="landing-prediction-section fade-in-up">
        <div class="panel prediction-panel">
          <div class="panel-header">
            <span class="panel-title">🔮 Instant AI Chart Analysis</span>
          </div>
          <div class="panel-body">
            <div class="prediction-container-flex">
              <div class="prediction-upload-box">
                <div class="upload-zone" id="upload-zone">
                  <input type="file" accept="image/*" id="chart-upload">
                  <div class="upload-zone-icon">📸</div>
                  <div class="upload-zone-text">
                    <strong>Upload Chart Screenshot</strong><br>
                    Drop your TradingView or chart image here
                  </div>
                </div>
                <div id="chart-preview" style="display:none; margin-top: 12px;">
                  <img id="chart-preview-img" style="width:100%; border-radius: 8px; border: 1px solid var(--border-subtle);" />
                  <button class="btn btn-primary" id="predict-btn" style="margin-top: 12px; width: 100%;">
                    🔮 Analyze with AI
                  </button>
                </div>
                <div id="prediction-loading" style="display:none;" class="page-loading">
                  <div class="loading-spinner"></div>
                  <div class="page-loading-text">Analyzing patterns...</div>
                </div>
              </div>
              <div class="prediction-result-box">
                <div class="prediction-result" id="prediction-result">
                  <div class="prediction-placeholder">
                    Analysis results will appear here after you upload and analyze a chart.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

  // Setup Chart Prediction
  setupChartUpload();

  // Focus search
  setTimeout(() => searchInput.focus(), 300);
}

function setupChartUpload() {
  const uploadInput = document.getElementById('chart-upload');
  const preview = document.getElementById('chart-preview');
  const previewImg = document.getElementById('chart-preview-img');
  const predictBtn = document.getElementById('predict-btn');
  const predictionLoading = document.getElementById('prediction-loading');
  const predictionResult = document.getElementById('prediction-result');

  let base64Image = null;

  uploadInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      base64Image = ev.target.result;
      previewImg.src = base64Image;
      preview.style.display = 'block';
      document.getElementById('upload-zone').style.display = 'none';
      predictionResult.classList.remove('active');
    };
    reader.readAsDataURL(file);
  });

  predictBtn?.addEventListener('click', async () => {
    if (!base64Image) return;

    predictBtn.style.display = 'none';
    predictionLoading.style.display = 'flex';
    predictionResult.innerHTML = '';

    try {
      const prediction = await predictChart(base64Image, 'General Indian Stock Chart Analysis');
      renderPrediction(prediction);
    } catch (err) {
      predictionResult.innerHTML = `<div style="color:var(--bearish); padding:12px;">${err.message}</div>`;
      predictionResult.classList.add('active');
    } finally {
      predictionLoading.style.display = 'none';
      predictBtn.style.display = 'block';
    }
  });
}

function renderPrediction(prediction) {
  const result = document.getElementById('prediction-result');
  const direction = (prediction.prediction || '').toLowerCase();
  const arrowMap = { bullish: '📈', bearish: '📉', neutral: '➡️' };
  const arrow = arrowMap[direction] || '🔄';

  result.innerHTML = `
    <div class="prediction-direction ${direction}">
      <span class="prediction-arrow">${arrow}</span>
      <div>
        <div class="prediction-label">${prediction.prediction || 'N/A'}</div>
        <div style="font-size:12px; color:var(--text-secondary);">${prediction.pattern || ''}</div>
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <div style="display:flex; justify-content: space-between; font-size:12px; color:var(--text-muted); margin-bottom:4px;">
        <span>Confidence</span>
        <span style="color:var(--text-primary); font-weight:600;">${prediction.confidence || 0}%</span>
      </div>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${prediction.confidence || 0}%"></div>
      </div>
    </div>

    <p style="font-size:13px; color:var(--text-secondary); line-height:1.7; margin-bottom:14px;">
      ${prediction.summary || ''}
    </p>

    <div class="prediction-details">
      <div class="prediction-detail-item">
        <div class="prediction-detail-label">Trend</div>
        <div class="prediction-detail-value">${prediction.trend || 'N/A'}</div>
      </div>
      <div class="prediction-detail-item">
        <div class="prediction-detail-label">Timeframe</div>
        <div class="prediction-detail-value">${prediction.timeframe || 'N/A'}</div>
      </div>
      <div class="prediction-detail-item">
        <div class="prediction-detail-label">Support</div>
        <div class="prediction-detail-value">${(prediction.supportLevels || []).join(', ') || 'N/A'}</div>
      </div>
      <div class="prediction-detail-item">
        <div class="prediction-detail-label">Resistance</div>
        <div class="prediction-detail-value">${(prediction.resistanceLevels || []).join(', ') || 'N/A'}</div>
      </div>
    </div>

    ${prediction.keyObservations?.length ? `
      <div style="margin-top: 14px;">
        <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Key Observations</div>
        <ul class="analysis-points">
          ${prediction.keyObservations.map(o => `<li>${o}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div style="margin-top: 12px; padding: 10px 12px; background:rgba(255,255,255,0.02); border-radius:6px;">
      <div class="prediction-detail-label">Risk/Reward</div>
      <div style="font-size:13px; color:var(--text-primary); margin-top:4px;">${prediction.riskReward || 'N/A'}</div>
    </div>
  `;

  result.classList.add('active');
}

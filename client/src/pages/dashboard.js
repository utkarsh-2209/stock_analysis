import { fetchStockData, fetchStockHistory, fetchNews, analyzeStock, predictChart, getApiKey } from '../services/api.js';
import { formatCurrency, formatLargeNumber, formatPercent, formatNumber, formatChangePercent, timeAgo, getScoreColor } from '../utils/formatters.js';

let currentStockData = null;
let currentNews = null;
let currentAnalysis = null;

export function renderDashboard(container, symbol, navigateTo) {
  container.innerHTML = `
    <div class="bg-gradient"></div>
    <nav class="navbar">
      <a class="navbar-brand" href="#/" id="nav-home">
        <div class="logo-icon">📊</div>
        <span class="logo-text">StockLens</span>
      </a>
      <div class="navbar-actions">
        <button class="nav-btn" id="nav-back">← Back to Search</button>
        <button class="nav-btn" id="nav-settings">⚙️ Settings</button>
      </div>
    </nav>

    <div class="dashboard-page">
      <div class="stock-header" id="stock-header">
        <div class="stock-header-inner">
          <div class="stock-title-group">
            <span class="stock-name" id="stock-name">Loading...</span>
            <span class="stock-symbol-badge" id="stock-symbol">${symbol}</span>
            <span class="stock-exchange-badge">NSE</span>
          </div>
          <div class="stock-price-group" style="display:flex; flex-direction:column; align-items:flex-end;">
            <div style="display:flex; align-items:baseline; gap:12px;">
              <span class="stock-price" id="stock-price">—</span>
              <span class="stock-change" id="stock-change">—</span>
            </div>
            <div class="timeline-controls" id="timeline-controls" style="display:flex; gap:6px; margin-top:8px; opacity:0; transition:opacity 0.3s;">
              <button class="timeline-btn active" data-range="1d">1D</button>
              <button class="timeline-btn" data-range="1mo">1M</button>
              <button class="timeline-btn" data-range="6mo">6M</button>
              <button class="timeline-btn" data-range="ytd">YTD</button>
              <button class="timeline-btn" data-range="1y">1Y</button>
              <button class="timeline-btn" data-range="5y">5Y</button>
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- LEFT COLUMN -->
        <div class="left-column">
          <!-- TradingView Chart -->
          <div class="panel chart-panel">
            <div class="panel-header">
              <span class="panel-title">📈 Live Chart</span>
              <div class="chart-controls">
                <button class="chart-btn" data-interval="5" id="chart-5m">5m</button>
                <button class="chart-btn active" data-interval="15" id="chart-15m">15m</button>
                <button class="chart-btn" data-interval="D" id="chart-1d">1D</button>
                <button class="chart-btn" data-interval="W" id="chart-1w">1W</button>
              </div>
            </div>
            <div class="panel-body">
              <div class="tradingview-widget-container" id="tv-chart"></div>
            </div>
          </div>


          <!-- AI Analysis -->
          <div class="panel" style="margin-top: 20px;" id="analysis-panel">
            <div class="panel-header" style="border-bottom: none; padding-bottom: 0;">
              <span class="panel-title">🤖 AI Analysis</span>
            </div>
            <div class="analysis-tabs" id="analysis-tabs">
              <button class="analysis-tab active" data-tab="quality">Quality</button>
              <button class="analysis-tab" data-tab="valuation">Valuation</button>
              <button class="analysis-tab" data-tab="financial">Financial</button>
              <button class="analysis-tab" data-tab="manipulation">Manipulation</button>
              <button class="analysis-tab" data-tab="sentiment">Sentiment</button>
            </div>
            <div class="analysis-content" id="analysis-content">
              <div class="page-loading" id="analysis-loading">
                <div class="loading-spinner"></div>
                <div class="page-loading-text">Generating AI analysis...</div>
              </div>
            </div>
            <div class="overall-rating" id="overall-rating" style="display:none;"></div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="right-column">
          <!-- Scores -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">🎯 Scores</span>
            </div>
            <div class="panel-body">
              <div class="scores-grid" id="scores-grid">
                ${renderScoreCard('Quality', 0, '#4f8fff')}
                ${renderScoreCard('Valuation', 0, '#8b5cf6')}
                ${renderScoreCard('Health', 0, '#22d3ee')}
              </div>
            </div>
          </div>

          <!-- Key Metrics -->
          <div class="panel" style="margin-top: 16px;">
            <div class="panel-header">
              <span class="panel-title">📊 Key Metrics</span>
            </div>
            <div class="panel-body">
              <div class="metrics-grid" id="metrics-grid">
                ${Array(8).fill('<div class="metric-item"><span class="metric-label skeleton" style="width:60px;height:14px;display:inline-block;"></span><span class="metric-value skeleton" style="width:50px;height:14px;display:inline-block;"></span></div>').join('')}
              </div>
            </div>
          </div>

          <!-- News -->
          <div class="panel" style="margin-top: 16px;">
            <div class="panel-header">
              <span class="panel-title">📰 Latest News</span>
            </div>
            <div class="panel-body">
              <div class="news-list" id="news-list">
                <div class="page-loading">
                  <div class="loading-spinner"></div>
                  <div class="page-loading-text">Fetching news...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="disclaimer">
        ⚠️ Disclaimer: All analysis is AI-generated for educational purposes only. This does not constitute financial advice. Always consult a qualified financial advisor.
      </div>
    </div>
  `;

  // Nav events
  document.getElementById('nav-back')?.addEventListener('click', () => navigateTo('/'));
  document.getElementById('nav-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('/');
  });
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('/settings'));

  // Chart interval buttons
  document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTradingViewChart(symbol, btn.dataset.interval);
    });
  });


  // Analysis tabs
  setupAnalysisTabs();

  // Timeline buttons
  setupTimeline(symbol);

  // Load everything
  loadAllData(symbol);
}

async function loadAllData(symbol) {
  // Load TradingView chart immediately
  loadTradingViewChart(symbol, '15');

  // Load stock data and news in parallel
  const stockPromise = fetchStockData(symbol).catch(err => {
    console.error('Stock data error:', err);
    return null;
  });

  // Use symbol name for news while stock data loads
  const newsPromise = fetchNews(symbol.replace('.NS', '')).catch(err => {
    console.error('News error:', err);
    return null;
  });

  // Wait for stock data
  currentStockData = await stockPromise;

  if (currentStockData) {
    renderStockHeader(currentStockData);
    renderScores(currentStockData);
    renderMetrics(currentStockData);

    // Re-fetch news with proper company name if needed
    if (currentStockData.longName && currentStockData.longName !== symbol) {
      fetchNews(currentStockData.longName).then(news => {
        if (news?.articles?.length) {
          currentNews = news;
          renderNews(currentNews);
        }
      }).catch(() => {});
    }
  } else {
    document.getElementById('stock-name').textContent = symbol;
    document.getElementById('stock-price').textContent = 'Data temporarily unavailable';
    document.getElementById('stock-change').textContent = 'Yahoo Finance may be rate-limited. Try again in a moment.';
    document.getElementById('stock-change').className = 'stock-change';

    // Show placeholder metrics
    const grid = document.getElementById('metrics-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:20px;">Stock data unavailable. Yahoo Finance may be rate-limited. Please refresh in a few seconds.</div>';
  }

  // Wait for news
  currentNews = currentNews || await newsPromise;
  if (currentNews) {
    renderNews(currentNews);
  } else {
    document.getElementById('news-list').innerHTML = '<div class="search-loading">Failed to load news</div>';
  }

  // Load AI analysis (only if we have some data to analyze)
  if (getApiKey()) {
    if (currentStockData || currentNews) {
      try {
        currentAnalysis = await analyzeStock(currentStockData || { symbol, longName: symbol }, currentNews);
        renderAnalysis(currentAnalysis);
      } catch (err) {
        document.getElementById('analysis-content').innerHTML =
          `<div class="search-loading" style="color: var(--bearish);">
            ${err.message || 'AI analysis failed. Check your API key in Settings.'}
          </div>`;
      }
    } else {
      document.getElementById('analysis-content').innerHTML =
        `<div class="search-loading" style="color: var(--warning);">
          Cannot generate AI analysis without stock data. Please try again.
        </div>`;
    }
  } else {
    document.getElementById('analysis-content').innerHTML =
      `<div class="search-loading">
        Please add your Gemini API key in <a href="#/settings" style="color:var(--accent-blue)">Settings</a> to enable AI analysis.
      </div>`;
  }
}

function renderStockHeader(data) {
  document.getElementById('stock-name').textContent = data.shortName || data.longName;
  document.getElementById('stock-symbol').textContent = data.symbol;
  document.getElementById('stock-price').textContent = formatCurrency(data.currentPrice);

  const changeEl = document.getElementById('stock-change');
  const changePct = data.changePercent || 0;
  const change = data.change || 0;
  changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${formatChangePercent(changePct)})`;
  changeEl.className = `stock-change ${change >= 0 ? 'positive' : 'negative'}`;

  // Reveal timeline controls once we have the initial data
  document.getElementById('timeline-controls').style.opacity = '1';
}

function updatePriceWithHistory(historyData, range) {
  if (!currentStockData || !historyData) return;
  if (range !== '1d' && (!historyData.history || historyData.history.length === 0)) return;

  const currentPrice = currentStockData.currentPrice;
  let oldPrice;
  
  if (range === '1d') {
    oldPrice = currentStockData.previousClose;
  } else {
    // Get the earliest close in the requested range history
    oldPrice = historyData.history[0].close;
  }

  if (oldPrice && currentPrice) {
    const change = currentPrice - oldPrice;
    const changePercent = (change / oldPrice) * 100;

    const changeEl = document.getElementById('stock-change');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${formatChangePercent(changePercent)})`;
    changeEl.className = `stock-change ${change >= 0 ? 'positive' : 'negative'}`;
  }
}

function setupTimeline(symbol) {
  document.querySelectorAll('.timeline-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Manage active state
      document.querySelectorAll('.timeline-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const range = btn.dataset.range;
      
      // Give immediate loading feedback
      const changeEl = document.getElementById('stock-change');
      changeEl.style.opacity = '0.5';

      try {
        if (range === '1d') {
          // 1D doesn't strictly need history fetch, we can just revert to currentStockData info if available
          updatePriceWithHistory({ history: [] }, '1d');
        } else {
          const historyData = await fetchStockHistory(symbol, range);
          updatePriceWithHistory(historyData, range);
        }
      } catch (e) {
        console.error('Timeline fetch error:', e);
      } finally {
        changeEl.style.opacity = '1';
      }
    });
  });
}

function renderScoreCard(label, score, color) {
  const circumference = 2 * Math.PI * 30;
  return `
    <div class="score-card" data-score-label="${label.toLowerCase()}">
      <div class="score-circle">
        <svg viewBox="0 0 72 72">
          <circle class="bg" cx="36" cy="36" r="30" />
          <circle class="progress" cx="36" cy="36" r="30"
            stroke="${color}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}" />
        </svg>
        <div class="score-value" style="color:${color}">0</div>
      </div>
      <div class="score-label">${label}</div>
    </div>
  `;
}

function renderScores(data) {
  const scores = {
    quality: data.qualityScore || 0,
    valuation: data.valuationScore || 0,
    health: data.financialHealthScore || 0
  };

  Object.entries(scores).forEach(([key, score]) => {
    const card = document.querySelector(`[data-score-label="${key}"]`);
    if (!card) return;

    const circumference = 2 * Math.PI * 30;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);

    const circle = card.querySelector('.progress');
    const valueEl = card.querySelector('.score-value');

    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
      circle.setAttribute('stroke', color);
      valueEl.style.color = color;

      // Animate number
      let current = 0;
      const step = score / 30;
      const interval = setInterval(() => {
        current += step;
        if (current >= score) {
          current = score;
          clearInterval(interval);
        }
        valueEl.textContent = Math.round(current);
      }, 30);
    }, 300);
  });
}

function renderMetrics(data) {
  const grid = document.getElementById('metrics-grid');
  const metrics = [
    { label: 'P/E Ratio', value: formatNumber(data.pe) },
    { label: 'EPS', value: formatCurrency(data.eps) },
    { label: 'Market Cap', value: formatLargeNumber(data.marketCap) },
    { label: 'Book Value', value: formatCurrency(data.bookValue) },
    { label: 'ROE', value: formatPercent(data.roe) },
    { label: 'D/E Ratio', value: formatNumber(data.debtToEquity) },
    { label: 'Div Yield', value: formatPercent(data.dividendYield) },
    { label: '52W High', value: formatCurrency(data.fiftyTwoWeekHigh) },
    { label: '52W Low', value: formatCurrency(data.fiftyTwoWeekLow) },
    { label: 'Revenue Growth', value: formatPercent(data.revenueGrowth) },
    { label: 'Profit Margin', value: formatPercent(data.profitMargin) },
    { label: 'Op. Margin', value: formatPercent(data.operatingMargin) },
    { label: 'Current Ratio', value: formatNumber(data.currentRatio) },
    { label: 'Free Cashflow', value: formatLargeNumber(data.freeCashflow) },
  ];

  grid.innerHTML = metrics.map(m => `
    <div class="metric-item">
      <span class="metric-label">${m.label}</span>
      <span class="metric-value">${m.value}</span>
    </div>
  `).join('');
}

function loadTradingViewChart(symbol, interval) {
  const chartContainer = document.getElementById('tv-chart');
  chartContainer.innerHTML = '';

  // Use BSE index if possible to avoid Apple fallback on certain symbols
  const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
  const tradingViewSymbol = `BSE:${cleanSymbol}`;

  const script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.innerHTML = JSON.stringify({
    height: 600,
    symbol: tradingViewSymbol,
    interval: interval,
    timezone: 'Asia/Kolkata',
    theme: 'dark',
    style: '1',
    locale: 'en',
    backgroundColor: 'rgba(12, 16, 32, 1)',
    gridColor: 'rgba(255, 255, 255, 0.04)',
    allow_symbol_change: true,
    calendar: false,
    support_host: 'https://www.tradingview.com',
    hide_volume: false,
    enable_publishing: false,
  });

  const widgetDiv = document.createElement('div');
  widgetDiv.className = 'tradingview-widget-container__widget';
  widgetDiv.style.height = 'calc(100% - 32px)';
  widgetDiv.style.width = '100%';

  chartContainer.appendChild(widgetDiv);
  chartContainer.appendChild(script);
}

function renderNews(newsData) {
  const list = document.getElementById('news-list');
  if (!newsData?.articles?.length) {
    list.innerHTML = '<div class="search-loading">No recent news found</div>';
    return;
  }

  list.innerHTML = newsData.articles.map(article => `
    <a href="${article.link}" target="_blank" rel="noopener" class="news-item">
      <div class="news-item-header">
        <span class="news-source">${article.source}</span>
        <span class="news-time">${timeAgo(article.pubDate)}</span>
      </div>
      <div class="news-title">${article.title}</div>
    </a>
  `).join('');
}

function setupAnalysisTabs() {
  document.getElementById('analysis-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.analysis-tab');
    if (!tab) return;

    document.querySelectorAll('.analysis-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const tabName = tab.dataset.tab;
    document.querySelectorAll('.analysis-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`pane-${tabName}`)?.classList.add('active');
  });
}

function renderAnalysis(analysis) {
  const content = document.getElementById('analysis-content');

  const panes = {
    quality: analysis.qualityReview,
    valuation: analysis.valuationReview,
    financial: analysis.financialHealth,
    manipulation: analysis.manipulationInsights,
    sentiment: analysis.newsSentiment,
  };

  content.innerHTML = Object.entries(panes).map(([key, data]) => {
    if (!data) return '';
    const rating = data.rating || data.overall || data.riskLevel || '';
    const ratingClass = rating.toLowerCase().replace(/\s/g, '');
    const points = data.points || data.redFlags || data.keyThemes || [];
    const watchFor = data.watchFor || [];

    return `
      <div class="analysis-pane ${key === 'quality' ? 'active' : ''}" id="pane-${key}">
        <div class="analysis-rating ${ratingClass}">${rating}</div>
        <p class="analysis-summary">${data.summary || ''}</p>
        ${points.length ? `
          <ul class="analysis-points">
            ${points.map(p => `<li>${p}</li>`).join('')}
          </ul>
        ` : ''}
        ${watchFor.length ? `
          <h4 style="margin-top:14px; font-size:13px; color:var(--text-muted); margin-bottom:8px;">⚠️ Watch For:</h4>
          <ul class="analysis-points">
            ${watchFor.map(w => `<li>${w}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }).join('');

  // Overall rating
  const overall = analysis.overallRating;
  if (overall) {
    const ratingEl = document.getElementById('overall-rating');
    ratingEl.style.display = 'block';
    const verdictClass = (overall.verdict || '').toLowerCase();
    const scoreColor = overall.score >= 7 ? 'var(--bullish)' :
      overall.score >= 4 ? 'var(--accent-blue)' : 'var(--bearish)';

    ratingEl.innerHTML = `
      <div class="overall-score">
        <div class="overall-score-number" style="color:${scoreColor}">${overall.score}/10</div>
        <div>
          <div class="overall-score-label">Overall Rating</div>
          <div class="overall-verdict ${verdictClass}">${overall.verdict || 'N/A'}</div>
        </div>
      </div>
      <p class="overall-summary">${overall.summary || ''}</p>
    `;
  }
}


import { getApiKey, setApiKey, testApiKey } from '../services/api.js';

export function renderSettings(container, navigateTo) {
  const currentKey = getApiKey();
  const masked = currentKey ? currentKey.slice(0, 10) + '•'.repeat(20) + currentKey.slice(-4) : '';

  container.innerHTML = `
    <div class="bg-gradient"></div>
    <nav class="navbar">
      <a class="navbar-brand" href="#/" id="nav-home">
        <div class="logo-icon">📊</div>
        <span class="logo-text">StockLens</span>
      </a>
      <div class="navbar-actions">
        <button class="nav-btn" id="nav-back">← Back</button>
      </div>
    </nav>

    <div class="settings-page">
      <div class="settings-container fade-in-up">
        <h1 class="settings-title">⚙️ Settings</h1>
        <p class="settings-subtitle">Configure your API keys and preferences</p>

        <div class="settings-group">
          <label class="settings-label" for="api-key-input">Gemini API Key</label>
          <input
            type="password"
            class="settings-input"
            id="api-key-input"
            placeholder="Enter your Gemini API key"
            value="${currentKey}"
          >
          <p class="settings-hint">
            Get your free API key from
            <a href="https://aistudio.google.com" target="_blank">Google AI Studio</a>.
            This key is stored locally in your browser and never shared.
          </p>
          <div class="btn-group">
            <button class="btn btn-primary" id="save-key-btn">💾 Save Key</button>
            <button class="btn btn-secondary" id="test-key-btn">🧪 Test Connection</button>
          </div>
          <div class="status-message" id="key-status"></div>
        </div>

        <div class="settings-group" style="margin-top: 40px;">
          <label class="settings-label">About StockLens</label>
          <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.8;">
            <p>StockLens is an AI-powered Indian stock market analysis tool that provides:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Quality, Valuation & Financial Health scores</li>
              <li>Real-time news from Google News</li>
              <li>AI-generated analysis via Google Gemini</li>
              <li>TradingView interactive charts (candlestick)</li>
              <li>Chart pattern prediction from screenshots</li>
              <li>Manipulation risk assessment</li>
            </ul>
            <p style="color: var(--warning); margin-top: 10px;">
              ⚠️ All AI analysis is for educational purposes only and does not constitute financial advice.
            </p>
          </div>
        </div>

        ${currentKey ? `
          <div class="settings-group" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-subtle);">
            <label class="settings-label" style="color: var(--bearish);">Danger Zone</label>
            <button class="btn btn-secondary" id="clear-key-btn" style="border-color: rgba(255,23,68,0.3); color: var(--bearish);">
              🗑️ Remove API Key
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Nav
  document.getElementById('nav-back')?.addEventListener('click', () => navigateTo('/'));
  document.getElementById('nav-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('/');
  });

  const keyInput = document.getElementById('api-key-input');
  const statusEl = document.getElementById('key-status');

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status-message active ${type}`;
  }

  // Save key
  document.getElementById('save-key-btn')?.addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (!key) {
      showStatus('Please enter an API key.', 'error');
      return;
    }
    setApiKey(key);
    showStatus('API key saved successfully! ✅', 'success');
  });

  // Test key
  document.getElementById('test-key-btn')?.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) {
      showStatus('Please enter an API key first.', 'error');
      return;
    }

    showStatus('Testing connection...', 'success');

    try {
      const result = await testApiKey(key);
      showStatus(result.message, result.valid ? 'success' : 'error');
    } catch (err) {
      showStatus('Test failed: ' + err.message, 'error');
    }
  });

  // Clear key
  document.getElementById('clear-key-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove your API key?')) {
      setApiKey('');
      keyInput.value = '';
      showStatus('API key removed.', 'success');
    }
  });
}

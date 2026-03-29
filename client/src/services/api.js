const API_BASE = '/api';

export function getApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('gemini_api_key', key);
}

async function handleResponse(res) {
  const contentType = res.headers.get('content-type');
  let data = null;
  
  try {
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (text) {
        try {
           data = JSON.parse(text);
        } catch {
           data = { error: text };
        }
      }
    }
  } catch (e) {
    data = { error: 'Invalid or empty response from server.' };
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed: ${res.status} ${res.statusText}`);
  }
  return data || {};
}

export async function searchStocks(query) {
  if (!query || query.length < 1) return [];
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  return handleResponse(res);
}

export async function fetchStockData(symbol) {
  const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(symbol)}`);
  return handleResponse(res);
}

export async function fetchStockHistory(symbol, range = '1mo') {
  const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(symbol)}/history?range=${range}`);
  return handleResponse(res);
}

export async function fetchNews(stockName) {
  const res = await fetch(`${API_BASE}/news/${encodeURIComponent(stockName)}`);
  return handleResponse(res);
}

export async function analyzeStock(stockData, news) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Please add your Gemini API key in Settings first.');
  }
  const res = await fetch(`${API_BASE}/analysis/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stockData, news, apiKey })
  });
  return handleResponse(res);
}

export async function predictChart(imageBase64, stockContext) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Please add your Gemini API key in Settings first.');
  }
  const res = await fetch(`${API_BASE}/analysis/predict-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, stockContext, apiKey })
  });
  return handleResponse(res);
}

export async function testApiKey(apiKey) {
  const res = await fetch(`${API_BASE}/analysis/test-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  });
  return handleResponse(res);
}

export async function fetchBenchmarks() {
  const res = await fetch(`${API_BASE}/stock/benchmarks`);
  return handleResponse(res);
}

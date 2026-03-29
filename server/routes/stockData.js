import express from 'express';
import YahooFinance from 'yahoo-finance2';

const router = express.Router();
const yahooFinance = new YahooFinance();

// Scrape Google Finance for stock data (reliable, no auth needed)
async function fetchGoogleFinance(symbol) {
  const url = `https://www.google.com/finance/quote/${symbol}:NSE`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`Google Finance error: ${res.status}`);
  return await res.text();
}

function extractValue(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : null;
}

function parseGoogleFinanceHTML(html, symbol) {
  // Extract price - Google Finance has data in specific patterns
  const data = {};

  // Company name — look for the title tag: "Stock Name (NSE: SYMBOL) Stock Price..."
  const titleMatch = html.match(/<title>([^(]+)\s*\(NSE/);
  data.longName = titleMatch ? titleMatch[1].trim() : symbol;
  data.shortName = data.longName;

  // Current price - look for the main price class
  const priceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>[^\d]*([\d,.]+)/);
  if (priceMatch) {
    data.currentPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
  } else {
    // Fallback if class changes
    const altPriceMatch = html.match(/data-last-price="([^"]+)"/);
    data.currentPrice = altPriceMatch ? parseFloat(altPriceMatch[1]) : null;
  }

  // Change and change percent
  const changeMatch = html.match(/data-currency-code="INR"[^>]*>([^<]*)<\/span>\s*<span[^>]*>([^<]*)<\/span>/);

  // Previous close - accommodate currency symbols like ₹
  const prevCloseMatch = html.match(/Previous close[\s\S]*?>[^\d]*([\d,.]+)</);
  data.previousClose = prevCloseMatch ? parseFloat(prevCloseMatch[1].replace(/,/g, '')) : null;

  // Calculate change from current and previous
  if (data.currentPrice && data.previousClose) {
    data.change = data.currentPrice - data.previousClose;
    data.changePercent = (data.change / data.previousClose) * 100;
  }

  // Day range
  const dayRangeMatch = html.match(/Day range[\s\S]*?>([\d,.]+)\s*-\s*([\d,.]+)/);
  if (dayRangeMatch) {
    data.dayLow = parseFloat(dayRangeMatch[1].replace(/,/g, ''));
    data.dayHigh = parseFloat(dayRangeMatch[2].replace(/,/g, ''));
  }

  // Year range (52 week)
  const yearRangeMatch = html.match(/Year range[\s\S]*?>([\d,.]+)\s*-\s*([\d,.]+)/);
  if (yearRangeMatch) {
    data.fiftyTwoWeekLow = parseFloat(yearRangeMatch[1].replace(/,/g, ''));
    data.fiftyTwoWeekHigh = parseFloat(yearRangeMatch[2].replace(/,/g, ''));
  }

  // Market cap
  const mktCapMatch = html.match(/Market cap[\s\S]*?>([\d,.]+[TBMK]?)\s*(INR|USD)?/);
  if (mktCapMatch) {
    let mcStr = mktCapMatch[1].replace(/,/g, '');
    let mc = parseFloat(mcStr);
    if (mcStr.endsWith('T')) mc *= 1e12;
    else if (mcStr.endsWith('B')) mc *= 1e9;
    else if (mcStr.endsWith('M')) mc *= 1e6;
    else if (mcStr.endsWith('K')) mc *= 1e3;
    data.marketCap = mc;
  }

  // P/E ratio
  const peMatch = html.match(/P\/E ratio[\s\S]*?>([\d,.]+)/);
  data.pe = peMatch ? parseFloat(peMatch[1].replace(/,/g, '')) : null;

  // Dividend yield
  const divMatch = html.match(/Dividend yield[\s\S]*?>([\d,.]+)%/);
  data.dividendYield = divMatch ? parseFloat(divMatch[1]) / 100 : null;

  // EPS
  const epsMatch = html.match(/Earnings per share[\s\S]*?>([\d,.]+)/);
  data.eps = epsMatch ? parseFloat(epsMatch[1].replace(/,/g, '')) : null;

  // Volume
  const volMatch = html.match(/Avg Volume[\s\S]*?>([\d,.]+[MK]?)/);
  if (volMatch) {
    let v = volMatch[1].replace(/,/g, '');
    data.avgVolume = parseFloat(v);
    if (v.endsWith('M')) data.avgVolume *= 1e6;
    if (v.endsWith('K')) data.avgVolume *= 1e3;
  }

  // Revenue
  const revMatch = html.match(/Revenue[\s\S]*?>([\d,.]+[TBMK]?)\s*(INR|USD)?/);
  if (revMatch) {
    let revStr = revMatch[1].replace(/,/g, '');
    let rev = parseFloat(revStr);
    if (revStr.endsWith('T')) rev *= 1e12;
    else if (revStr.endsWith('B')) rev *= 1e9;
    else if (revStr.endsWith('M')) rev *= 1e6;
    data.totalRevenue = rev;
  }

  // Open price
  const openMatch = html.match(/Open[\s\S]*?>([\d,.]+)/);
  data.open = openMatch ? parseFloat(openMatch[1].replace(/,/g, '')) : null;

  return data;
}

// Fetch full financial metrics from Yahoo Finance via the library
async function fetchYahooV8(symbol) {
  const yahooSymbol = `${symbol}.NS`;
  try {
    const summary = await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail', 'price']
    });

    const fd = summary.financialData || {};
    const dks = summary.defaultKeyStatistics || {};
    const sd = summary.summaryDetail || {};
    const price = summary.price || {};

    return {
      currentPrice: price.regularMarketPrice,
      previousClose: price.regularMarketPreviousClose,
      currency: price.currency,
      exchange: price.exchangeName,
      shortName: price.shortName || price.symbol,
      
      roe: fd.returnOnEquity,
      roa: fd.returnOnAssets,
      debtToEquity: fd.debtToEquity,
      currentRatio: fd.currentRatio,
      quickRatio: fd.quickRatio,
      operatingMargin: fd.operatingMargins,
      profitMargin: fd.profitMargins,
      revenueGrowth: fd.revenueGrowth,
      earningsGrowth: fd.earningsGrowth,
      grossMargin: fd.grossMargins,
      freeCashflow: fd.freeCashflow,
      operatingCashflow: fd.operatingCashflow,
      totalRevenue: fd.totalRevenue,
      totalDebt: fd.totalDebt,
      totalCash: fd.totalCash,

      bookValue: dks.bookValue,
      priceToBook: dks.priceToBook,
      beta: dks.beta,
      forwardPe: dks.forwardPE,

      fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: sd.fiftyTwoWeekLow,
      fiftyDayAverage: sd.fiftyDayAverage,
      twoHundredDayAverage: sd.twoHundredDayAverage,
      dividendYield: sd.dividendYield || dks.yield,
      dividendRate: sd.dividendRate,
      pe: sd.trailingPE || price.regularMarketPrice / dks.trailingEps,
      eps: dks.trailingEps || sd.trailingEps,
      marketCap: price.marketCap
    };
  } catch (err) {
    console.error(`Yahoo Finance fetch failed for ${yahooSymbol}:`, err.message);
    return null;
  }
}

// Simple function to fetch stock info from multiple sources
async function getStockData(symbol) {
  // Try Google Finance first (most reliable)
  let googleData = null;
  try {
    const html = await fetchGoogleFinance(symbol);
    googleData = parseGoogleFinanceHTML(html, symbol);
  } catch (e) {
    console.warn('Google Finance failed:', e.message);
  }

  // Try Yahoo v8 as supplement
  let yahooData = null;
  try {
    yahooData = await fetchYahooV8(symbol);
  } catch (e) {
    console.warn('Yahoo v8 failed:', e.message);
  }

  // Merge data (Google secondary, Yahoo primary because it has more fields)
  const merged = {
    ...googleData,
    ...yahooData, // Prefer Yahoo structured data
    currentPrice: yahooData?.currentPrice || googleData?.currentPrice,
    previousClose: yahooData?.previousClose || googleData?.previousClose,
    pe: yahooData?.pe || googleData?.pe,
    eps: yahooData?.eps || googleData?.eps,
    marketCap: yahooData?.marketCap || googleData?.marketCap,
    dividendYield: yahooData?.dividendYield || googleData?.dividendYield,
    fiftyTwoWeekHigh: yahooData?.fiftyTwoWeekHigh || googleData?.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: yahooData?.fiftyTwoWeekLow || googleData?.fiftyTwoWeekLow,
  };

  // Always recalculate change using the final, merged validated values
  if (merged.currentPrice && merged.previousClose) {
    merged.change = merged.currentPrice - merged.previousClose;
    merged.changePercent = (merged.change / merged.previousClose) * 100;
  }

  // Calculate missing standard metrics if possible
  if (!merged.roe && merged.eps && merged.bookValue && merged.bookValue !== 0) {
    // ROE = EPS / Book Value Per Share
    merged.roe = merged.eps / merged.bookValue;
  }

  return merged;
}

router.get('/:symbol/history', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase().replace('.NS', '').replace('.BO', '');
    const { range = '1mo' } = req.query;
    
    // Determine interval based on range
    let interval = '1d';
    if (range === '1d' || range === '5d') interval = '15m'; // intraday for short ranges
    if (range === '1mo' || range === '6mo' || range === 'ytd' || range === '1y') interval = '1d';
    if (range === '5y') interval = '1wk';

    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;

    const fetchRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!fetchRes.ok) throw new Error('Failed to fetch from Yahoo Finance');

    const data = await fetchRes.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data found');

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const meta = result.meta;

    const history = timestamps.map((ts, i) => ({
      timestamp: ts * 1000,
      close: closes[i]
    })).filter(h => h.close !== null);

    res.json({
      symbol: meta.symbol,
      regularMarketPrice: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose || meta.previousClose,
      history
    });
  } catch (error) {
    console.error('History API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch history: ' + error.message });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase().replace('.NS', '').replace('.BO', '');

    const data = await getStockData(symbol);

    if (!data || !data.currentPrice) {
      return res.status(404).json({ error: `Could not fetch data for ${symbol}. Please check the symbol and try again.` });
    }

    // Compute scores based on available data
    const qualityScore = computeQualityScore(data);
    const valuationScore = computeValuationScore(data);
    const financialHealthScore = computeFinancialHealthScore(data);

    const stockData = {
      symbol: `${symbol}.NS`,
      shortName: data.shortName || data.longName || symbol,
      longName: data.longName || data.shortName || symbol,
      exchange: data.exchange || 'NSE',
      currency: data.currency || 'INR',
      sector: data.sector || 'N/A',
      industry: data.industry || 'N/A',

      currentPrice: data.currentPrice,
      previousClose: data.previousClose,
      open: data.open,
      dayHigh: data.dayHigh,
      dayLow: data.dayLow,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      avgVolume: data.avgVolume,

      marketCap: data.marketCap,
      pe: data.pe,
      forwardPe: data.forwardPe,
      eps: data.eps,
      bookValue: data.bookValue,
      priceToBook: data.priceToBook,
      dividendYield: data.dividendYield,
      dividendRate: data.dividendRate,
      roe: data.roe,
      roa: data.roa,
      debtToEquity: data.debtToEquity,
      currentRatio: data.currentRatio,
      quickRatio: data.quickRatio,
      operatingMargin: data.operatingMargin,
      profitMargin: data.profitMargin,
      revenueGrowth: data.revenueGrowth,
      earningsGrowth: data.earningsGrowth,
      grossMargin: data.grossMargin,
      freeCashflow: data.freeCashflow,
      operatingCashflow: data.operatingCashflow,
      totalRevenue: data.totalRevenue,
      totalDebt: data.totalDebt,
      totalCash: data.totalCash,

      fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: data.fiftyTwoWeekLow,
      fiftyDayAverage: data.fiftyDayAverage,
      twoHundredDayAverage: data.twoHundredDayAverage,

      beta: data.beta,

      qualityScore,
      valuationScore,
      financialHealthScore,

      incomeStatements: [],
      balanceSheets: [],
      cashflows: []
    };

    res.json(stockData);
  } catch (error) {
    console.error('Stock data error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stock data: ' + error.message });
  }
});

function computeQualityScore(data) {
  let score = 50;

  // EPS positive
  if (data.eps > 0) score += 10;
  else if (data.eps !== undefined && data.eps !== null && data.eps < 0) score -= 15;

  // PE reasonable (indicates earnings quality)
  if (data.pe && data.pe > 0 && data.pe < 30) score += 10;
  else if (data.pe && data.pe > 0 && data.pe < 50) score += 5;

  // Dividend paying
  if (data.dividendYield && data.dividendYield > 0) score += 10;

  // Market cap (larger = generally more quality)
  if (data.marketCap && data.marketCap > 1e12) score += 10; // >1L Cr
  else if (data.marketCap && data.marketCap > 1e11) score += 5; // >10K Cr

  // Year range position (not at all-time low)
  if (data.currentPrice && data.fiftyTwoWeekHigh && data.fiftyTwoWeekLow) {
    const range = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
    if (range > 0) {
      const position = (data.currentPrice - data.fiftyTwoWeekLow) / range;
      if (position > 0.3 && position < 0.8) score += 5;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function computeValuationScore(data) {
  let score = 50;

  if (data.pe && data.pe > 0) {
    if (data.pe < 15) score += 20;
    else if (data.pe < 25) score += 10;
    else if (data.pe > 50) score -= 15;
    else if (data.pe > 35) score -= 5;
  }

  if (data.dividendYield) {
    if (data.dividendYield > 0.03) score += 10;
    else if (data.dividendYield > 0.01) score += 5;
  }

  // Near 52-week low = potentially undervalued
  if (data.currentPrice && data.fiftyTwoWeekLow && data.fiftyTwoWeekHigh) {
    const range = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
    if (range > 0) {
      const position = (data.currentPrice - data.fiftyTwoWeekLow) / range;
      if (position < 0.3) score += 10;
      else if (position > 0.9) score -= 10;
    }
  }

  // EPS yield (1/PE) vs risk-free rate (~7% in India)
  if (data.pe && data.pe > 0) {
    const epsYield = 100 / data.pe;
    if (epsYield > 7) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function computeFinancialHealthScore(data) {
  let score = 50;

  // EPS positive = profitable
  if (data.eps > 0) score += 15;
  else if (data.eps !== undefined && data.eps !== null && data.eps < 0) score -= 15;

  // Dividend paying = healthy cash flows
  if (data.dividendYield && data.dividendYield > 0.02) score += 10;
  else if (data.dividendYield && data.dividendYield > 0) score += 5;

  // PE not extreme
  if (data.pe && data.pe > 0 && data.pe < 40) score += 5;
  else if (data.pe && data.pe > 80) score -= 10;

  // Large market cap = financial stability
  if (data.marketCap && data.marketCap > 5e11) score += 10; // >50K Cr
  else if (data.marketCap && data.marketCap > 1e11) score += 5;

  // Not at 52-week extreme lows (financial distress indicator)
  if (data.currentPrice && data.fiftyTwoWeekLow) {
    if (data.currentPrice > data.fiftyTwoWeekLow * 1.1) score += 5;
    else score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

export default router;

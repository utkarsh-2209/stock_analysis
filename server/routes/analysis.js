import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Simple in-memory cache to save API calls and ensure consistent results
const analysisCache = {};
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour cache duration

// Stock analysis
router.post('/analyze', async (req, res) => {
  try {
    const { stockData, news, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API key is required. Please add it in Settings.' });
    }

    // Check if we already have a cached analysis for this stock symbol
    const symbol = stockData?.symbol;
    if (symbol) {
      const cached = analysisCache[symbol];
      // If cached less than CACHE_DURATION_MS ago, return it immediately
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        console.log(`[Cache Hit] Serving existing analysis for ${symbol}`);
        return res.json(cached.data);
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 0.1 }
    });

    const newsSummary = news?.articles?.slice(0, 8).map(a =>
      `- ${a.title} (${a.source}, ${a.pubDate})`
    ).join('\n') || 'No recent news available.';

    const prompt = `You are an expert Indian stock market financial analyst. Analyze the following stock and provide a comprehensive review.

STOCK: ${stockData.longName} (${stockData.symbol})
SECTOR: ${stockData.sector} | INDUSTRY: ${stockData.industry}

KEY METRICS:
- Current Price: ₹${stockData.currentPrice}
- Market Cap: ₹${formatNum(stockData.marketCap)}
- P/E Ratio: ${stockData.pe || 'N/A'}
- Forward P/E: ${stockData.forwardPe || 'N/A'}
- EPS: ₹${stockData.eps || 'N/A'}
- Price to Book: ${stockData.priceToBook || 'N/A'}
- Book Value: ₹${stockData.bookValue || 'N/A'}
- ROE: ${pct(stockData.roe)}
- ROA: ${pct(stockData.roa)}
- Debt to Equity: ${stockData.debtToEquity || 'N/A'}
- Current Ratio: ${stockData.currentRatio || 'N/A'}
- Operating Margin: ${pct(stockData.operatingMargin)}
- Profit Margin: ${pct(stockData.profitMargin)}
- Revenue Growth: ${pct(stockData.revenueGrowth)}
- Earnings Growth: ${pct(stockData.earningsGrowth)}
- Dividend Yield: ${pct(stockData.dividendYield)}
- Free Cashflow: ₹${formatNum(stockData.freeCashflow)}
- Operating Cashflow: ₹${formatNum(stockData.operatingCashflow)}
- 52W High: ₹${stockData.fiftyTwoWeekHigh} | 52W Low: ₹${stockData.fiftyTwoWeekLow}
- Beta: ${stockData.beta || 'N/A'}

RECENT NEWS:
${newsSummary}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "qualityReview": {
    "rating": "Strong/Good/Average/Weak",
    "summary": "2-3 sentence summary",
    "points": ["point 1", "point 2", "point 3", "point 4"]
  },
  "valuationReview": {
    "rating": "Undervalued/FairlyValued/Overvalued/HighlyOvervalued",
    "summary": "2-3 sentence summary",
    "points": ["point 1", "point 2", "point 3", "point 4"]
  },
  "financialHealth": {
    "rating": "Excellent/Good/Average/Poor",
    "summary": "2-3 sentence summary",
    "points": ["point 1", "point 2", "point 3", "point 4"]
  },
  "newsSentiment": {
    "overall": "Bullish/Bearish/Neutral/Mixed",
    "summary": "2-3 sentence summary of news sentiment",
    "keyThemes": ["theme 1", "theme 2", "theme 3"]
  },
  "manipulationInsights": {
    "riskLevel": "Low/Medium/High",
    "summary": "2-3 sentence summary",
    "redFlags": ["potential red flag 1", "potential red flag 2", "potential red flag 3"],
    "watchFor": ["what to watch for 1", "what to watch for 2"]
  },
  "overallRating": {
    "score": 7.5,
    "verdict": "Buy/Hold/Sell/Avoid",
    "summary": "3-4 sentence overall summary with investment thesis"
  }
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse the JSON from the response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      analysis = {
        qualityReview: { rating: 'N/A', summary: text.slice(0, 200), points: [] },
        valuationReview: { rating: 'N/A', summary: '', points: [] },
        financialHealth: { rating: 'N/A', summary: '', points: [] },
        newsSentiment: { overall: 'N/A', summary: '', keyThemes: [] },
        manipulationInsights: { riskLevel: 'N/A', summary: '', redFlags: [], watchFor: [] },
        overallRating: { score: 0, verdict: 'N/A', summary: 'Failed to parse AI analysis. Raw: ' + text.slice(0, 300) }
      };
    }

    // Save to cache before sending response
    if (symbol && analysis.overallRating.verdict !== 'N/A') {
      analysisCache[symbol] = {
        timestamp: Date.now(),
        data: analysis
      };
      console.log(`[Cache Miss] Saved new analysis for ${symbol}`);
    }

    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error.message);
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('401')) {
      return res.status(401).json({ error: 'Invalid Gemini API key. Please check your key in Settings.' });
    }
    res.status(500).json({ error: 'AI analysis failed: ' + error.message });
  }
});

// Chart prediction
router.post('/predict-chart', async (req, res) => {
  try {
    const { imageBase64, stockContext, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API key is required.' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'Chart image is required.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.1 }
    });

    const prompt = `You are an expert technical analyst for the Indian stock market. Analyze this candlestick chart screenshot and provide predictions.

STOCK CONTEXT: ${stockContext || 'Indian stock market'}

Analyze the chart and respond ONLY with valid JSON (no markdown):
{
  "pattern": "Name of the candlestick/chart pattern identified",
  "trend": "Uptrend/Downtrend/Sideways/Reversal",
  "prediction": "Bullish/Bearish/Neutral",
  "confidence": 75,
  "supportLevels": ["level 1", "level 2"],
  "resistanceLevels": ["level 1", "level 2"],
  "summary": "3-4 sentence analysis of where the stock might head based on the chart patterns visible",
  "timeframe": "Short-term prediction timeframe based on candle intervals",
  "keyObservations": ["observation 1", "observation 2", "observation 3"],
  "riskReward": "Risk-reward assessment based on current levels"
}`;

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      }
    ]);

    const text = result.response.text();
    let prediction;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      prediction = {
        pattern: 'Unable to parse',
        trend: 'N/A',
        prediction: 'N/A',
        confidence: 0,
        supportLevels: [],
        resistanceLevels: [],
        summary: text.slice(0, 400),
        timeframe: 'N/A',
        keyObservations: [],
        riskReward: 'N/A'
      };
    }

    res.json(prediction);
  } catch (error) {
    console.error('Chart prediction error:', error.message);
    res.status(500).json({ error: 'Chart prediction failed: ' + error.message });
  }
});

// Test API key
router.post('/test-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Reply with exactly: OK');
    const text = result.response.text();

    res.json({ valid: true, message: 'API key is valid! ✅' });
  } catch (error) {
    res.json({ valid: false, message: 'Invalid API key: ' + error.message });
  }
});

function formatNum(val) {
  if (!val && val !== 0) return 'N/A';
  if (Math.abs(val) >= 1e12) return (val / 1e12).toFixed(2) + 'T';
  if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (Math.abs(val) >= 1e7) return (val / 1e7).toFixed(2) + 'Cr';
  if (Math.abs(val) >= 1e5) return (val / 1e5).toFixed(2) + 'L';
  return val.toLocaleString('en-IN');
}

function pct(val) {
  if (val === undefined || val === null) return 'N/A';
  return (val * 100).toFixed(2) + '%';
}

export default router;

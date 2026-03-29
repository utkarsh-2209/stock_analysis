import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nseStocks = require('../data/nse_stocks.json');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const query = (req.query.q || '').toLowerCase().trim();
    if (!query || query.length < 1) {
      return res.json([]);
    }

    const results = nseStocks.filter(stock =>
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query)
    ).slice(0, 12);

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;

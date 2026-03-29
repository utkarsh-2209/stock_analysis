import express from 'express';
import cors from 'cors';
import compression from 'compression';
import searchRouter from './routes/search.js';
import stockDataRouter from './routes/stockData.js';
import newsRouter from './routes/news.js';
import analysisRouter from './routes/analysis.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(compression()); // gzip all responses
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/search', searchRouter);
app.use('/api/stock', stockDataRouter);
app.use('/api/news', newsRouter);
app.use('/api/analysis', analysisRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Stock Analyzer API running on http://localhost:${PORT}`);
  });
}

export default app;

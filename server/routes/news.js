import express from 'express';
import RssParser from 'rss-parser';

const router = express.Router();
const parser = new RssParser();

// 30-minute news cache
const newsCache = {};
const NEWS_CACHE_TTL = 30 * 60 * 1000;

router.get('/:stockName', async (req, res) => {
  try {
    const stockName = decodeURIComponent(req.params.stockName);

    // Serve from cache if fresh
    const cached = newsCache[stockName];
    if (cached && (Date.now() - cached.ts < NEWS_CACHE_TTL)) {
      res.set('Cache-Control', 'public, max-age=1800');
      return res.json(cached.data);
    }

    const query = encodeURIComponent(`${stockName} stock India`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

    const feed = await parser.parseURL(rssUrl);

    const articles = feed.items.slice(0, 12).map(item => {
      const titleParts = item.title ? item.title.split(' - ') : [''];
      const source = titleParts.length > 1 ? titleParts.pop().trim() : 'Unknown';
      const title = titleParts.join(' - ').trim();

      return {
        title: title || item.title,
        source,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        snippet: item.contentSnippet || item.content || ''
      };
    });

    const payload = { stockName, totalResults: articles.length, articles };
    newsCache[stockName] = { ts: Date.now(), data: payload };
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(payload);
  } catch (error) {
    console.error('News error:', error.message);
    res.status(500).json({ error: 'Failed to fetch news: ' + error.message });
  }
});

export default router;

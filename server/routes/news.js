import express from 'express';
import RssParser from 'rss-parser';

const router = express.Router();
const parser = new RssParser();

router.get('/:stockName', async (req, res) => {
  try {
    const stockName = decodeURIComponent(req.params.stockName);
    const query = encodeURIComponent(`${stockName} stock India`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

    const feed = await parser.parseURL(rssUrl);

    const articles = feed.items.slice(0, 12).map(item => {
      // Extract source from title (Google News format: "Title - Source")
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

    res.json({
      stockName,
      totalResults: articles.length,
      articles
    });
  } catch (error) {
    console.error('News error:', error.message);
    res.status(500).json({ error: 'Failed to fetch news: ' + error.message });
  }
});

export default router;

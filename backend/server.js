/**
 * WanderSpot Backend — Express server
 *
 * Two endpoints:
 *   POST /api/story  — Generate a street story using Claude (vision) + optional NewsAPI
 *   GET  /api/news   — Fetch local news and produce a neighborhood digest via Claude
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');



const app = express();
const PORT = process.env.PORT || 3001;

// Allow all origins during development (tighten in production)
app.use(cors());

// Parse JSON bodies — increase limit for base64 photo payloads
app.use(express.json({ limit: '20mb' }));

// Initialize the client with the API key from environment
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


// ─── System prompt shared by both story modes ───────────────────────────────
const SYSTEM_PROMPT = `You are WanderSpot, 
a knowledgeable and engaging local storyteller. 
You will be given a street view photo, a location, 
and optionally a set of real recent news articles from that area. 
Your job is to tell the user about this place in a warm, vivid, narrative style
 — like a well-traveled friend who knows the city deeply. 
 Always base your story on real information. 
 Do not invent historical facts. If the mode is 'overview', 
 research and narrate the cultural character, history, and significance 
 of this street and area in around 200 words. If the mode is 'news', 
 weave the provided real news articles into a short narrative that 
 captures what life is like here right now, in around 200 words. 
 Always end with one interesting thing the user might not know about this place.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetch recent news articles from NewsAPI for a given location query string.
 * Returns up to `limit` articles published in the last 7 days.
 */
async function fetchNews(query, limit = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const response = await axios.get('https://newsapi.org/v2/everything', {
    params: {
      q: query,
      from: sevenDaysAgo,
      sortBy: 'publishedAt',
      language: 'en',
      pageSize: limit,
      apiKey: process.env.NEWS_API_KEY,
    },
  });

  return response.data.articles || [];
}

/**
 * Format a list of articles into a concise text block for Claude's context.
 */
function articlesToContext(articles) {
  return articles
    .map((a, i) => `${i + 1}. "${a.title}" (${a.source?.name || 'Unknown source'}): ${a.description || 'No description.'}`)
    .join('\n');
}

// ─── POST /api/story ─────────────────────────────────────────────────────────
/**
 * Generate a street story with Claude vision.
 *
 * Request body:
 *   photoBase64  {string}  JPEG image as a base64 string (no data: prefix)
 *   lat          {number}  GPS latitude
 *   lng          {number}  GPS longitude
 *   streetName   {string}  Human-readable address from reverse geocoding
 *   mode         {string}  'overview' | 'news'
 *
 * Response:
 *   { story: string }
 */
app.post('/api/story', async (req, res) => {
  try {
    const { photoBase64, lat, lng, streetName, mode } = req.body;

    // Validate required fields
    if (!photoBase64 || !lat || !lng || !streetName || !mode) {
      return res.status(400).json({ error: 'Missing required fields: photoBase64, lat, lng, streetName, mode' });
    }

    let newsContext = '';

    // For news mode: fetch recent articles to give Claude real local context
    if (mode === 'news') {
      // Use the street name + city as the search query for NewsAPI
      const articles = await fetchNews(streetName, 5);

      if (articles.length > 0) {
        newsContext = `\n\nRecent local news articles:\n${articlesToContext(articles)}`;
      } else {
        newsContext = '\n\n(No recent local news articles found. Do your best with general knowledge.)';
      }
    }

    // Build the user message for Claude — image + location text
    const userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: photoBase64,
        },
      },
      {
        type: 'text',
        text: `Location: ${streetName} (coordinates: ${lat}, ${lng})\nStorytelling mode: ${mode}${newsContext}`,
      },
    ];

    // Call Claude with vision
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
    });

    const story = message.content[0]?.text || '';
    res.json({ story });
  } catch (err) {
    console.error('[/api/story] Error:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message || 'Story generation failed' });
  }
});

// ─── GET /api/news ────────────────────────────────────────────────────────────
/**
 * Fetch local news and generate a neighborhood digest with Claude.
 *
 * Query params:
 *   city  {string}  City / neighborhood name for the news search
 *
 * Response:
 *   { digest: string, articles: NewsArticle[] }
 */
app.get('/api/news', async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ error: 'Missing required query param: city' });
    }

    // Fetch up to 10 recent articles for the area
    const articles = await fetchNews(city, 10);

    if (articles.length === 0) {
      return res.json({
        digest: `No recent news found for ${city}. Try refreshing or exploring a different area.`,
        articles: [],
      });
    }

    // Pass the top 5 headlines to Claude for a brief narrative digest
    const top5 = articles.slice(0, 5);
    const newsText = articlesToContext(top5);

    const digestMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: `Here are recent news articles from ${city}:\n\n${newsText}\n\nWrite a brief, warm, 3-sentence narrative summary of what's been happening in this neighborhood lately. Write in the style of a friendly local guide, not a news anchor. Be specific and engaging.` }],
    });

    const digest = digestMessage.content[0]?.text || '';

    res.json({ digest, articles });
  } catch (err) {
    console.error('[/api/news] Error:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message || 'News fetch failed' });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'WanderSpot Backend' });
});

// ─── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WanderSpot backend listening on port ${PORT}`);
});

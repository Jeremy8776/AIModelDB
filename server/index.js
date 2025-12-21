/* eslint-disable */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Static assets from dist
const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));

// --- OpenAI webhook endpoint (raw body for signature verification) ---
const openaiEvents = [];
const sseClients = new Set();

function sseBroadcast(evt) {
  const payload = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of Array.from(sseClients)) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}
app.post('/webhooks/openai', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
  try {
    const secret = process.env.OPENAI_WEBHOOK_SECRET || '';
    const raw = req.body instanceof Buffer ? req.body : Buffer.from(req.body || '');
    const sigHeaders = [
      req.header('x-openai-signature'),
      req.header('openai-signature'),
      req.header('openai-signature-256'),
      req.header('openai-webhook-signature'),
    ].filter(Boolean);
    let verified = false;
    if (secret && sigHeaders.length) {
      const digest = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      for (const s of sigHeaders) {
        const cleaned = String(s)
          .replace(/^sha256=/i, '')
          .trim();
        if (cleaned === digest) {
          verified = true;
          break;
        }
      }
    }
    let parsed;
    try {
      parsed = JSON.parse(raw.toString('utf8') || '{}');
    } catch {
      parsed = { _raw: raw.toString('utf8') };
    }
    const evt = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      ts: new Date().toISOString(),
      verified,
      headers: {
        'user-agent': req.header('user-agent'),
        'content-type': req.header('content-type'),
        'x-openai-signature':
          req.header('x-openai-signature') ||
          req.header('openai-signature') ||
          req.header('openai-signature-256') ||
          req.header('openai-webhook-signature') ||
          '',
      },
      body: parsed,
    };
    openaiEvents.unshift(evt);
    if (openaiEvents.length > 100) openaiEvents.pop();
    console.log(
      '[OpenAI Webhook]',
      JSON.stringify({ verified: evt.verified, body: evt.body }, null, 2)
    );
    // Push to SSE subscribers
    sseBroadcast(evt);
    res.status(200).json({ received: true, verified });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// Lightweight logs endpoint (do NOT expose sensitive headers)
app.get('/webhooks/openai/logs', (req, res) => {
  res.json(openaiEvents);
});

// Server-Sent Events stream for live webhook updates
app.get('/webhooks/openai/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  // Send recent backlog (up to 10)
  const backlog = openaiEvents.slice(0, 10).reverse();
  backlog.forEach(evt => res.write(`data: ${JSON.stringify(evt)}\n\n`));
  // Keepalive
  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);
  sseClients.add(res);
  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// JSON parser for the rest of the app
app.use(express.json({ limit: '1mb' }));

// Add search endpoint for model enrichment
app.post('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    console.log(`[SEARCH] Query: "${query}", Limit: ${limit}`);

    // Simple search simulation - in production this could be:
    // - Search through external APIs
    // - Use a search engine API (Google, Bing, DuckDuckGo)
    // - Query a vector database
    // - Call specialized model APIs

    // For now, return a simple response indicating the search was processed
    const results = [
      {
        title: `Search result for: ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Related information about ${query} - this would be real search results in production`,
        source: 'web',
      },
    ];

    res.json({
      query,
      results,
      total: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    res.status(500).json({ error: 'Search service temporarily unavailable' });
  }
});

// Mirror Vite dev proxies for production
const proxy = (route, target, rewrite) =>
  app.use(
    route,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: true,
      timeout: 60000,
      proxyTimeout: 60000,
      followRedirects: true,
      pathRewrite: rewrite ? pathStr => pathStr.replace(rewrite.from, rewrite.to) : undefined,
      onProxyReq: (proxyReq, req) => {
        // Preserve original headers
        proxyReq.setHeader(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        );

        // For OpenAI API calls, preserve Authorization header
        if (req.headers.authorization && route.includes('openai')) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
        }

        // For ArtificialAnalysis API calls, preserve x-api-key header
        if (req.headers['x-api-key']) {
          proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
        }

        // For RoboFlow API calls, preserve Authorization header
        if (req.headers.authorization && route.includes('roboflow')) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
        }

        // Set content type for POST requests
        if (req.method === 'POST') {
          proxyReq.setHeader('Content-Type', 'application/json');
        }

        console.log(`[Proxy] ${req.method} ${route} -> ${target}${proxyReq.path || req.url}`);
      },
      onError: (err, req, res) => {
        try {
          console.error(`[Proxy Error] ${route}:`, err.code || err.message);
          if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'proxy_error',
                code: err.code,
                message: `Proxy connection failed: ${err.message}`,
                route: route,
              })
            );
          }
        } catch (e) {
          console.error('[Proxy Error Handler Failed]:', e);
        }
      },
      onProxyReqError: (err, req, res) => {
        try {
          console.error(`[Proxy Request Error] ${route}:`, err.code || err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'proxy_request_error',
                code: err.code,
                message: `Request to upstream failed: ${err.message}`,
                route: route,
              })
            );
          }
        } catch (e) {
          console.error('[Proxy Request Error Handler Failed]:', e);
        }
      },
      onProxyResError: (err, req, res) => {
        try {
          console.error(`[Proxy Response Error] ${route}:`, err.code || err.message);
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'proxy_response_error',
                code: err.code,
                message: `Response from upstream failed: ${err.message}`,
                route: route,
              })
            );
          }
        } catch (e) {
          console.error('[Proxy Response Error Handler Failed]:', e);
        }
      },
    })
  );

proxy('/aa-api', 'https://artificialanalysis.ai', { from: /^\/aa-api/, to: '/api' });
proxy('/huggingface-api', 'https://huggingface.co', { from: /^\/huggingface-api/, to: '/api' });
proxy('/huggingface-web', 'https://huggingface.co', { from: /^\/huggingface-web/, to: '' });
proxy('/github-web', 'https://github.com', { from: /^\/github-web/, to: '' });
proxy('/aa-web', 'https://artificialanalysis.ai', { from: /^\/aa-web/, to: '' });
proxy('/openai-api', 'https://api.openai.com', { from: /^\/openai-api/, to: '/v1' });
proxy('/github-api', 'https://api.github.com', { from: /^\/github-api/, to: '' });

// New data source proxies
proxy('/roboflow-api', 'https://api.roboflow.com', { from: /^\/roboflow-api/, to: '' });
proxy('/kaggle-api', 'https://www.kaggle.com', { from: /^\/kaggle-api/, to: '/api/v1' });
proxy('/tensorart-api', 'https://tensor.art', { from: /^\/tensorart-api/, to: '/api' });
proxy('/civitai-api', 'https://civitai.com', { from: /^\/civitai-api/, to: '/api/v1' });
proxy('/runcomfy-api', 'https://runcomfy.com', { from: /^\/runcomfy-api/, to: '' });
proxy('/prompthero-api', 'https://prompthero.com', { from: /^\/prompthero-api/, to: '' });
proxy('/liblib-api', 'https://www.liblib.ai', { from: /^\/liblib-api/, to: '' });
proxy('/shakker-api', 'https://www.shakker.ai', { from: /^\/shakker-api/, to: '' });
proxy('/openmodeldb-api', 'https://raw.githubusercontent.com', { from: /^\/openmodeldb-api/, to: '' });
proxy('/civitasbay-api', 'https://civitasbay.org', { from: /^\/civitasbay-api/, to: '' });

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// --- Legacy search route REMOVED ---
// Using the new search endpoint defined above at lines 96-134

// --- Scrape route ---
const ALLOWLIST = [
  'huggingface.co',
  'github.com',
  'modelscope.cn',
  'openai.com',
  'anthropic.com',
  'google.com',
  'research.google.com',
  'deepmind.com',
  'artificialanalysis.ai',
  'meta.ai',
  'ai.meta.com',
  'microsoft.com',
  'arxiv.org',
  'papers.withcode.com',
  'paperswithcode.com',
  'stability.ai',
  'mistral.ai',
  'cohere.ai',
  'ai21.com',
  // New data sources
  'universe.roboflow.com',
  'roboflow.com',
  'kaggle.com',
  'tensor.art',
  'civitaiarchive.com',
  'runcomfy.com',
  'prompthero.com',
  'liblib.ai',
  'shakker.ai',
  'openmodeldb.info',
  'civitasbay.org',
];

app.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing url' });
    const u = new URL(url);
    if (!ALLOWLIST.includes(u.hostname)) {
      return res.status(400).json({ error: 'Domain not allowed' });
    }
    const r = await fetch(url, { headers: { 'User-Agent': 'model-db-pro' } });
    if (!r.ok) return res.status(502).json({ error: `Fetch failed ${r.status}` });
    const html = await r.text();
    const $ = cheerio.load(html);

    let license,
      params,
      ctx,
      release,
      author,
      description,
      tags = [];
    const text = $.text().toLowerCase();

    // Enhanced extraction patterns with more comprehensive patterns
    const licMatch = text.match(/license[:\s-]+([a-z0-9 .\-+]+)/i);
    if (licMatch) license = licMatch[1].trim();

    // More robust parameter extraction
    const pMatches = [
      text.match(/(\d{1,4})\s*billion\s*(parameters?)/i),
      text.match(/(\d{1,3})b\s*(parameters?|model)/i),
      text.match(/\b(\d{1,3})\s*(b|m)\b/i),
      text.match(/parameters?[:\s-]+(\d+\s*(b|m|billion|million))/i),
    ];
    for (const match of pMatches) {
      if (match && !params) {
        if (match[2] && match[2].toLowerCase().includes('billion')) {
          params = `${match[1]}B`;
        } else if (
          match[2] &&
          (match[2].toLowerCase() === 'b' || match[2].toLowerCase().includes('billion'))
        ) {
          params = `${match[1]}B`;
        } else if (
          match[2] &&
          (match[2].toLowerCase() === 'm' || match[2].toLowerCase().includes('million'))
        ) {
          params = `${match[1]}M`;
        }
        break;
      }
    }

    const ctxMatch = text.match(/context\s*window[:\s-]+(\d+\s*(k|m))/i);
    if (ctxMatch) ctx = ctxMatch[1].toUpperCase();

    // Enhanced release date extraction with more patterns
    const relMatches = [
      text.match(
        /(released|release date|launched|announced|introduced)[:\s-]+(\d{4}-\d{2}-\d{2})/i
      ),
      text.match(
        /(released|launched|announced)[:\s-]+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i
      ),
      text.match(
        /(released|launched|announced)[:\s-]+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i
      ),
      text.match(/(\d{4}-\d{2}-\d{2})/),
      text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/),
      text.match(
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i
      ),
    ];
    for (const match of relMatches) {
      if (match && !release) {
        if (match[2] && match[3] && match[4]) {
          // Month Day, Year format
          const monthNames = [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december',
          ];
          const monthNum = monthNames.indexOf(match[2].toLowerCase()) + 1;
          if (monthNum > 0) {
            release = `${match[4]}-${monthNum.toString().padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          }
        } else if (match[2] && match[3]) {
          // Month Year format
          const monthNames = [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december',
          ];
          const monthNum = monthNames.indexOf(match[2].toLowerCase()) + 1;
          if (monthNum > 0) {
            release = `${match[3]}-${monthNum.toString().padStart(2, '0')}-01`;
          }
        } else if (match[1] || match[2]) {
          release = match[1] || match[2];
        }
        break;
      }
    }

    // Extract author/creator information
    // First try to extract from HuggingFace URL pattern
    if (url.includes('huggingface.co') && !author) {
      const hfMatch = url.match(/huggingface\.co\/([^\/]+)\/[^\/]+/);
      if (hfMatch && hfMatch[1]) {
        author = hfMatch[1]; // Extract "pyannote" from "huggingface.co/pyannote/model-name"
      }
    }

    // Fallback to text pattern matching if not found in URL
    if (!author) {
      const authorPatterns = [
        /(created|made|by|author|developer)[:\s-]+([a-zA-Z0-9_\-\s@.]+)/i,
        /@([a-zA-Z0-9_\-]+)/,
        /model by[:\s]+([a-zA-Z0-9_\-\s]+)/i,
      ];
      for (const pattern of authorPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && !author) {
          author = match[1].trim().replace(/[@]/g, '').slice(0, 50);
          break;
        }
      }
    }

    // Extract description from meta tags or first paragraph
    description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('p').first().text().trim().slice(0, 200);

    // Extract tags
    $('a, span, div, li').each((_, el) => {
      const t = $(el).text().trim();
      if (
        t &&
        t.length < 30 &&
        /^(llm|vlm|vision|image|video|audio|asr|tts|transformers?|diffusion|gpt|text-generation)$/i.test(
          t
        )
      ) {
        tags.push(t.toLowerCase());
      }
    });
    tags = Array.from(new Set(tags)).slice(0, 20);

    res.json({ license, params, ctx, release, author, description, tags });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

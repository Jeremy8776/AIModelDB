/* eslint-disable */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { createRequire } from 'module';
import dns from 'dns';
import net from 'net';

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 0) return true; // 0.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (link-local)
    if (parts[0] >= 224) return true; // multicast / reserved
  } else if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:')) return true; // link-local
    if (normalized.startsWith('fc00:') || normalized.startsWith('fd00:')) return true; // unique local
    if (normalized.startsWith('ff00:')) return true; // multicast
  }
  return false;
}

async function isPrivateHost(hostname) {
  if (net.isIP(hostname)) {
    return isPrivateIp(hostname);
  }
  try {
    const records = await dns.promises.lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        return true;
      }
    }
  } catch (err) {
    return true; // fail-closed on resolution failure
  }
  return false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { proxyValidationMiddleware } = require('./proxy-middleware.js');

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

// Global rate limiting middleware to prevent DOS and resource exhaustion on API routes
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const maxRequestsPerWindow = 1000; // 1000 requests per 15 minutes per IP
const ipRequestCounts = new Map();

setInterval(() => {
  ipRequestCounts.clear();
}, rateLimitWindowMs);

function globalRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + rateLimitWindowMs });
    return next();
  }
  const record = ipRequestCounts.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + rateLimitWindowMs;
    return next();
  }
  record.count++;
  if (record.count > maxRequestsPerWindow) {
    return res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
  next();
}

// JSON parser for the rest of the app
app.use(express.json({ limit: '1mb' }));
app.use(proxyValidationMiddleware());
app.use(globalRateLimiter);

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
        if (req.headers['x-api-key'] && route.includes('aa-api')) {
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

        let logPath = proxyReq.path || req.url || '';
        try {
          const parsedPath = new URL(logPath, 'http://localhost');
          logPath = parsedPath.pathname + (parsedPath.search ? '?<redacted>' : '');
        } catch (e) {
          logPath = logPath.split('?')[0] + (logPath.includes('?') ? '?<redacted>' : '');
        }
        console.log(`[Proxy] ${req.method} ${route} -> ${target}${logPath}`);
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

    let currentUrl = url;
    let hops = 0;
    const maxHops = 5;
    let response = null;

    while (hops <= maxHops) {
      let u;
      try {
        u = new URL(currentUrl);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return res.status(400).json({ error: 'Protocol not allowed' });
      }

      let matchedHost = '';
      switch (u.hostname) {
        case 'huggingface.co': matchedHost = 'huggingface.co'; break;
        case 'github.com': matchedHost = 'github.com'; break;
        case 'modelscope.cn': matchedHost = 'modelscope.cn'; break;
        case 'openai.com': matchedHost = 'openai.com'; break;
        case 'anthropic.com': matchedHost = 'anthropic.com'; break;
        case 'google.com': matchedHost = 'google.com'; break;
        case 'research.google.com': matchedHost = 'research.google.com'; break;
        case 'deepmind.com': matchedHost = 'deepmind.com'; break;
        case 'artificialanalysis.ai': matchedHost = 'artificialanalysis.ai'; break;
        case 'meta.ai': matchedHost = 'meta.ai'; break;
        case 'ai.meta.com': matchedHost = 'ai.meta.com'; break;
        case 'microsoft.com': matchedHost = 'microsoft.com'; break;
        case 'arxiv.org': matchedHost = 'arxiv.org'; break;
        case 'papers.withcode.com': matchedHost = 'papers.withcode.com'; break;
        case 'paperswithcode.com': matchedHost = 'paperswithcode.com'; break;
        case 'stability.ai': matchedHost = 'stability.ai'; break;
        case 'mistral.ai': matchedHost = 'mistral.ai'; break;
        case 'cohere.ai': matchedHost = 'cohere.ai'; break;
        case 'ai21.com': matchedHost = 'ai21.com'; break;
        case 'universe.roboflow.com': matchedHost = 'universe.roboflow.com'; break;
        case 'roboflow.com': matchedHost = 'roboflow.com'; break;
        case 'kaggle.com': matchedHost = 'kaggle.com'; break;
        case 'tensor.art': matchedHost = 'tensor.art'; break;
        case 'civitaiarchive.com': matchedHost = 'civitaiarchive.com'; break;
        case 'runcomfy.com': matchedHost = 'runcomfy.com'; break;
        case 'prompthero.com': matchedHost = 'prompthero.com'; break;
        case 'liblib.ai': matchedHost = 'liblib.ai'; break;
        case 'shakker.ai': matchedHost = 'shakker.ai'; break;
        case 'openmodeldb.info': matchedHost = 'openmodeldb.info'; break;
        case 'civitasbay.org': matchedHost = 'civitasbay.org'; break;
      }

      if (!matchedHost) {
        return res.status(400).json({ error: 'Domain not allowed' });
      }

      if (await isPrivateHost(matchedHost)) {
        return res.status(400).json({ error: 'Access to private address space is blocked' });
      }

      const pathAndQuery = u.pathname + u.search + u.hash;
      // Sanitize the path/query parameters via regex check to clear CodeQL taint
      if (!/^[a-zA-Z0-9_\-\/\.\?\&\=\#\:\%\+]+$/.test(pathAndQuery)) {
        return res.status(400).json({ error: 'URL contains unsafe characters' });
      }

      const sanitizedUrl = `https://${matchedHost}${pathAndQuery}`;

      response = await fetch(sanitizedUrl, {
        headers: { 'User-Agent': 'model-db-pro' },
        redirect: 'manual'
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          break;
        }
        currentUrl = new URL(location, sanitizedUrl).toString();
        hops++;
      } else {
        break;
      }
    }

    if (hops > maxHops) {
      return res.status(400).json({ error: 'Too many redirects' });
    }

    if (!response || !response.ok) {
      return res.status(502).json({ error: `Fetch failed ${response ? response.status : 'unknown'}` });
    }

    const bodyLimit = 2 * 1024 * 1024; // 2MB
    let receivedBytes = 0;
    const chunks = [];

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            receivedBytes += value.length;
            if (receivedBytes > bodyLimit) {
              try { await reader.cancel(); } catch (e) {}
              return res.status(400).json({ error: 'Response body exceeds size limit (2MB)' });
            }
            chunks.push(value);
          }
        }
      } catch (e) {
        return res.status(502).json({ error: `Failed to read response: ${e.message}` });
      }
    } else if (response.body && typeof response.body.on === 'function') {
      try {
        await new Promise((resolve, reject) => {
          response.body.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (receivedBytes > bodyLimit) {
              response.body.destroy();
              reject(new Error('Response body exceeds size limit (2MB)'));
              return;
            }
            chunks.push(chunk);
          });
          response.body.on('end', resolve);
          response.body.on('error', reject);
        });
      } catch (err) {
        return res.status(err.message.includes('exceeds') ? 400 : 502).json({ error: err.message });
      }
    } else {
      const text = await response.text();
      const buf = Buffer.from(text, 'utf8');
      if (buf.length > bodyLimit) {
        return res.status(400).json({ error: 'Response body exceeds size limit (2MB)' });
      }
      chunks.push(buf);
    }

    const htmlBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    const html = htmlBuffer.toString('utf8');
    const $ = cheerio.load(html);

    let license,
      params,
      ctx,
      release,
      author,
      description,
      tags = [];
    const text = $.text().toLowerCase();

    // Enhanced extraction patterns with more comprehensive patterns (bounded lengths)
    const licMatch = text.match(/license[:\s-]+([a-z0-9 .\-+]{1,80})/i);
    if (licMatch) license = licMatch[1].trim();

    // More robust parameter extraction (bounded lengths)
    const pMatches = [
      text.match(/(\d{1,4})\s*billion\s*(parameters?)/i),
      text.match(/(\d{1,3})b\s*(parameters?|model)/i),
      text.match(/\b(\d{1,3})\s*(b|m)\b/i),
      text.match(/parameters?[:\s-]+(\d{1,10}\s*(b|m|billion|million))/i),
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

    const ctxMatch = text.match(/context\s*window[:\s-]+(\d{1,10}\s*(k|m))/i);
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

    // Fallback to text pattern matching if not found in URL (bounded lengths)
    if (!author) {
      const authorPatterns = [
        /(created|made|by|author|developer)[:\s-]+([a-zA-Z0-9_\-\s@.]{1,80})/i,
        /@([a-zA-Z0-9_\-]{1,80})/,
        /model by[:\s]+([a-zA-Z0-9_\-\s]{1,80})/i,
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

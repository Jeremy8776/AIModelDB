/* eslint-disable */
/**
 * Optional local web server: serves the built app and mirrors the Vite dev
 * proxies so the browser build can reach provider APIs without CORS problems.
 * Not part of the packaged desktop app (Electron proxies requests itself).
 *
 * Binds to 127.0.0.1 by default. Set HOST=0.0.0.0 only on a trusted network:
 * there is no authentication, and the proxies forward whatever API keys the
 * client sends.
 */
import express from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createRequire } from 'module';
import { registerWebhooks } from './webhooks.js';
import { registerScrape } from './scrape.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { proxyValidationMiddleware, getClientIp } = require('./proxy-middleware.js');

const app = express();
const PORT = process.env.PORT || 5173;
const HOST = process.env.HOST || '127.0.0.1';

// Static assets from dist
const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));

// Global rate limiting to prevent DOS and resource exhaustion
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // per client per window
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: req => ipKeyGenerator(getClientIp(req)),
  handler: (req, res) => res.status(429).json({ error: 'Too many requests, please try again later.' }),
});
app.use(globalRateLimiter);

// Webhooks need the raw body, so they register before the JSON parser.
registerWebhooks(app);

// JSON parser for the rest of the app
app.use(express.json({ limit: '1mb' }));
app.use(proxyValidationMiddleware());

// Mirror Vite dev proxies for production
const PROXY_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const proxy = (route, target, rewrite) =>
  app.use(
    route,
    // The proxy copies req.headers onto the outgoing request. Client Authorization and x-api-key
    // headers are forwarded as they are, so only the user agent and POST content type are overridden.
    (req, res, next) => {
      req.headers['user-agent'] = PROXY_USER_AGENT;
      if (req.method === 'POST') req.headers['content-type'] = 'application/json';
      next();
    },
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: true,
      timeout: 60000,
      proxyTimeout: 60000,
      followRedirects: true,
      pathRewrite: rewrite ? pathStr => pathStr.replace(rewrite.from, rewrite.to) : undefined,
      onProxyReq: (proxyReq, req) => {
        // Headers are set in the middleware above, not here: with followRedirects the proxy request
        // has already been flushed by the time this hook runs, so setHeader() throws and kills the process.
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

registerScrape(app);

// SPA fallback
app.get(/.*/, (req, res) => { // Express 5: a bare '*' path no longer parses, so match everything with a regex
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

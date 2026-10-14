/**
 * POST /scrape: fetch a model page from an allowlisted host and extract
 * license, parameters, release date, author, description and tags.
 *
 * Security: exact-host allowlist, https only (the request is rebuilt from the
 * matched host), redirects followed manually with the allowlist re-applied on
 * every hop, DNS results checked against private ranges, 2 MB body cap.
 */
import dns from 'dns';
import net from 'net';
import { createRequire } from 'module';
import * as cheerio from 'cheerio';

const require = createRequire(import.meta.url);
const { isPrivateAddress } = require('../electron/net-guard.js');

const ALLOWED_SCRAPE_HOSTS = new Set([
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
]);

async function resolvesToPrivateAddress(hostname) {
  if (net.isIP(hostname)) return isPrivateAddress(hostname);
  try {
    const records = await dns.promises.lookup(hostname, { all: true });
    return records.length === 0 || records.some(record => isPrivateAddress(record.address));
  } catch {
    return true; // fail closed on resolution failure
  }
}

export function registerScrape(app) {
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

        const matchedHost = ALLOWED_SCRAPE_HOSTS.has(u.hostname) ? u.hostname : '';

        if (!matchedHost) {
          return res.status(400).json({ error: 'Domain not allowed' });
        }

        if (await resolvesToPrivateAddress(matchedHost)) {
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
}

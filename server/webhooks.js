/**
 * OpenAI webhook receiver plus a live feed of recent events for the in-app console.
 *
 * - POST /webhooks/openai   raw body, HMAC-SHA256 checked against OPENAI_WEBHOOK_SECRET.
 *   When a secret is configured, unsigned or wrongly signed requests are rejected
 *   and not stored. With no secret (local development) events are kept but flagged
 *   verified=false.
 * - GET  /webhooks/openai/logs     last 100 events (headers other than a few safe ones are omitted)
 * - GET  /webhooks/openai/stream   server-sent events for new ones
 */
import crypto from 'crypto';
import express from 'express';

const MAX_EVENTS = 100;
const SIGNATURE_HEADERS = ['x-openai-signature', 'openai-signature', 'openai-signature-256', 'openai-webhook-signature'];

function signatureMatches(secret, raw, headerValues) {
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  return headerValues.some(value => {
    const cleaned = String(value).replace(/^sha256=/i, '').trim();
    if (!/^[0-9a-f]{64}$/i.test(cleaned)) return false;
    return crypto.timingSafeEqual(expected, Buffer.from(cleaned, 'hex'));
  });
}

export function registerWebhooks(app) {
  const events = [];
  const sseClients = new Set();

  const broadcast = evt => {
    const payload = `data: ${JSON.stringify(evt)}\n\n`;
    for (const res of Array.from(sseClients)) {
      try {
        res.write(payload);
      } catch {
        sseClients.delete(res);
      }
    }
  };

  app.post('/webhooks/openai', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
    try {
      const secret = process.env.OPENAI_WEBHOOK_SECRET || '';
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
      const signatures = SIGNATURE_HEADERS.map(name => req.header(name)).filter(Boolean);
      const verified = Boolean(secret) && signatures.length > 0 && signatureMatches(secret, raw, signatures);
      if (secret && !verified) {
        return res.status(401).json({ error: 'invalid signature' });
      }

      let body;
      try {
        body = JSON.parse(raw.toString('utf8') || '{}');
      } catch {
        body = { _raw: raw.toString('utf8') };
      }
      const evt = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        verified,
        headers: { 'user-agent': req.header('user-agent'), 'content-type': req.header('content-type') },
        body,
      };
      events.unshift(evt);
      if (events.length > MAX_EVENTS) events.pop();
      console.log('[OpenAI Webhook]', JSON.stringify({ id: evt.id, verified, type: body && body.type }));
      broadcast(evt);
      res.status(200).json({ received: true, verified });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.get('/webhooks/openai/logs', (req, res) => {
    res.json(events);
  });

  app.get('/webhooks/openai/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();
    events.slice(0, 10).reverse().forEach(evt => res.write(`data: ${JSON.stringify(evt)}\n\n`));
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
}

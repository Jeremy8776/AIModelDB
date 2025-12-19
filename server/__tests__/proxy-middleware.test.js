/**
 * Tests for Proxy Validation Middleware
 *
 * Tests the security middleware for Model DB proxy endpoints
 */

const { proxyValidationMiddleware, getRateLimitStats } = require('../proxy-middleware.js');

describe('Proxy Validation Middleware', () => {
    let middleware;
    let req;
    let res;
    let next;

    beforeEach(() => {
        middleware = proxyValidationMiddleware();

        // Mock request object
        req = {
            path: '/aa-api/models',
            method: 'GET',
            headers: {
                origin: 'http://localhost:5173',
                'user-agent': 'test-agent',
            },
            socket: {
                remoteAddress: '127.0.0.1',
            },
        };

        // Mock response object
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
        };

        // Mock next function
        next = jest.fn();
    });

    describe('Origin Validation', () => {
        test('should allow requests from allowed origins', () => {
            req.headers.origin = 'http://localhost:5173';

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalledWith(403);
        });

        test('should allow requests without origin header', () => {
            delete req.headers.origin;

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalledWith(403);
        });

        test('should block requests from disallowed origins', () => {
            req.headers.origin = 'http://malicious-site.com';

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'forbidden',
                message: 'Request origin not allowed',
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Rate Limiting', () => {
        test('should allow requests within rate limit', () => {
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
            expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
        });

        test('should block requests exceeding rate limit', () => {
            // Make many requests to exceed limit
            for (let i = 0; i < 101; i++) {
                middleware(req, res, next);
            }

            // The 102nd request should be blocked
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(429);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'rate_limit_exceeded',
                })
            );
        });

        test('should include Retry-After header when rate limited', () => {
            // Exceed rate limit
            for (let i = 0; i < 101; i++) {
                middleware(req, res, next);
            }

            middleware(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
        });

        test('should apply different limits to different endpoints', () => {
            // Test data source endpoint (100 req/min)
            req.path = '/aa-api/test';
            req.socket.remoteAddress = '127.0.0.10'; // Fresh IP
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();

            // Test LLM provider endpoint (20 req/min)
            req.path = '/openai-api/models';
            req.socket.remoteAddress = '127.0.0.11'; // Different IP
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Non-Proxy Endpoints', () => {
        test('should skip validation for non-proxy endpoints', () => {
            req.path = '/search';

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.setHeader).not.toHaveBeenCalled();
        });

        test('should skip validation for webhook endpoints', () => {
            req.path = '/webhooks/openai';

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.setHeader).not.toHaveBeenCalled();
        });
    });

    describe('Rate Limit Statistics', () => {
        test('should return rate limit statistics', () => {
            // Make some requests
            middleware(req, res, next);
            middleware(req, res, next);

            const stats = getRateLimitStats();

            expect(stats).toHaveProperty('totalEntries');
            expect(stats).toHaveProperty('entries');
            expect(stats.totalEntries).toBeGreaterThan(0);
        });
    });
});

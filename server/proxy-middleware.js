/**
 * Proxy Request Validation Middleware for Model DB
 *
 * Provides security middleware for proxy endpoints including:
 * - Request origin validation
 * - Rate limiting to prevent abuse
 * - Request logging for audit
 *
 * Requirements: 11.3
 */

/**
 * Rate limit entry stored for each unique key (IP address)
 */
class RateLimitEntry {
    constructor() {
        this.attempts = 0;
        this.firstAttempt = Date.now();
        this.lastAttempt = Date.now();
    }
}

/**
 * In-memory rate limit storage
 */
const rateLimitStore = new Map();

/**
 * Allowed origins for proxy requests
 * Only requests from these origins will be allowed
 */
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://0.0.0.0:5173',
    // Add production origins if needed
];

/**
 * Rate limit configuration per proxy endpoint
 */
const RATE_LIMITS = {
    // Data source proxies - more lenient limits for browsing
    '/aa-api': { maxAttempts: 100, windowMs: 60 * 1000 }, // 100 requests per minute
    '/huggingface-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/github-api': { maxAttempts: 60, windowMs: 60 * 1000 }, // GitHub has stricter limits
    '/huggingface-web': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/github-web': { maxAttempts: 60, windowMs: 60 * 1000 },
    '/aa-web': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/roboflow-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/kaggle-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/tensorart-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/civitai-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/runcomfy-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/prompthero-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/liblib-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/shakker-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/openmodeldb-api': { maxAttempts: 100, windowMs: 60 * 1000 },
    '/civitasbay-api': { maxAttempts: 100, windowMs: 60 * 1000 },

    // LLM provider proxies - stricter limits for API validation
    '/openai-api': { maxAttempts: 20, windowMs: 60 * 1000 }, // 20 requests per minute
    '/anthropic-api': { maxAttempts: 20, windowMs: 60 * 1000 },
    '/cohere-api': { maxAttempts: 20, windowMs: 60 * 1000 },
    '/google-api': { maxAttempts: 20, windowMs: 60 * 1000 },
    '/deepseek-api': { maxAttempts: 20, windowMs: 60 * 1000 },
    '/perplexity-api': { maxAttempts: 20, windowMs: 60 * 1000 },
    '/openrouter-api': { maxAttempts: 20, windowMs: 60 * 1000 },
};

/**
 * Get client IP address from request
 *
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket.remoteAddress ||
        req.connection.remoteAddress ||
        'unknown'
    );
}

/**
 * Get proxy endpoint from request path
 *
 * @param {string} path - Request path
 * @returns {string} Proxy endpoint identifier
 */
function getProxyEndpoint(path) {
    for (const endpoint of Object.keys(RATE_LIMITS)) {
        if (path.startsWith(endpoint)) {
            return endpoint;
        }
    }
    return null;
}

/**
 * Check if request is allowed based on rate limits
 *
 * @param {string} key - Unique identifier (IP + endpoint)
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Rate limit result
 */
function checkRateLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    // No previous attempts - allow and create entry
    if (!entry) {
        const newEntry = new RateLimitEntry();
        rateLimitStore.set(key, newEntry);

        return {
            allowed: true,
            remaining: maxAttempts - 1,
            resetAt: now + windowMs,
        };
    }

    // Check if window has expired - reset counter
    if (now - entry.firstAttempt >= windowMs) {
        const newEntry = new RateLimitEntry();
        rateLimitStore.set(key, newEntry);

        return {
            allowed: true,
            remaining: maxAttempts - 1,
            resetAt: now + windowMs,
        };
    }

    // Within window - check if limit exceeded
    if (entry.attempts >= maxAttempts) {
        const resetAt = entry.firstAttempt + windowMs;
        const retryAfter = Math.ceil((resetAt - now) / 1000);

        return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter,
        };
    }

    // Within window and under limit - increment and allow
    entry.attempts += 1;
    entry.lastAttempt = now;
    rateLimitStore.set(key, entry);

    return {
        allowed: true,
        remaining: maxAttempts - entry.attempts,
        resetAt: entry.firstAttempt + windowMs,
    };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits() {
    const now = Date.now();
    let removedCount = 0;

    const keysToRemove = [];
    rateLimitStore.forEach((entry, key) => {
        // Remove entries older than 1 hour
        if (now - entry.firstAttempt >= 60 * 60 * 1000) {
            keysToRemove.push(key);
        }
    });

    keysToRemove.forEach(key => {
        rateLimitStore.delete(key);
        removedCount++;
    });

    if (removedCount > 0) {
        console.log(`[Proxy Middleware] Cleaned up ${removedCount} expired rate limit entries`);
    }
}

// Start cleanup interval (every 10 minutes)
setInterval(cleanupRateLimits, 10 * 60 * 1000);

/**
 * Validate request origin
 *
 * @param {Object} req - Express request object
 * @returns {boolean} True if origin is allowed
 */
function validateOrigin(req) {
    const origin = req.headers.origin || req.headers.referer;

    // Allow requests without origin (same-origin or direct requests)
    if (!origin) {
        return true;
    }

    // Check if origin is in allowed list
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

/**
 * Log proxy request for audit
 *
 * @param {Object} req - Express request object
 * @param {string} endpoint - Proxy endpoint
 * @param {string} clientIp - Client IP address
 * @param {Object} rateLimitResult - Rate limit check result
 */
function logProxyRequest(req, endpoint, clientIp, rateLimitResult) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint,
        path: req.path,
        clientIp,
        origin: req.headers.origin || 'none',
        userAgent: req.headers['user-agent'] || 'none',
        rateLimitRemaining: rateLimitResult.remaining,
        allowed: rateLimitResult.allowed,
    };

    // Log to console (in production, this could go to a file or logging service)
    if (!rateLimitResult.allowed) {
        console.warn('[Proxy Middleware] Rate limit exceeded:', JSON.stringify(logEntry));
    } else {
        console.log('[Proxy Middleware] Request:', JSON.stringify(logEntry));
    }
}

/**
 * Proxy validation middleware
 *
 * Validates proxy requests for:
 * - Origin validation
 * - Rate limiting
 * - Audit logging
 *
 * @returns {Function} Express middleware function
 */
function proxyValidationMiddleware() {
    return (req, res, next) => {
        // Get proxy endpoint
        const endpoint = getProxyEndpoint(req.path);

        // If not a proxy endpoint, skip validation
        if (!endpoint) {
            return next();
        }

        // Validate origin
        if (!validateOrigin(req)) {
            console.warn(
                `[Proxy Middleware] Invalid origin: ${req.headers.origin || 'none'} for ${req.path}`
            );
            return res.status(403).json({
                error: 'forbidden',
                message: 'Request origin not allowed',
            });
        }

        // Get rate limit configuration for this endpoint
        const rateLimitConfig = RATE_LIMITS[endpoint];
        if (!rateLimitConfig) {
            // No rate limit configured, allow request
            return next();
        }

        // Check rate limit
        const clientIp = getClientIp(req);
        const rateLimitKey = `${clientIp}:${endpoint}`;
        const rateLimitResult = checkRateLimit(
            rateLimitKey,
            rateLimitConfig.maxAttempts,
            rateLimitConfig.windowMs
        );

        // Log request for audit
        logProxyRequest(req, endpoint, clientIp, rateLimitResult);

        // Check if rate limit exceeded
        if (!rateLimitResult.allowed) {
            res.setHeader('Retry-After', rateLimitResult.retryAfter);
            res.setHeader('X-RateLimit-Limit', rateLimitConfig.maxAttempts);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt);

            return res.status(429).json({
                error: 'rate_limit_exceeded',
                message: 'Too many requests to this endpoint',
                retryAfter: rateLimitResult.retryAfter,
            });
        }

        // Add rate limit headers to response
        res.setHeader('X-RateLimit-Limit', rateLimitConfig.maxAttempts);
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
        res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt);

        // Request is valid, proceed
        next();
    };
}

/**
 * Get rate limit statistics (for monitoring)
 *
 * @returns {Object} Rate limit statistics
 */
function getRateLimitStats() {
    const stats = {
        totalEntries: rateLimitStore.size,
        entries: [],
    };

    rateLimitStore.forEach((entry, key) => {
        stats.entries.push({
            key,
            attempts: entry.attempts,
            firstAttempt: new Date(entry.firstAttempt).toISOString(),
            lastAttempt: new Date(entry.lastAttempt).toISOString(),
        });
    });

    return stats;
}

module.exports = {
    proxyValidationMiddleware,
    getRateLimitStats,
    cleanupRateLimits,
};

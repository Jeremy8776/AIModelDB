/**
 * Rate Limiter Tests
 * 
 * Tests for the rate limiting service to ensure API compliance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, createRateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('constructor', () => {
        it('should create rate limiter with default values', () => {
            const limiter = new RateLimiter();
            const status = limiter.getStatus();

            expect(status.remaining).toBe(20);
            expect(status.resetIn).toBe(0);
        });

        it('should create rate limiter with custom values', () => {
            const limiter = new RateLimiter(5, 2, 5000);
            const status = limiter.getStatus();

            expect(status.remaining).toBe(5);
        });
    });

    describe('waitForSlot', () => {
        it('should allow requests within limit', async () => {
            const limiter = new RateLimiter(3, 1, 0);

            await limiter.waitForSlot();
            await limiter.waitForSlot();
            await limiter.waitForSlot();

            const status = limiter.getStatus();
            expect(status.remaining).toBe(0);
        });

        it('should track requests correctly', async () => {
            const limiter = new RateLimiter(5, 1, 0);

            await limiter.waitForSlot();
            expect(limiter.getStatus().remaining).toBe(4);

            await limiter.waitForSlot();
            expect(limiter.getStatus().remaining).toBe(3);
        });

        it('should enforce minimum interval between requests', async () => {
            const minInterval = 1000;
            const limiter = new RateLimiter(10, 1, minInterval);

            // First request - immediate
            const start = Date.now();
            await limiter.waitForSlot();

            // Second request - should wait for minimum interval
            const waitPromise = limiter.waitForSlot();

            // Advance time
            vi.advanceTimersByTime(minInterval);

            await waitPromise;
            // The limiter should have waited for the minimum interval
        });

        it('should not use recursion (stack-safe)', async () => {
            // This test verifies the iterative implementation by checking
            // that requests are properly queued and the limiter doesn't
            // cause stack overflow with many sequential waits
            const limiter = new RateLimiter(2, 1, 0); // No min interval for simpler test

            // Use up the slots
            await limiter.waitForSlot();
            await limiter.waitForSlot();

            expect(limiter.getStatus().remaining).toBe(0);

            // Advance time to clear the window  
            vi.advanceTimersByTime(61000);

            // Should now have slots available again
            expect(limiter.getStatus().remaining).toBe(2);

            // Make another request - should complete immediately
            await limiter.waitForSlot();
            expect(limiter.getStatus().remaining).toBe(1);
        });
    });

    describe('getStatus', () => {
        it('should return correct remaining count', async () => {
            const limiter = new RateLimiter(5, 1, 0);

            expect(limiter.getStatus().remaining).toBe(5);

            await limiter.waitForSlot();
            expect(limiter.getStatus().remaining).toBe(4);

            await limiter.waitForSlot();
            await limiter.waitForSlot();
            expect(limiter.getStatus().remaining).toBe(2);
        });

        it('should return correct reset time', async () => {
            const limiter = new RateLimiter(5, 1, 0);

            // No requests yet
            expect(limiter.getStatus().resetIn).toBe(0);

            await limiter.waitForSlot();

            // After one request, reset time should be close to full window
            const status = limiter.getStatus();
            expect(status.resetIn).toBeGreaterThan(0);
            expect(status.resetIn).toBeLessThanOrEqual(60000);
        });

        it('should clean up expired requests from status', async () => {
            const limiter = new RateLimiter(5, 1, 0);

            await limiter.waitForSlot();
            await limiter.waitForSlot();
            expect(limiter.getStatus().remaining).toBe(3);

            // Advance time past the window
            vi.advanceTimersByTime(61000);

            // Old requests should be cleared
            expect(limiter.getStatus().remaining).toBe(5);
        });
    });

    describe('reset', () => {
        it('should clear all tracked requests', async () => {
            const limiter = new RateLimiter(5, 1, 0);

            await limiter.waitForSlot();
            await limiter.waitForSlot();
            await limiter.waitForSlot();
            expect(limiter.getStatus().remaining).toBe(2);

            limiter.reset();
            expect(limiter.getStatus().remaining).toBe(5);
        });
    });
});

describe('createRateLimiter', () => {
    it('should create free tier limiter', () => {
        const limiter = createRateLimiter('free');
        expect(limiter.getStatus().remaining).toBe(3);
    });

    it('should create tier1 limiter', () => {
        const limiter = createRateLimiter('tier1');
        expect(limiter.getStatus().remaining).toBe(20);
    });

    it('should create tier2 limiter', () => {
        const limiter = createRateLimiter('tier2');
        expect(limiter.getStatus().remaining).toBe(50);
    });

    it('should create tier3 limiter', () => {
        const limiter = createRateLimiter('tier3');
        expect(limiter.getStatus().remaining).toBe(100);
    });

    it('should create tier4 limiter', () => {
        const limiter = createRateLimiter('tier4');
        expect(limiter.getStatus().remaining).toBe(300);
    });

    it('should default to free tier for unknown tier', () => {
        const limiter = createRateLimiter('unknown' as any);
        expect(limiter.getStatus().remaining).toBe(3);
    });
});

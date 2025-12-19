// Rate limiter for API compliance
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number; // in milliseconds
  private minInterval: number; // minimum time between requests in ms

  constructor(maxRequests: number = 20, timeWindowMinutes: number = 1, minIntervalMs: number = 3000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMinutes * 60 * 1000; // convert to ms
    this.minInterval = minIntervalMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if we're at the limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest) + 1000; // +1s buffer
      console.log(`Rate limit protection: waiting ${Math.round(waitTime/1000)}s before next request`);
      await this.wait(waitTime);
      return this.waitForSlot(); // Recursive check
    }

    // Check minimum interval since last request
    if (this.requests.length > 0) {
      const lastRequest = Math.max(...this.requests);
      const timeSinceLastRequest = now - lastRequest;
      
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        console.log(`Rate limit protection: waiting ${Math.round(waitTime/1000)}s between requests`);
        await this.wait(waitTime);
      }
    }

    // Record this request
    this.requests.push(now);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): { remaining: number; resetIn: number } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    const remaining = Math.max(0, this.maxRequests - this.requests.length);
    const resetIn = this.requests.length > 0 
      ? Math.max(0, this.timeWindow - (now - Math.min(...this.requests)))
      : 0;
    
    return { remaining, resetIn };
  }

  reset(): void {
    this.requests = [];
  }
}

// Create rate limiters for different API tiers
export const createRateLimiter = (tier: 'free' | 'tier1' | 'tier2' | 'tier3' = 'free'): RateLimiter => {
  switch (tier) {
    case 'free':
      return new RateLimiter(3, 1, 20000); // 3 requests/minute, 20s between requests
    case 'tier1':
      return new RateLimiter(20, 1, 3000); // 20 requests/minute, 3s between requests
    case 'tier2':
      return new RateLimiter(50, 1, 1200); // 50 requests/minute, 1.2s between requests
    case 'tier3':
      return new RateLimiter(100, 1, 600); // 100 requests/minute, 0.6s between requests
    default:
      return new RateLimiter(3, 1, 20000); // Default to free tier
  }
};

// Global rate limiter instance
export const globalRateLimiter = createRateLimiter('free');

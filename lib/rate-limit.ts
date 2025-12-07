/**
 * In-Memory Rate Limiting Utility
 *
 * NOTE: This is a basic in-memory implementation suitable for development
 * and single-server deployments. For production with multiple servers,
 * consider using @upstash/ratelimit with Redis.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  async limit(identifier: string, config: RateLimitConfig): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const key = identifier;

    let entry = this.requests.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      this.requests.set(key, entry);

      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      reset: entry.resetTime,
    };
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Public endpoints - very strict
  PUBLIC: {
    maxRequests: 10,
    windowMs: 10 * 1000, // 10 requests per 10 seconds
  },

  // Authenticated endpoints - moderate
  AUTHENTICATED: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 60 requests per minute
  },

  // Upload endpoints - strict
  UPLOAD: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 uploads per minute
  },

  // API read endpoints - moderate
  API_READ: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests per minute
  },

  // API write endpoints - stricter
  API_WRITE: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 requests per minute
  },

  // Contact/messaging endpoints - very strict
  CONTACT: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 3 requests per minute
  },
} as const;

/**
 * Apply rate limiting to a request
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.AUTHENTICATED
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  return rateLimiter.limit(identifier, config);
}

/**
 * Get rate limit identifier from request
 * Prioritizes user ID over IP address
 * @param userId - Optional authenticated user ID
 * @param ipAddress - Optional IP address
 * @returns Identifier for rate limiting
 */
export function getRateLimitIdentifier(
  userId?: string | null,
  ipAddress?: string | null
): string {
  if (userId) {
    return `user:${userId}`;
  }
  if (ipAddress) {
    return `ip:${ipAddress}`;
  }
  return 'anonymous';
}

/**
 * Get IP address from request headers
 * Handles common proxy headers (Vercel, Cloudflare, etc.)
 * @param headers - Request headers
 * @returns IP address or null
 */
export function getClientIp(headers: Headers): string | null {
  // Check common proxy headers in order of preference
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}

/**
 * Create rate limit headers for response
 * @param result - Rate limit result
 * @returns Headers object
 */
export function createRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    rateLimiter.cleanup();
  });
}

export default rateLimiter;

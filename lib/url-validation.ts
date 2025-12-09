/**
 * URL Validation Utility
 * Prevents XSS, Open Redirect, and SSRF attacks
 */

const BLOCKED_PROTOCOLS = ['javascript', 'data', 'file', 'vbscript', 'blob'];
const ALLOWED_PROTOCOLS = ['http', 'https'];

const PRIVATE_IP_RANGES = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // AWS metadata service
  /^::1$/, // IPv6 localhost
  /^fc00:/i, // IPv6 private
  /^fe80:/i, // IPv6 link-local
];

export interface UrlValidationOptions {
  allowedProtocols?: string[];
  allowPrivateIPs?: boolean;
  requireHttps?: boolean;
}

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validates and sanitizes URLs to prevent security vulnerabilities
 * @param url - The URL to validate
 * @param options - Validation options
 * @returns Validation result with sanitized URL if valid
 */
export function validateUrl(
  url: string,
  options: UrlValidationOptions = {}
): UrlValidationResult {
  const {
    allowedProtocols = ALLOWED_PROTOCOLS,
    allowPrivateIPs = false,
    requireHttps = false,
  } = options;

  // Basic checks
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Check for blocked protocols in raw string (case-insensitive)
  const lowerUrl = trimmedUrl.toLowerCase();
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (lowerUrl.startsWith(`${protocol}:`)) {
      return {
        valid: false,
        error: `Blocked protocol: ${protocol}`,
      };
    }
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }

  // Validate protocol
  const protocol = parsed.protocol.replace(':', '');
  if (!allowedProtocols.includes(protocol)) {
    return {
      valid: false,
      error: `Protocol not allowed: ${protocol}. Allowed: ${allowedProtocols.join(', ')}`,
    };
  }

  // Require HTTPS if specified
  if (requireHttps && protocol !== 'https') {
    return {
      valid: false,
      error: 'HTTPS is required',
    };
  }

  // Check for private/internal IPs (SSRF protection)
  if (!allowPrivateIPs) {
    const hostname = parsed.hostname.toLowerCase();

    for (const pattern of PRIVATE_IP_RANGES) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          error: 'Private/internal IP addresses are not allowed',
        };
      }
    }

    // Check for IP address format (additional SSRF protection)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      // It's an IP - check if it's in private ranges
      const octets = hostname.split('.').map(Number);
      if (
        octets[0] === 0 || // 0.0.0.0/8
        (octets[0] === 10) || // 10.0.0.0/8
        (octets[0] === 127) || // 127.0.0.0/8
        (octets[0] === 169 && octets[1] === 254) || // 169.254.0.0/16
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || // 172.16.0.0/12
        (octets[0] === 192 && octets[1] === 168) // 192.168.0.0/16
      ) {
        return {
          valid: false,
          error: 'Private IP addresses are not allowed',
        };
      }
    }
  }

  // Additional security checks
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'URLs with embedded credentials are not allowed',
    };
  }

  return {
    valid: true,
    sanitized: parsed.toString(),
  };
}

/**
 * Validates a social media URL for specific platforms
 * @param url - The URL to validate
 * @param platform - The platform (e.g., 'twitch', 'youtube', 'instagram')
 * @returns Validation result
 */
export function validateSocialUrl(
  url: string,
  platform: 'twitch' | 'youtube' | 'instagram' | 'twitter' | 'discord'
): UrlValidationResult {
  const result = validateUrl(url, { requireHttps: true });
  if (!result.valid) {
    return result;
  }

  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();

  const platformDomains: Record<string, string[]> = {
    twitch: ['twitch.tv', 'www.twitch.tv'],
    youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'],
    instagram: ['instagram.com', 'www.instagram.com'],
    twitter: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'],
    discord: ['discord.gg', 'discord.com'],
  };

  const allowedDomains = platformDomains[platform];
  if (allowedDomains && !allowedDomains.includes(hostname)) {
    return {
      valid: false,
      error: `URL must be from ${platform}. Expected domains: ${allowedDomains.join(', ')}`,
    };
  }

  return result;
}

/**
 * Validates an image URL
 * @param url - The image URL to validate
 * @returns Validation result
 */
export function validateImageUrl(url: string): UrlValidationResult {
  const result = validateUrl(url);
  if (!result.valid) {
    return result;
  }

  const parsed = new URL(url);
  const pathname = parsed.pathname.toLowerCase();

  // Check for common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));

  if (!hasImageExtension) {
    return {
      valid: false,
      error: 'URL must point to an image file (.jpg, .png, .gif, .webp, .svg)',
    };
  }

  return result;
}

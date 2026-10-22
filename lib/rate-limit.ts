import "server-only";

import net from 'node:net';
import tls from 'node:tls';
import { createHash } from 'node:crypto';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

type RespValue = string | number | null | RespValue[] | RedisCommandError;

const REDIS_TIMEOUT_MS = 1500;
const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

let redisWarningLogged = false;

class RedisCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisCommandError';
  }
}

class InMemoryRateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
    this.cleanupInterval.unref?.();
  }

  async limit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      this.requests.set(identifier, entry);

      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: entry.resetTime,
      };
    }

    entry.count += 1;

    return {
      success: entry.count <= config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      reset: entry.resetTime,
    };
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

class RateLimiter {
  private memory = new InMemoryRateLimiter();

  async limit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        return await redisLimit(redisUrl, identifier, config);
      } catch (error) {
        if (!redisWarningLogged) {
          redisWarningLogged = true;
          console.warn(
            'Redis rate limiting unavailable; falling back to in-memory limits.',
            error
          );
        }
      }
    }

    return this.memory.limit(identifier, config);
  }

  cleanup() {
    this.memory.cleanup();
  }
}

export const RATE_LIMITS = {
  PUBLIC: {
    maxRequests: 10,
    windowMs: 10 * 1000,
  },
  AUTHENTICATED: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  UPLOAD: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
  API_READ: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  API_WRITE: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
  CONTACT: {
    maxRequests: 3,
    windowMs: 60 * 1000,
  },
  CHAT: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
} as const;

const rateLimiter = new RateLimiter();

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.AUTHENTICATED
): Promise<RateLimitResult> {
  return rateLimiter.limit(identifier, config);
}

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

export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return headers.get('x-real-ip') || headers.get('cf-connecting-ip');
}

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

async function redisLimit(
  redisUrl: string,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const keyHash = createHash('sha256')
    .update(`${config.maxRequests}:${config.windowMs}:${identifier}`)
    .digest('hex');
  const key = `hw:rate-limit:${keyHash}`;
  const socket = await connectRedis(redisUrl);

  try {
    await authenticateRedis(socket, redisUrl);
    const result = await redisCommand(socket, [
      'EVAL',
      RATE_LIMIT_SCRIPT,
      '1',
      key,
      config.windowMs.toString(),
    ]);

    if (!Array.isArray(result) || result.length < 2) {
      throw new Error('Unexpected Redis rate limit response.');
    }

    const count = Number(result[0]);
    const ttl = Math.max(0, Number(result[1]));
    const reset = Date.now() + (Number.isFinite(ttl) && ttl > 0 ? ttl : config.windowMs);

    return {
      success: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      reset,
    };
  } finally {
    socket.end();
  }
}

async function authenticateRedis(socket: net.Socket | tls.TLSSocket, redisUrl: string) {
  const url = new URL(redisUrl);
  const username = decodeURIComponent(url.username || '');
  const password = decodeURIComponent(url.password || '');

  if (password) {
    await redisCommand(
      socket,
      username ? ['AUTH', username, password] : ['AUTH', password]
    );
  }

  const db = url.pathname.replace('/', '');
  if (db && db !== '0') {
    await redisCommand(socket, ['SELECT', db]);
  }
}

function connectRedis(redisUrl: string): Promise<net.Socket | tls.TLSSocket> {
  const url = new URL(redisUrl);
  const isTls = url.protocol === 'rediss:';
  const port = Number(url.port || (isTls ? 6380 : 6379));
  const socket = isTls
    ? tls.connect({ host: url.hostname, port, servername: url.hostname })
    : net.connect({ host: url.hostname, port });
  const readyEvent = isTls ? 'secureConnect' : 'connect';

  socket.setNoDelay(true);
  socket.setTimeout(REDIS_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off(readyEvent, onReady);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    };
    const onReady = () => {
      cleanup();
      resolve(socket);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      socket.destroy();
      reject(new Error('Redis connection timed out.'));
    };

    socket.once(readyEvent, onReady);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

async function redisCommand(
  socket: net.Socket | tls.TLSSocket,
  args: string[]
): Promise<RespValue> {
  socket.write(encodeRedisCommand(args));
  const value = await readRedisResponse(socket);

  if (value instanceof RedisCommandError) {
    throw value;
  }

  return value;
}

function encodeRedisCommand(args: string[]): Buffer {
  const parts = [`*${args.length}\r\n`];
  for (const arg of args) {
    parts.push(`$${Buffer.byteLength(arg)}\r\n${arg}\r\n`);
  }
  return Buffer.from(parts.join(''));
}

function readRedisResponse(socket: net.Socket | tls.TLSSocket): Promise<RespValue> {
  let buffer = Buffer.alloc(0);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    };
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const parsed = parseResp(buffer, 0);
        if (!parsed) {
          return;
        }
        cleanup();
        resolve(parsed.value);
      } catch (error) {
        cleanup();
        socket.destroy();
        reject(error);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      socket.destroy();
      reject(new Error('Redis command timed out.'));
    };

    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

function parseResp(
  buffer: Buffer,
  offset: number
): { value: RespValue; offset: number } | null {
  if (offset >= buffer.length) {
    return null;
  }

  const prefix = String.fromCharCode(buffer[offset]);
  const lineEnd = buffer.indexOf('\r\n', offset + 1);

  if (lineEnd === -1) {
    return null;
  }

  const line = buffer.toString('utf8', offset + 1, lineEnd);
  const next = lineEnd + 2;

  if (prefix === '+') {
    return { value: line, offset: next };
  }
  if (prefix === '-') {
    return { value: new RedisCommandError(line), offset: next };
  }
  if (prefix === ':') {
    return { value: Number(line), offset: next };
  }
  if (prefix === '$') {
    const length = Number(line);
    if (length === -1) {
      return { value: null, offset: next };
    }
    const end = next + length;
    if (buffer.length < end + 2) {
      return null;
    }
    return {
      value: buffer.toString('utf8', next, end),
      offset: end + 2,
    };
  }
  if (prefix === '*') {
    const count = Number(line);
    if (count === -1) {
      return { value: null, offset: next };
    }

    const values: RespValue[] = [];
    let cursor = next;
    for (let index = 0; index < count; index += 1) {
      const parsed = parseResp(buffer, cursor);
      if (!parsed) {
        return null;
      }
      values.push(parsed.value);
      cursor = parsed.offset;
    }

    return { value: values, offset: cursor };
  }

  throw new Error(`Unsupported Redis response prefix: ${prefix}`);
}

if (typeof process !== 'undefined') {
  process.on('exit', () => {
    rateLimiter.cleanup();
  });
}

export default rateLimiter;

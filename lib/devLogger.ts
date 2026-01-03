/**
 * Development logger utility
 * Only logs in development mode
 */

const isDev = process.env.NODE_ENV === 'development';

export const devLog = {
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },
};

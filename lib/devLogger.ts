/**
 * @module devLogger
 * @description Development-only logging utility
 * Prevents sensitive data from being logged in production
 * @author House Wolf Dev Team
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const devLog = {
  /**
   * Log informational messages (development only)
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (development only)
   */
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always logged, but sanitized in production)
   */
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, log only error type without sensitive details
      console.error("[Error occurred - check logs for details]");
    }
  },

  /**
   * Log debug messages with sensitive data (development only)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log("[DEBUG]", ...args);
    }
  },
};

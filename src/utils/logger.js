/**
 * BridgeGPT — Structured Logger
 *
 * Outputs JSON-formatted log entries with timestamps.
 * Respects LOG_LEVEL from environment variables.
 *
 * @module utils/logger
 */

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Get the configured log level from environment.
 *
 * @returns {number} The numeric log level threshold
 */
function getConfiguredLevel() {
    const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    return LOG_LEVELS[level] ?? LOG_LEVELS.info;
}

/**
 * Format and output a log entry as structured JSON.
 *
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Record<string, unknown>} [metadata] - Additional key-value pairs to include
 */
function log(level, message, metadata = {}) {
    const configuredLevel = getConfiguredLevel();
    const numericLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;

    if (numericLevel < configuredLevel) {
        return;
    }

    const entry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...metadata,
    };

    const output = JSON.stringify(entry);

    switch (level) {
        case 'error':
            console.error(output);
            break;
        case 'warn':
            console.warn(output);
            break;
        case 'debug':
            console.debug(output);
            break;
        default:
            console.log(output);
    }
}

/**
 * Structured JSON logger for BridgeGPT.
 *
 * Usage:
 * ```javascript
 * import { logger } from './utils/logger.js';
 * logger.info('Server started', { port: 3000 });
 * logger.error('Failed to connect', { error: err.message });
 * ```
 */
export const logger = {
    /**
     * Log a debug message. Only visible when LOG_LEVEL=debug.
     *
     * @param {string} message - Debug message
     * @param {Record<string, unknown>} [metadata] - Additional context
     */
    debug(message, metadata) {
        log('debug', message, metadata);
    },

    /**
     * Log an informational message.
     *
     * @param {string} message - Info message
     * @param {Record<string, unknown>} [metadata] - Additional context
     */
    info(message, metadata) {
        log('info', message, metadata);
    },

    /**
     * Log a warning message.
     *
     * @param {string} message - Warning message
     * @param {Record<string, unknown>} [metadata] - Additional context
     */
    warn(message, metadata) {
        log('warn', message, metadata);
    },

    /**
     * Log an error message.
     *
     * @param {string} message - Error message
     * @param {Record<string, unknown>} [metadata] - Additional context
     */
    error(message, metadata) {
        log('error', message, metadata);
    },
};

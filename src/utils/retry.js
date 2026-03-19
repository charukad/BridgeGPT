/**
 * BridgeGPT — Retry Handler
 *
 * Wraps async functions with exponential backoff retry logic.
 * Distinguishes between retryable and non-retryable errors.
 *
 * @module utils/retry
 */

import { logger } from './logger.js';
import { sleep } from './helpers.js';

/**
 * Execute a function with automatic retry on failure.
 *
 * Uses exponential backoff: delay doubles with each attempt.
 * Only retries errors that are marked as retryable.
 *
 * @param {Function} fn - Async function to execute
 * @param {object} [options] - Retry options
 * @param {number} [options.maxRetries] - Max retry attempts (from env or default 3)
 * @param {number} [options.baseDelay] - Base delay in ms (from env or default 2000)
 * @param {Function} [options.shouldRetry] - Custom predicate to determine if error is retryable
 * @param {Function} [options.onRetry] - Called before each retry with (error, attempt)
 * @returns {Promise<*>} The result of the function
 * @throws {Error} The last error if all retries are exhausted
 *
 * @example
 * const result = await withRetry(
 *     () => sendMessage(page, "Hello"),
 *     { maxRetries: 3, baseDelay: 2000 }
 * );
 */
export async function withRetry(fn, options = {}) {
    const maxRetries = options.maxRetries ?? parseInt(process.env.MAX_RETRIES || '3', 10);
    const baseDelay = options.baseDelay ?? parseInt(process.env.RETRY_DELAY_MS || '2000', 10);
    const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
    const onRetry = options.onRetry ?? null;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                logger.error('All retry attempts exhausted', {
                    attempts: maxRetries,
                    error: error.message,
                });
                throw error;
            }

            if (!shouldRetry(error)) {
                logger.debug('Error is not retryable, throwing immediately', {
                    error: error.message,
                });
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);

            logger.warn('Retrying after error', {
                attempt,
                maxRetries,
                delayMs: delay,
                error: error.message,
            });

            if (onRetry) {
                await onRetry(error, attempt);
            }

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Default predicate to determine if an error should be retried.
 *
 * Retryable:
 * - Network timeouts
 * - ChatGPT "Something went wrong"
 * - Browser/page crashes
 * - Rate limits (with longer delay)
 *
 * Not retryable:
 * - Session expired (needs manual login)
 * - Invalid input (client error)
 *
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function defaultShouldRetry(error) {
    const message = error.message?.toLowerCase() || '';

    // Non-retryable errors
    const nonRetryable = [
        'session expired',
        'login required',
        'invalid api key',
        'missing api key',
        'invalid request',
        'must be a non-empty',
    ];

    for (const phrase of nonRetryable) {
        if (message.includes(phrase)) {
            return false;
        }
    }

    // Explicitly marked retryable
    if (error.retryable === true) {
        return true;
    }

    // Retryable patterns
    const retryable = [
        'timeout',
        'timed out',
        'something went wrong',
        'network',
        'navigation',
        'crash',
        'rate limit',
        'empty response',
        'econnrefused',
        'econnreset',
        'epipe',
        'socket hang up',
    ];

    for (const phrase of retryable) {
        if (message.includes(phrase)) {
            return true;
        }
    }

    // Default: don't retry unknown errors
    return false;
}

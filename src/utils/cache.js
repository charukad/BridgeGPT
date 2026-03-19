/**
 * BridgeGPT — Response Cache
 *
 * In-memory cache with TTL for caching identical ChatGPT requests.
 * Avoids re-asking ChatGPT the same question within the TTL window.
 *
 * @module utils/cache
 */

import { logger } from './logger.js';
import { hashString } from './helpers.js';

/**
 * In-memory response cache with TTL and hit/miss tracking.
 *
 * @example
 * const cache = new ResponseCache(3600);
 * cache.set("key", "value");
 * cache.get("key"); // "value"
 */
export class ResponseCache {
    /**
     * @param {number} [ttlSeconds] - Cache entry lifetime (from env or default 3600)
     */
    constructor(ttlSeconds) {
        this.ttl = (ttlSeconds ?? parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10)) * 1000;

        /** @type {Map<string, {value: string, timestamp: number}>} */
        this.cache = new Map();

        /** @type {number} */
        this.hits = 0;

        /** @type {number} */
        this.misses = 0;
    }

    /**
     * Generate a cache key from a messages array.
     *
     * @param {Array<{role: string, content: string}>} messages - Chat messages
     * @returns {string} SHA-256 hash of the messages
     */
    static createKey(messages) {
        return hashString(JSON.stringify(messages));
    }

    /**
     * Get a cached response by key.
     * Returns null if not found or expired.
     *
     * @param {string} key - Cache key
     * @returns {string|null} Cached response content or null
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            return null;
        }

        // Check TTL
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            this.misses++;
            logger.debug('Cache entry expired', { key: key.substring(0, 8) });
            return null;
        }

        this.hits++;
        logger.debug('Cache hit', { key: key.substring(0, 8) });
        return entry.value;
    }

    /**
     * Store a response in the cache.
     *
     * @param {string} key - Cache key
     * @param {string} value - Response content to cache
     */
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
        logger.debug('Cache set', { key: key.substring(0, 8), entries: this.cache.size });
    }

    /**
     * Check if a key exists in the cache (and is not expired).
     *
     * @param {string} key - Cache key
     * @returns {boolean} True if valid entry exists
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Clear all cache entries.
     */
    clear() {
        this.cache.clear();
        logger.info('Cache cleared');
    }

    /**
     * Check if caching is enabled via environment variable.
     *
     * @returns {boolean} True if CACHE_ENABLED is "true"
     */
    static isEnabled() {
        return process.env.CACHE_ENABLED === 'true';
    }

    /**
     * Get cache statistics.
     *
     * @returns {object} Cache stats
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            enabled: ResponseCache.isEnabled(),
            entries: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%',
        };
    }
}

/**
 * BridgeGPT — Token Counter
 *
 * Uses js-tiktoken (the same tokenizer OpenAI uses internally) to count
 * tokens in text and message arrays. Allows v2 to return real usage stats.
 *
 * @module utils/tokenizer
 */

import { encodingForModel } from 'js-tiktoken';

/** GPT-4o encoding — close enough for all current ChatGPT models */
const enc = encodingForModel('gpt-4o');

/**
 * Count tokens in a plain text string.
 *
 * @param {string} text - The text to tokenize
 * @returns {number} Token count
 *
 * @example
 * countTokens("Hello, world!"); // → 4
 */
export function countTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    try {
        return enc.encode(text).length;
    } catch {
        // Fall back to rough word-based estimate if encoding fails
        return Math.ceil(text.split(/\s+/).length * 1.3);
    }
}

/**
 * Count tokens for an OpenAI-format messages array.
 * Each message has ~4 tokens of overhead for role/formatting.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {number} Estimated prompt token count
 *
 * @example
 * countMessageTokens([{ role: 'user', content: 'Hello!' }]); // → 8
 */
export function countMessageTokens(messages) {
    if (!Array.isArray(messages)) return 0;
    return messages.reduce((total, msg) => {
        return total + countTokens(msg.content ?? '') + 4; // 4 tokens per message overhead
    }, 3); // 3 tokens for reply priming
}

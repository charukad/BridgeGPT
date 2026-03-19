/**
 * BridgeGPT — Helper Utilities
 *
 * Shared utility functions used across the application.
 * Includes OpenAI-compatible response formatting.
 *
 * @module utils/helpers
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate a unique completion ID in OpenAI format.
 *
 * @returns {string} ID in format "chatcmpl-{uuid}"
 *
 * @example
 * generateId(); // "chatcmpl-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 */
export function generateId() {
    return `chatcmpl-${uuidv4()}`;
}

/**
 * Sleep for a specified duration.
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>} Resolves after the specified duration
 *
 * @example
 * await sleep(2000); // Wait 2 seconds
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a SHA-256 hash of a string.
 * Used for creating cache keys from message content.
 *
 * @param {string} str - Input string to hash
 * @returns {string} Hex-encoded SHA-256 hash
 *
 * @example
 * hashString("Hello world"); // "64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c"
 */
export function hashString(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Format a chat completion response in OpenAI-compatible JSON format.
 *
 * @param {string} content - The assistant's response text
 * @param {string} [id] - Optional completion ID (auto-generated if omitted)
 * @returns {object} OpenAI-compatible chat completion response
 *
 * @example
 * const response = formatResponse("Hello! How can I help?");
 * // {
 * //   id: "chatcmpl-...",
 * //   object: "chat.completion",
 * //   created: 1711000000,
 * //   model: "bridgegpt",
 * //   choices: [{
 * //     index: 0,
 * //     message: { role: "assistant", content: "Hello! How can I help?" },
 * //     finish_reason: "stop"
 * //   }],
 * //   usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
 * // }
 */
export function formatResponse(content, id) {
    return {
        id: id || generateId(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'bridgegpt',
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content,
                },
                finish_reason: 'stop',
            },
        ],
        usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
        },
    };
}

/**
 * Format a single SSE streaming chunk in OpenAI-compatible format.
 *
 * @param {string} content - The text content for this chunk
 * @param {string} id - The completion ID (same across all chunks in a stream)
 * @param {boolean} [isFirst=false] - Whether this is the first chunk (includes role)
 * @returns {string} Formatted SSE data line
 *
 * @example
 * formatStreamChunk("Hello", "chatcmpl-123", true);
 * // 'data: {"id":"chatcmpl-123","object":"chat.completion.chunk",...}\n\n'
 */
export function formatStreamChunk(content, id, isFirst = false) {
    const delta = isFirst
        ? { role: 'assistant', content }
        : { content };

    const chunk = {
        id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'bridgegpt',
        choices: [
            {
                index: 0,
                delta,
                finish_reason: null,
            },
        ],
    };

    return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Format the final SSE stream termination signal.
 *
 * @returns {string} The SSE [DONE] signal
 */
export function formatStreamDone() {
    return 'data: [DONE]\n\n';
}

/**
 * Format an error response in OpenAI-compatible JSON format.
 *
 * @param {string} message - Human-readable error description
 * @param {string} type - Error type category (e.g., "invalid_request_error")
 * @param {string} code - Error code (e.g., "invalid_api_key")
 * @returns {object} OpenAI-compatible error response
 *
 * @example
 * formatErrorResponse("Invalid API key", "authentication_error", "invalid_api_key");
 * // { error: { message: "Invalid API key", type: "authentication_error", code: "invalid_api_key" } }
 */
export function formatErrorResponse(message, type, code) {
    return {
        error: {
            message,
            type,
            code,
        },
    };
}

/**
 * Validate the request body for the chat completions endpoint.
 *
 * @param {object} body - The request body to validate
 * @returns {{ valid: boolean, error?: string }} Validation result
 *
 * @example
 * const result = validateChatRequest({ messages: [{ role: "user", content: "Hi" }] });
 * // { valid: true }
 */
export function validateChatRequest(body) {
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Request body must be a JSON object' };
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return { valid: false, error: '"messages" must be a non-empty array' };
    }

    for (let i = 0; i < body.messages.length; i++) {
        const msg = body.messages[i];

        if (!msg || typeof msg !== 'object') {
            return { valid: false, error: `messages[${i}] must be an object` };
        }

        if (!['user', 'system', 'assistant'].includes(msg.role)) {
            return {
                valid: false,
                error: `messages[${i}].role must be "user", "system", or "assistant"`,
            };
        }

        if (typeof msg.content !== 'string' || msg.content.trim() === '') {
            return {
                valid: false,
                error: `messages[${i}].content must be a non-empty string`,
            };
        }
    }

    return { valid: true };
}

/**
 * Extract the last user message from a messages array.
 *
 * @param {Array<{role: string, content: string}>} messages - Array of chat messages
 * @returns {string|null} The content of the last user message, or null if none found
 *
 * @example
 * getLastUserMessage([
 *   { role: "system", content: "You are helpful" },
 *   { role: "user", content: "Hello" },
 *   { role: "assistant", content: "Hi there!" },
 *   { role: "user", content: "How are you?" }
 * ]);
 * // "How are you?"
 */
export function getLastUserMessage(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            return messages[i].content;
        }
    }
    return null;
}

/**
 * Get the application version from package.json.
 *
 * @returns {string} Version string
 */
export function getVersion() {
    return '1.0.0';
}

/**
 * Calculate uptime in seconds from a start timestamp.
 *
 * @param {number} startTime - Start timestamp from Date.now()
 * @returns {number} Uptime in seconds
 */
export function getUptime(startTime) {
    return Math.floor((Date.now() - startTime) / 1000);
}

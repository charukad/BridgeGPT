/**
 * BridgeGPT — API Router
 *
 * Defines all REST API endpoints with OpenAI-compatible request/response formats.
 *
 * Endpoints:
 *   POST /v1/chat/completions — Send message, get response (supports streaming)
 *   POST /v1/chat/new         — Start a new conversation
 *   GET  /v1/status           — System health and login status
 *   POST /v1/login            — Trigger manual login flow
 *
 * @module router
 */

import { Router } from 'express';
import { logger } from './utils/logger.js';
import {
    formatResponse,
    formatStreamChunk,
    formatStreamDone,
    formatErrorResponse,
    validateChatRequest,
    getLastUserMessage,
    getVersion,
    getUptime,
    generateId,
} from './utils/helpers.js';
import { withRetry } from './utils/retry.js';
import { ResponseCache } from './utils/cache.js';
import { sendMessage, sendMessageStreaming, startNewChat } from './browser/chat.js';
import { getPage, isBrowserRunning, launchBrowser } from './browser/launcher.js';
import { isLoggedIn, getSessionStatus, waitForLogin } from './browser/session.js';

/**
 * Create and configure the API router.
 *
 * @param {import('./queue/requestQueue.js').RequestQueue} requestQueue - The request queue instance
 * @param {number} startTime - Server start timestamp for uptime calculation
 * @returns {Router} Configured Express router
 */
export function createRouter(requestQueue, startTime) {
    const router = Router();
    const cache = new ResponseCache();

    // ─────────────────────────────────────────────
    // POST /v1/chat/completions
    // ─────────────────────────────────────────────
    router.post('/v1/chat/completions', async (req, res, next) => {
        try {
            // Validate request
            const validation = validateChatRequest(req.body);
            if (!validation.valid) {
                return res.status(400).json(
                    formatErrorResponse(validation.error, 'invalid_request_error', 'invalid_request')
                );
            }

            const { messages, stream } = req.body;
            const userMessage = getLastUserMessage(messages);

            if (!userMessage) {
                return res.status(400).json(
                    formatErrorResponse(
                        'No user message found in messages array',
                        'invalid_request_error',
                        'invalid_request'
                    )
                );
            }

            // Check browser status
            if (!isBrowserRunning()) {
                return res.status(503).json(
                    formatErrorResponse(
                        'Browser not running. Start the server or run login.',
                        'session_error',
                        'browser_not_running'
                    )
                );
            }

            // Check cache (non-streaming only)
            if (!stream && ResponseCache.isEnabled()) {
                const cacheKey = ResponseCache.createKey(messages);
                const cached = cache.get(cacheKey);
                if (cached) {
                    logger.info('Returning cached response');
                    return res.json(formatResponse(cached));
                }
            }

            const page = getPage();

            if (!page) {
                return res.status(503).json(
                    formatErrorResponse(
                        'No active browser page. Try restarting the server.',
                        'session_error',
                        'no_page'
                    )
                );
            }

            // ── Streaming mode ──
            if (stream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Accel-Buffering', 'no');
                res.flushHeaders();

                const completionId = generateId();
                let clientDisconnected = false;

                req.on('close', () => {
                    clientDisconnected = true;
                    logger.debug('Client disconnected during stream');
                });

                try {
                    await requestQueue.enqueue(async () => {
                        await withRetry(async () => {
                            await sendMessageStreaming(page, userMessage, (chunk, isFirst) => {
                                if (clientDisconnected) return;

                                if (chunk === null) {
                                    // Stream complete
                                    res.write(formatStreamDone());
                                    res.end();
                                } else {
                                    res.write(formatStreamChunk(chunk, completionId, isFirst));
                                }
                            });
                        });
                    });
                } catch (error) {
                    if (!clientDisconnected) {
                        const errorChunk = `data: ${JSON.stringify({ error: { message: error.message } })}\n\n`;
                        res.write(errorChunk);
                        res.write(formatStreamDone());
                        res.end();
                    }
                }

                return;
            }

            // ── Non-streaming mode ──
            const response = await requestQueue.enqueue(async () => {
                return await withRetry(async () => {
                    return await sendMessage(page, userMessage);
                });
            });

            // Cache the response
            if (ResponseCache.isEnabled()) {
                const cacheKey = ResponseCache.createKey(messages);
                cache.set(cacheKey, response);
            }

            res.json(formatResponse(response, undefined, messages));
        } catch (error) {
            next(error);
        }
    });

    // ─────────────────────────────────────────────
    // POST /v1/chat/new
    // ─────────────────────────────────────────────
    router.post('/v1/chat/new', async (req, res, next) => {
        try {
            const page = getPage();

            if (!page) {
                return res.status(503).json(
                    formatErrorResponse(
                        'No active browser page.',
                        'session_error',
                        'no_page'
                    )
                );
            }

            await requestQueue.enqueue(async () => {
                await startNewChat(page);
            });

            res.json({
                status: 'ok',
                message: 'New conversation started',
            });
        } catch (error) {
            next(error);
        }
    });

    // ─────────────────────────────────────────────
    // GET /v1/status
    // ─────────────────────────────────────────────
    router.get('/v1/status', (req, res) => {
        const queueStats = requestQueue.getStats();
        const cacheStats = cache.getStats();

        res.json({
            status: getSessionStatus(),
            logged_in: getSessionStatus() === 'ready',
            browser_running: isBrowserRunning(),
            queue: queueStats,
            uptime_seconds: getUptime(startTime),
            version: getVersion(),
            cache: cacheStats,
        });
    });

    // ─────────────────────────────────────────────
    // POST /v1/login
    // ─────────────────────────────────────────────
    router.post('/v1/login', async (req, res, next) => {
        try {
            logger.info('Login requested via API');

            // Relaunch browser in visible mode
            const page = await launchBrowser({ headless: false });
            const chatgptUrl = process.env.CHATGPT_URL || 'https://chatgpt.com';
            await page.goto(chatgptUrl, { waitUntil: 'domcontentloaded' });

            res.json({
                status: 'login_started',
                message:
                    'A browser window has been opened. Please log in to ChatGPT. ' +
                    'The session will be saved automatically after successful login.',
            });

            // Wait for login in the background
            const success = await waitForLogin(page);
            if (success) {
                logger.info('Login completed successfully via API trigger');
            } else {
                logger.warn('Login via API trigger timed out');
            }
        } catch (error) {
            next(error);
        }
    });

    return router;
}

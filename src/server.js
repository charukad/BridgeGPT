/**
 * BridgeGPT — Express Server Setup
 *
 * Configures the Express application with middleware stack,
 * mounts the API router, and exports the app for the entry point.
 *
 * @module server
 */

import express from 'express';
import cors from 'cors';
import {
    authMiddleware,
    requestLogger,
    errorHandler,
    notFoundHandler,
} from './middleware.js';
import { createRouter } from './router.js';
import { RequestQueue } from './queue/requestQueue.js';
import { logger } from './utils/logger.js';

/**
 * Create and configure the Express application.
 *
 * Middleware order:
 * 1. CORS
 * 2. JSON body parser (10MB limit for file content)
 * 3. Request logger
 * 4. API key authentication
 * 5. API routes
 * 6. 404 handler
 * 7. Error handler
 *
 * @param {number} startTime - Server start timestamp for uptime tracking
 * @returns {{ app: import('express').Express, requestQueue: RequestQueue }}
 */
export function createApp(startTime) {
    const app = express();
    const requestQueue = new RequestQueue();

    // ── Middleware stack ──

    // 1. CORS — allow all origins for local/dev use
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // 2. JSON body parser (10MB limit for potential file content in v2)
    app.use(express.json({ limit: '10mb' }));

    // 3. Request logging
    app.use(requestLogger);

    // 4. Root health check (before auth)
    app.get('/', (req, res) => {
        res.json({
            name: 'BridgeGPT',
            version: '1.0.0',
            description: 'ChatGPT-to-API bridge. See /v1/status for details.',
        });
    });

    // 5. API key authentication
    app.use(authMiddleware);

    // 6. API routes
    const router = createRouter(requestQueue, startTime);
    app.use(router);

    // 7. 404 handler
    app.use(notFoundHandler);

    // 8. Error handler (must be last)
    app.use(errorHandler);

    logger.debug('Express app configured');

    return { app, requestQueue };
}

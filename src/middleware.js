/**
 * BridgeGPT — Express Middleware
 *
 * Authentication, request logging, and error handling middleware.
 *
 * @module middleware
 */

import { logger } from './utils/logger.js';
import { formatErrorResponse } from './utils/helpers.js';

/**
 * API key authentication middleware.
 * Validates the Authorization header against the configured API_KEY.
 *
 * Skips auth for the root health check endpoint (GET /).
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Next middleware
 */
export function authMiddleware(req, res, next) {
    // Skip auth for root health check
    if (req.path === '/' && req.method === 'GET') {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json(
            formatErrorResponse(
                'Missing API key. Include "Authorization: Bearer <your-api-key>" header.',
                'authentication_error',
                'missing_api_key'
            )
        );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey === 'change-me-to-a-strong-key') {
        logger.warn('API_KEY is not configured! Set a strong API key in .env');
    }

    if (token !== apiKey) {
        return res.status(401).json(
            formatErrorResponse(
                'Invalid API key.',
                'authentication_error',
                'invalid_api_key'
            )
        );
    }

    next();
}

/**
 * Request logging middleware.
 * Logs method, path, status code, and duration for every request.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Next middleware
 */
export function requestLogger(req, res, next) {
    if (process.env.LOG_REQUESTS !== 'true') {
        return next();
    }

    const startTime = Date.now();

    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request handled', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: duration,
        });
    });

    next();
}

/**
 * Global error handling middleware.
 * Catches unhandled errors and returns OpenAI-compatible error JSON.
 *
 * @param {Error} err - The error
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} _next - Next middleware (unused)
 */
export function errorHandler(err, req, res, _next) {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Determine appropriate status code
    let statusCode = 500;
    let errorType = 'server_error';
    let errorCode = 'internal_error';

    if (err.message?.includes('session expired') || err.message?.includes('login required')) {
        statusCode = 503;
        errorType = 'session_error';
        errorCode = 'session_expired';
    } else if (err.message?.includes('rate limit')) {
        statusCode = 429;
        errorType = 'rate_limit_error';
        errorCode = 'rate_limited';
    } else if (err.message?.includes('timed out') || err.message?.includes('timeout')) {
        statusCode = 504;
        errorType = 'timeout_error';
        errorCode = 'timeout';
    }

    res.status(statusCode).json(
        formatErrorResponse(err.message || 'Internal server error', errorType, errorCode)
    );
}

/**
 * 404 handler for unknown routes.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
export function notFoundHandler(req, res) {
    res.status(404).json(
        formatErrorResponse(
            `Route ${req.method} ${req.path} not found`,
            'invalid_request_error',
            'not_found'
        )
    );
}

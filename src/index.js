/**
 * BridgeGPT — Main Entry Point
 *
 * Initializes the browser, checks login status,
 * starts the Express API server, and handles graceful shutdown.
 *
 * @module index
 */

import dotenv from 'dotenv';
dotenv.config();

import { logger } from './utils/logger.js';
import { createApp } from './server.js';
import { launchBrowser, closeBrowser, isBrowserRunning } from './browser/launcher.js';
import { isLoggedIn, getSessionStatus, setSessionStatus } from './browser/session.js';

const startTime = Date.now();

/**
 * Main startup sequence.
 *
 * 1. Load environment variables
 * 2. Launch headless browser
 * 3. Check ChatGPT login status
 * 4. Start Express API server
 * 5. Register shutdown handlers
 */
async function main() {
    logger.info('Starting BridgeGPT', {
        version: '1.0.0',
        nodeVersion: process.version,
    });

    // ── Step 1: Launch browser ──
    let page;
    try {
        page = await launchBrowser();
        logger.info('Browser launched');
    } catch (error) {
        logger.error('Failed to launch browser', { error: error.message });
        logger.info('The server will start, but browser features won\'t work until login.');
    }

    // ── Step 2: Check login status ──
    if (page) {
        try {
            const loggedIn = await isLoggedIn(page);

            if (loggedIn) {
                logger.info('✅ ChatGPT session is active');
                setSessionStatus('ready');
            } else {
                logger.warn('⚠️  Not logged in to ChatGPT');
                logger.warn('Run "npm run login" to log in, or POST to /v1/login');
                setSessionStatus('login_required');
            }
        } catch (error) {
            logger.error('Login check failed', { error: error.message });
            setSessionStatus('error');
        }
    } else {
        setSessionStatus('error');
    }

    // ── Step 3: Start Express server ──
    const { app } = createApp(startTime);
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    const server = app.listen(port, host, () => {
        logger.info(`🚀 BridgeGPT server running`, {
            url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
            status: getSessionStatus(),
        });

        console.log('\n' + '='.repeat(60));
        console.log('  🌉 BridgeGPT v1.0.0');
        console.log('='.repeat(60));
        console.log(`  API:     http://localhost:${port}`);
        console.log(`  Status:  http://localhost:${port}/v1/status`);
        console.log(`  Session: ${getSessionStatus()}`);
        console.log('='.repeat(60));

        if (getSessionStatus() !== 'ready') {
            console.log('\n  ⚠️  Run "npm run login" to log in to ChatGPT\n');
        }
    });

    // ── Step 4: Graceful shutdown ──
    const shutdown = async (signal) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);

        server.close(() => {
            logger.info('HTTP server closed');
        });

        await closeBrowser();
        logger.info('BridgeGPT stopped');
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    });

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', {
            error: reason instanceof Error ? reason.message : String(reason),
        });
    });
}

// Run
main().catch((error) => {
    logger.error('Fatal startup error', { error: error.message, stack: error.stack });
    process.exit(1);
});

/**
 * BridgeGPT — Playwright Browser Launcher
 *
 * Manages the Chromium browser lifecycle with persistent context
 * to preserve ChatGPT session cookies across restarts.
 *
 * @module browser/launcher
 */

import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

chromium.use(stealth());

const AUTH_DIR = path.resolve('auth');

/** @type {import('playwright').BrowserContext|null} */
let browserContext = null;

/** @type {import('playwright').Page|null} */
let activePage = null;

/**
 * Launch a Chromium browser with persistent context.
 *
 * Persistent context saves cookies, localStorage, and session data
 * to the auth/ directory so your ChatGPT login survives restarts.
 *
 * @param {object} [options] - Launch options
 * @param {boolean} [options.headless] - Override HEADLESS env var
 * @returns {Promise<import('playwright').Page>} The active browser page
 *
 * @example
 * const page = await launchBrowser();
 * await page.goto('https://chatgpt.com');
 */
export async function launchBrowser(options = {}) {
    // Ensure auth directory exists
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        logger.info('Created auth directory', { path: AUTH_DIR });
    }

    const headless = options.headless ?? (process.env.HEADLESS === 'true');

    logger.info('Launching browser', {
        headless,
        authDir: AUTH_DIR,
    });

    browserContext = await chromium.launchPersistentContext(AUTH_DIR, {
        headless,
        channel: 'chrome', // Use actual Google Chrome to bypass Cloudflare
        viewport: { width: 1280, height: 720 },
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        args: [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        bypassCSP: true,
        locale: 'en-US',
        timezoneId: 'America/New_York',
    });

    // Get the first page or create one
    const pages = browserContext.pages();
    activePage = pages.length > 0 ? pages[0] : await browserContext.newPage();

    // Remove navigator.webdriver property to avoid detection
    await activePage.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    // Listen for page crashes
    activePage.on('crash', () => {
        logger.error('Page crashed — will attempt recovery');
    });

    // Listen for browser disconnection
    browserContext.on('close', () => {
        logger.warn('Browser context closed');
        browserContext = null;
        activePage = null;
    });

    logger.info('Browser launched successfully', { headless });
    return activePage;
}

/**
 * Get the currently active browser page.
 *
 * @returns {import('playwright').Page|null} The active page or null if not launched
 */
export function getPage() {
    return activePage;
}

/**
 * Get the browser context.
 *
 * @returns {import('playwright').BrowserContext|null} The browser context or null
 */
export function getContext() {
    return browserContext;
}

/**
 * Check if the browser is currently running.
 *
 * @returns {boolean} True if browser is launched and page is available
 */
export function isBrowserRunning() {
    return browserContext !== null && activePage !== null;
}

/**
 * Close the browser and save the session state.
 * All cookies and localStorage are persisted to the auth/ directory.
 *
 * @returns {Promise<void>}
 */
export async function closeBrowser() {
    if (browserContext) {
        logger.info('Closing browser and saving session');
        try {
            await browserContext.close();
        } catch (error) {
            logger.error('Error closing browser', { error: error.message });
        }
        browserContext = null;
        activePage = null;
        logger.info('Browser closed');
    }
}

/**
 * Restart the browser — close and relaunch with the same session.
 * Used for error recovery.
 *
 * @param {object} [options] - Launch options
 * @returns {Promise<import('playwright').Page>} New active page
 */
export async function restartBrowser(options = {}) {
    logger.warn('Restarting browser');
    await closeBrowser();
    return launchBrowser(options);
}

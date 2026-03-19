/**
 * BridgeGPT — Session Manager
 *
 * Manages ChatGPT login state detection and session lifecycle.
 * Detects whether the browser has an active ChatGPT session
 * and handles re-authentication flows.
 *
 * @module browser/session
 */

import { logger } from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';
import { SELECTORS, TIMEOUTS } from './selectors.js';

/** @type {'ready'|'login_required'|'initializing'|'error'} */
let sessionStatus = 'initializing';

/**
 * Check if the browser page is currently logged in to ChatGPT.
 *
 * Detection logic:
 * 1. Navigate to chatgpt.com
 * 2. Wait for page to settle
 * 3. Look for the message input textarea (indicates logged in)
 * 4. If redirected to login page, session expired
 *
 * @param {import('playwright').Page} page - The browser page
 * @returns {Promise<boolean>} True if logged in, false otherwise
 */
export async function isLoggedIn(page) {
    try {
        const chatgptUrl = process.env.CHATGPT_URL || 'https://chatgpt.com';

        logger.debug('Checking login status', { url: chatgptUrl });

        await page.goto(chatgptUrl, {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUTS.PAGE_LOAD,
        });

        // Wait a bit for dynamic content to load
        await sleep(3000);

        // Check if we can find the message input (means we're logged in)
        try {
            const input = await page.waitForSelector(SELECTORS.MESSAGE_INPUT, {
                timeout: TIMEOUTS.LOGIN_CHECK,
                state: 'visible',
            });

            if (input) {
                logger.info('Login status: logged in');
                sessionStatus = 'ready';
                return true;
            }
        } catch {
            // Input not found — check if we're on a login page
        }

        // Check for login form/button (session expired)
        try {
            const loginForm = await page.$(SELECTORS.LOGIN_FORM);
            if (loginForm) {
                logger.warn('Login status: session expired (login form detected)');
                sessionStatus = 'login_required';
                return false;
            }
        } catch {
            // No login form found either
        }

        // Check URL — if redirected to auth page
        const currentUrl = page.url();
        if (
            currentUrl.includes('auth0') ||
            currentUrl.includes('login') ||
            currentUrl.includes('auth/') ||
            currentUrl.includes('accounts.google')
        ) {
            logger.warn('Login status: redirected to auth page', { url: currentUrl });
            sessionStatus = 'login_required';
            return false;
        }

        // If we're on chatgpt.com but can't find the input, might still be loading
        // or it could be a Cloudflare challenge
        logger.warn('Login status: uncertain (no input, no login form)', {
            url: currentUrl,
        });
        sessionStatus = 'error';
        return false;
    } catch (error) {
        logger.error('Login check failed', { error: error.message });
        sessionStatus = 'error';
        return false;
    }
}

/**
 * Wait for the user to complete manual login in a visible browser window.
 * Polls `isLoggedIn()` every few seconds until login succeeds or timeout.
 *
 * @param {import('playwright').Page} page - The browser page
 * @param {number} [timeoutMs=300000] - Max wait time (default: 5 minutes)
 * @returns {Promise<boolean>} True if login succeeded, false if timed out
 */
export async function waitForLogin(page, timeoutMs = 300000) {
    logger.info('Waiting for manual login...', {
        timeoutMs,
        message: 'Please log in to ChatGPT in the browser window',
    });

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        // Don't navigate — let the user interact with the login page
        // Just check if the URL changed to indicate successful login
        const currentUrl = page.url();

        // If we're back to the main chat page, check for input
        if (
            currentUrl.includes('chatgpt.com') &&
            !currentUrl.includes('auth') &&
            !currentUrl.includes('login')
        ) {
            try {
                const input = await page.waitForSelector(SELECTORS.MESSAGE_INPUT, {
                    timeout: 5000,
                    state: 'visible',
                });

                if (input) {
                    logger.info('Login successful!');
                    sessionStatus = 'ready';
                    return true;
                }
            } catch {
                // Not ready yet, keep waiting
            }
        }

        await sleep(TIMEOUTS.POLL_INTERVAL * 3);
    }

    logger.error('Login timed out', { timeoutMs });
    return false;
}

/**
 * Get the current session status.
 *
 * @returns {'ready'|'login_required'|'initializing'|'error'} Current status
 */
export function getSessionStatus() {
    return sessionStatus;
}

/**
 * Set the session status manually.
 *
 * @param {'ready'|'login_required'|'initializing'|'error'} status - New status
 */
export function setSessionStatus(status) {
    sessionStatus = status;
    logger.debug('Session status updated', { status });
}

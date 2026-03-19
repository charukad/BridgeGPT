/**
 * BridgeGPT — Login Script
 *
 * Standalone script to open a visible browser window for manual ChatGPT login.
 * Run with: npm run login
 *
 * After successful login, session cookies are saved to auth/ directory
 * and will be reused when starting the server headlessly.
 *
 * @module login
 */

import dotenv from 'dotenv';
dotenv.config();

import { logger } from './utils/logger.js';
import { launchBrowser, closeBrowser } from './browser/launcher.js';
import { waitForLogin, isLoggedIn } from './browser/session.js';

/**
 * Login flow:
 * 1. Open a VISIBLE Chromium browser (not headless)
 * 2. Navigate to chatgpt.com
 * 3. Wait for user to log in manually
 * 4. Detect successful login
 * 5. Save session cookies to auth/
 * 6. Close browser
 */
async function login() {
    console.log('\n' + '='.repeat(60));
    console.log('  🌉 BridgeGPT — Login');
    console.log('='.repeat(60));
    console.log('  A browser window will open.');
    console.log('  Please log in to your ChatGPT account.');
    console.log('  The window will close automatically after login.');
    console.log('='.repeat(60) + '\n');

    let page;

    try {
        // Launch browser in VISIBLE mode (headless: false)
        page = await launchBrowser({ headless: false });
        logger.info('Browser opened in visible mode');

        // Navigate to ChatGPT
        const chatgptUrl = process.env.CHATGPT_URL || 'https://chatgpt.com';
        await page.goto(chatgptUrl, { waitUntil: 'domcontentloaded' });

        // Check if already logged in
        const alreadyLoggedIn = await isLoggedIn(page);

        if (alreadyLoggedIn) {
            console.log('\n  ✅ You are already logged in to ChatGPT!');
            console.log('  Session cookies are saved. You can start the server.\n');
        } else {
            console.log('\n  📱 Waiting for you to log in...\n');

            // Navigate back to ChatGPT (isLoggedIn may have navigated)
            await page.goto(chatgptUrl, { waitUntil: 'domcontentloaded' });

            // Wait for manual login (5 minute timeout)
            const success = await waitForLogin(page, 300000);

            if (success) {
                console.log('\n  ✅ Login successful!');
                console.log('  Session cookies have been saved to auth/');
                console.log('  You can now start the server with: npm start\n');
            } else {
                console.log('\n  ❌ Login timed out.');
                console.log('  Please try again with: npm run login\n');
            }
        }
    } catch (error) {
        logger.error('Login failed', { error: error.message });
        console.error('\n  ❌ Login error:', error.message);
        console.error('  Please try again.\n');
    } finally {
        // Close the browser
        await closeBrowser();
        process.exit(0);
    }
}

// Run
login().catch((error) => {
    console.error('Fatal login error:', error.message);
    process.exit(1);
});

/**
 * BridgeGPT — Model Selector
 *
 * Automates switching between ChatGPT models via the UI dropdown.
 * Maps OpenAI API model names to ChatGPT's display names.
 *
 * @module browser/modelSelector
 */

import { logger } from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';
import { SELECTORS, TIMEOUTS } from './selectors.js';

/**
 * Map from OpenAI-compatible API model names to ChatGPT UI display text.
 * These are the strings that visually appear in the ChatGPT dropdown.
 *
 * @type {Record<string, string>}
 */
export const MODEL_MAP = {
    'gpt-4o':           'GPT-4o',
    'gpt-4o-mini':      'GPT-4o mini',
    'o1':               'o1',
    'o1-mini':          'o1-mini',
    'o3-mini':          'o3-mini',
    'auto':             'Auto',
    'bridgegpt':        'Auto', // default alias
};

/**
 * List of all supported model values for the /v1/models endpoint.
 */
export const SUPPORTED_MODELS = Object.keys(MODEL_MAP).filter((m) => m !== 'bridgegpt');

/**
 * Select a ChatGPT model via the UI dropdown.
 *
 * @param {import('playwright').Page} page - The browser page
 * @param {string} modelName - The API model name (e.g. "gpt-4o-mini")
 * @returns {Promise<void>}
 *
 * @example
 * await selectModel(page, 'gpt-4o-mini');
 */
export async function selectModel(page, modelName) {
    const displayName = MODEL_MAP[modelName];

    if (!displayName) {
        logger.warn('Unknown model requested, using default', { modelName });
        return; // Silently use whatever model is currently selected
    }

    // Skip if already on the right model (or 'auto'/'bridgegpt')
    if (modelName === 'auto' || modelName === 'bridgegpt') {
        logger.debug('Using default model (auto)');
        return;
    }

    try {
        logger.debug('Opening model selector', { modelName, displayName });

        // Click the model selector button to open the dropdown
        const selector = await page.waitForSelector(SELECTORS.MODEL_SELECTOR, {
            timeout: TIMEOUTS.ELEMENT_VISIBLE,
            state: 'visible',
        });

        if (!selector) {
            logger.warn('Model selector not found on this page');
            return;
        }

        await selector.click();
        await sleep(500);

        // Find and click the matching model option
        const options = await page.$$(SELECTORS.MODEL_OPTION);

        for (const option of options) {
            const text = await option.innerText().catch(() => '');
            if (text.includes(displayName)) {
                await option.click();
                logger.info('Model selected', { modelName, displayName });
                await sleep(300);
                return;
            }
        }

        // If model not found in dropdown, close it and log a warning
        await page.keyboard.press('Escape');
        logger.warn('Model not found in dropdown — may require a higher plan', {
            modelName,
            displayName,
        });
    } catch (error) {
        logger.warn('Model selection failed — using default', {
            error: error.message,
            modelName,
        });
        // Non-fatal: fall through and use whatever model is active
        try { await page.keyboard.press('Escape'); } catch { /* ignore */ }
    }
}

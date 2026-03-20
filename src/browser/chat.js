/**
 * BridgeGPT — Chat Automation
 *
 * Core automation logic for interacting with the ChatGPT web interface.
 * Handles sending messages, receiving responses, and streaming.
 *
 * @module browser/chat
 */

import { logger } from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';
import { SELECTORS, TIMEOUTS } from './selectors.js';

/**
 * Send a message array that may include a `system` role message.
 *
 * Since ChatGPT web has no system prompt field, we inject the system
 * instruction as a hidden first user message that sets the persona,
 * then send the actual user content.
 *
 * @param {import('playwright').Page} page - The browser page
 * @param {Array<{role: string, content: string}>} messages - Full messages array
 * @returns {Promise<string>} The assistant's response text
 */
export async function sendWithSystemPrompt(page, messages) {
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');
    const lastUserMsg = [...userMessages].reverse().find((m) => m.role === 'user');

    if (!lastUserMsg) {
        throw new Error('No user message found in messages array');
    }

    if (systemMsg) {
        logger.debug('Injecting system prompt as hidden first turn');
        const injection =
            `[SYSTEM INSTRUCTION — follow these rules for this entire conversation]:\n` +
            `${systemMsg.content}\n\n` +
            `Acknowledge you understand these instructions in one short sentence.`;

        // Send the system injection and discard the acknowledgment
        await sendMessage(page, injection);
        logger.debug('System prompt acknowledged by model');
    }

    // Now send the real user message
    return await sendMessage(page, lastUserMsg.content);
}



/**
 * Send a message to ChatGPT and wait for the complete response.
 *
 * Flow:
 * 1. Wait for input element to be ready
 * 2. Clear any existing text
 * 3. Type the message
 * 4. Click send button
 * 5. Wait for response to finish streaming
 * 6. Extract the last assistant message
 *
 * @param {import('playwright').Page} page - The browser page
 * @param {string} message - The message to send
 * @returns {Promise<string>} The assistant's response text
 * @throws {Error} If sending fails, times out, or ChatGPT returns an error
 */
export async function sendMessage(page, message) {
    const timeout = parseInt(process.env.BROWSER_TIMEOUT || '60000', 10);

    logger.debug('Sending message', { messageLength: message.length });

    // Step 1: Wait for the message input to be ready
    const input = await page.waitForSelector(SELECTORS.MESSAGE_INPUT, {
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
        state: 'visible',
    });

    if (!input) {
        throw new Error('Could not find message input element');
    }

    // Step 2: Clear existing text and type the new message
    await input.click();
    await page.keyboard.down('Meta'); // Cmd+A to select all
    await page.keyboard.press('a');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await sleep(200);

    // Use fill for contenteditable or set value for textarea
    try {
        await input.fill(message);
    } catch {
        // If fill doesn't work (contenteditable), type character by character
        await input.type(message, { delay: 10 });
    }

    await sleep(500);

    // Step 3: Click the send button
    try {
        const sendButton = await page.waitForSelector(SELECTORS.SEND_BUTTON, {
            timeout: 5000,
            state: 'visible',
        });

        if (sendButton) {
            await sendButton.click();
        }
    } catch {
        // If send button not found, try pressing Enter
        logger.debug('Send button not found, pressing Enter');
        await page.keyboard.press('Enter');
    }

    logger.debug('Message sent, waiting for response');

    // Step 4: Wait for the response to start generating
    // The stop button appears when ChatGPT starts generating
    await sleep(1000);

    try {
        await page.waitForSelector(SELECTORS.STOP_BUTTON, {
            timeout: TIMEOUTS.RESPONSE_START,
            state: 'visible',
        });
        logger.debug('Response generation started (stop button visible)');
    } catch {
        // Stop button might not appear for very quick responses
        logger.debug('Stop button not detected — response may be instant or already done');
    }

    // Step 5: Wait for the response to finish
    // The stop button disappears when generation is complete
    try {
        await page.waitForSelector(SELECTORS.STOP_BUTTON, {
            state: 'hidden',
            timeout: timeout,
        });
        logger.debug('Response generation complete (stop button hidden)');
    } catch {
        logger.warn('Timeout waiting for response to complete');
    }

    // Give a small delay for the final text to render
    await sleep(1000);

    // Step 6: Check for errors
    await checkForErrors(page);

    // Step 7: Extract the assistant's response
    const response = await extractLastResponse(page);

    if (!response || response.trim() === '') {
        throw new Error('Received empty response from ChatGPT');
    }

    logger.debug('Response received', { responseLength: response.length });
    return response;
}

/**
 * Send a message and stream the response via a callback.
 *
 * Sets up a MutationObserver on the ChatGPT page to detect
 * new text as it appears, calling onChunk for each new piece.
 *
 * @param {import('playwright').Page} page - The browser page
 * @param {string} message - The message to send
 * @param {function(string|null): void} onChunk - Callback for each text chunk.
 *   Called with text content for each new chunk, or null when complete.
 * @returns {Promise<string>} The complete response text
 */
export async function sendMessageStreaming(page, message, onChunk) {
    const timeout = parseInt(process.env.BROWSER_TIMEOUT || '60000', 10);

    logger.debug('Sending message (streaming)', { messageLength: message.length });

    // Count existing assistant messages before sending
    const existingCount = await page.$$eval(
        SELECTORS.ASSISTANT_MESSAGE,
        (els) => els.length
    );

    // Send the message (reuse the input/send logic)
    const input = await page.waitForSelector(SELECTORS.MESSAGE_INPUT, {
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
        state: 'visible',
    });

    if (!input) {
        throw new Error('Could not find message input element');
    }

    await input.click();
    await page.keyboard.down('Meta');
    await page.keyboard.press('a');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await sleep(200);

    try {
        await input.fill(message);
    } catch {
        await input.type(message, { delay: 10 });
    }

    await sleep(500);

    try {
        const sendButton = await page.waitForSelector(SELECTORS.SEND_BUTTON, {
            timeout: 5000,
            state: 'visible',
        });
        if (sendButton) {
            await sendButton.click();
        }
    } catch {
        await page.keyboard.press('Enter');
    }

    // Wait for the new response to start appearing
    await sleep(1500);

    // Poll for text changes in the response
    let previousText = '';
    let stableCount = 0;
    const maxStable = 5; // Number of polls with no change before considering done
    const startTime = Date.now();
    let isFirst = true;

    while (Date.now() - startTime < timeout) {
        try {
            // Get the text of the latest assistant message
            const messages = await page.$$(SELECTORS.ASSISTANT_MESSAGE);
            const latestMessage = messages.length > existingCount
                ? messages[messages.length - 1]
                : null;

            if (latestMessage) {
                const currentText = await latestMessage.innerText();

                if (currentText && currentText.length > previousText.length) {
                    const newContent = currentText.slice(previousText.length);
                    onChunk(newContent, isFirst);
                    isFirst = false;
                    previousText = currentText;
                    stableCount = 0;
                } else {
                    stableCount++;
                }
            }

            // Check if stop button is gone (generation complete)
            const stopButton = await page.$(SELECTORS.STOP_BUTTON);
            if (!stopButton && previousText.length > 0 && stableCount >= 2) {
                // Response is complete
                await sleep(500);
                // One final check for any remaining text
                const messages = await page.$$(SELECTORS.ASSISTANT_MESSAGE);
                if (messages.length > existingCount) {
                    const finalText = await messages[messages.length - 1].innerText();
                    if (finalText.length > previousText.length) {
                        onChunk(finalText.slice(previousText.length), false);
                        previousText = finalText;
                    }
                }
                break;
            }

            if (stableCount >= maxStable && previousText.length > 0) {
                break;
            }
        } catch (error) {
            logger.debug('Streaming poll error', { error: error.message });
        }

        await sleep(200);
    }

    // Signal completion
    onChunk(null, false);

    logger.debug('Streaming complete', { totalLength: previousText.length });
    return previousText;
}

/**
 * Start a new ChatGPT conversation by clicking the "New Chat" button.
 *
 * @param {import('playwright').Page} page - The browser page
 * @returns {Promise<void>}
 */
export async function startNewChat(page) {
    logger.debug('Starting new chat');

    try {
        const newChatBtn = await page.waitForSelector(SELECTORS.NEW_CHAT_BUTTON, {
            timeout: TIMEOUTS.ELEMENT_VISIBLE,
            state: 'visible',
        });

        if (newChatBtn) {
            await newChatBtn.click();
            await sleep(1500);

            // Verify we're in a new chat (input should be empty)
            await page.waitForSelector(SELECTORS.MESSAGE_INPUT, {
                timeout: TIMEOUTS.ELEMENT_VISIBLE,
                state: 'visible',
            });

            logger.info('New chat started');
        }
    } catch (error) {
        // Fallback: navigate to the base URL
        logger.debug('New chat button not found, navigating to base URL');
        const chatgptUrl = process.env.CHATGPT_URL || 'https://chatgpt.com';
        await page.goto(chatgptUrl, {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUTS.PAGE_LOAD,
        });
        await sleep(2000);
        logger.info('New chat started (via navigation)');
    }
}

/**
 * Check if ChatGPT is currently generating a response.
 *
 * @param {import('playwright').Page} page - The browser page
 * @returns {Promise<boolean>} True if still generating
 */
export async function isGenerating(page) {
    try {
        const stopButton = await page.$(SELECTORS.STOP_BUTTON);
        return !!stopButton;
    } catch {
        return false;
    }
}

/**
 * Extract the text content of the last assistant message on the page.
 *
 * @param {import('playwright').Page} page - The browser page
 * @returns {Promise<string>} The response text
 */
async function extractLastResponse(page) {
    const messages = await page.$$(SELECTORS.ASSISTANT_MESSAGE);

    if (messages.length === 0) {
        logger.warn('No assistant messages found on page');
        return '';
    }

    const lastMessage = messages[messages.length - 1];
    const text = await lastMessage.innerText();

    return cleanResponseText(text);
}

/**
 * Clean up extracted response text.
 *
 * @param {string} text - Raw text from the DOM
 * @returns {string} Cleaned text
 */
function cleanResponseText(text) {
    if (!text) return '';

    return text
        .replace(/^\s+/, '') // Leading whitespace
        .replace(/\s+$/, '') // Trailing whitespace
        .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
}

/**
 * Check the ChatGPT page for error messages.
 * Throws descriptive errors that can be caught by the retry handler.
 *
 * @param {import('playwright').Page} page - The browser page
 * @throws {Error} If an error is detected on the page
 */
async function checkForErrors(page) {
    // Check for "Something went wrong"
    try {
        const networkError = await page.$('text="Something went wrong"');
        if (networkError) {
            const error = new Error('ChatGPT error: Something went wrong');
            error.retryable = true;
            throw error;
        }
    } catch (error) {
        if (error.retryable) throw error;
    }

    // Check for rate limit message
    try {
        const rateLimitTexts = [
            'text="rate limit"',
            'text="too many requests"',
            'text="You\'ve reached"',
            'text="limit"',
        ];

        for (const selector of rateLimitTexts) {
            const element = await page.$(selector);
            if (element) {
                const error = new Error('ChatGPT rate limit reached');
                error.retryable = true;
                error.isRateLimit = true;
                throw error;
            }
        }
    } catch (error) {
        if (error.retryable) throw error;
    }
}

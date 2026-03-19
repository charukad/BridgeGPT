/**
 * BridgeGPT — CSS Selectors for ChatGPT Web Interface
 *
 * Centralized DOM selectors for all ChatGPT UI elements.
 * UPDATE THESE when ChatGPT changes their interface.
 *
 * @module browser/selectors
 */

/**
 * All CSS selectors used to interact with the ChatGPT web UI.
 * Each selector targets a specific UI element.
 *
 * When ChatGPT updates their UI, only this file needs to change.
 */
export const SELECTORS = {
    /**
     * The main textarea where messages are typed.
     * ChatGPT uses either a textarea or a contenteditable div.
     */
    MESSAGE_INPUT: '#prompt-textarea, textarea[data-id="root"], div[contenteditable="true"][id="prompt-textarea"]',

    /**
     * The send message button (arrow icon).
     */
    SEND_BUTTON: '[data-testid="send-button"], button[aria-label="Send prompt"]',

    /**
     * The stop generating button — visible while ChatGPT is streaming a response.
     */
    STOP_BUTTON: '[data-testid="stop-button"], button[aria-label="Stop generating"]',

    /**
     * Assistant message containers — each response from ChatGPT.
     */
    ASSISTANT_MESSAGE: '[data-message-author-role="assistant"]',

    /**
     * The "New chat" button to start a fresh conversation.
     */
    NEW_CHAT_BUTTON: '[data-testid="create-new-chat-button"], a[href="/"]',

    /**
     * Login form or login button — indicates session expired.
     */
    LOGIN_FORM: 'button[data-testid="login-button"], [data-provider="google"], form[action*="auth"]',

    /**
     * Error message container — shows when ChatGPT encounters an error.
     */
    ERROR_MESSAGE: '[class*="error"], .text-red, div[class*="Error"]',

    /**
     * Rate limit message text.
     */
    RATE_LIMIT_TEXT: 'text="rate limit"',

    /**
     * Network error message.
     */
    NETWORK_ERROR_TEXT: 'text="Something went wrong"',

    /**
     * The regenerate response button — appears after errors.
     */
    REGENERATE_BUTTON: 'button:has-text("Regenerate"), button:has-text("Try again")',

    /**
     * Main chat container — present when logged in.
     */
    CHAT_CONTAINER: 'main[class*="flex"]',

    /**
     * Model selector dropdown trigger.
     */
    MODEL_SELECTOR: '[data-testid="model-selector"], button[class*="model"]',
};

/**
 * Timeouts for various browser operations (in milliseconds).
 */
export const TIMEOUTS = {
    /** Max time to wait for page navigation */
    PAGE_LOAD: 30000,

    /** Max time to wait for login check */
    LOGIN_CHECK: 15000,

    /** Max time to wait for a response to start generating */
    RESPONSE_START: 30000,

    /** Max time to wait for a response to finish generating */
    RESPONSE_COMPLETE: 120000,

    /** Time to wait between polls */
    POLL_INTERVAL: 1000,

    /** Max time to wait for an element to appear */
    ELEMENT_VISIBLE: 10000,
};

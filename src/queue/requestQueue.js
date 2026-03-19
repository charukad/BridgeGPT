/**
 * BridgeGPT — Request Queue
 *
 * Sequential FIFO queue ensuring only one request accesses
 * the browser at a time. Prevents race conditions from
 * parallel API requests trying to use the same ChatGPT page.
 *
 * @module queue/requestQueue
 */

import { logger } from '../utils/logger.js';

/**
 * Sequential request queue with concurrency control.
 *
 * @example
 * const queue = new RequestQueue();
 * const result = await queue.enqueue(async () => {
 *     return await sendMessage(page, "Hello");
 * });
 */
export class RequestQueue {
    constructor() {
        /** @type {Array<{task: Function, resolve: Function, reject: Function, addedAt: number}>} */
        this.queue = [];

        /** @type {boolean} */
        this.processing = false;

        /** @type {number} */
        this.totalProcessed = 0;

        /** @type {number} */
        this.totalErrors = 0;
    }

    /**
     * Add a task to the queue. Returns a promise that resolves
     * when the task has been processed.
     *
     * @param {Function} taskFn - Async function to execute when it's this task's turn
     * @returns {Promise<*>} The result of the task function
     */
    async enqueue(taskFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task: taskFn,
                resolve,
                reject,
                addedAt: Date.now(),
            });

            logger.debug('Request enqueued', { queueSize: this.queue.length });
            this.processNext();
        });
    }

    /**
     * Process the next task in the queue if not already processing.
     *
     * @private
     */
    async processNext() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        const { task, resolve, reject, addedAt } = this.queue.shift();
        const waitTime = Date.now() - addedAt;

        logger.debug('Processing request', {
            waitTimeMs: waitTime,
            remainingInQueue: this.queue.length,
        });

        // Task timeout from environment
        const timeout = parseInt(process.env.BROWSER_TIMEOUT || '60000', 10);

        try {
            // Race between the task and a timeout
            const result = await Promise.race([
                task(),
                new Promise((_, timeoutReject) =>
                    setTimeout(
                        () => timeoutReject(new Error(`Request timed out after ${timeout}ms`)),
                        timeout
                    )
                ),
            ]);

            this.totalProcessed++;
            resolve(result);
        } catch (error) {
            this.totalErrors++;
            logger.error('Request processing failed', {
                error: error.message,
                waitTimeMs: waitTime,
            });
            reject(error);
        } finally {
            this.processing = false;
            // Process next item in the queue
            this.processNext();
        }
    }

    /**
     * Get the current number of pending requests.
     *
     * @returns {number} Queue depth
     */
    getSize() {
        return this.queue.length;
    }

    /**
     * Check if a request is currently being processed.
     *
     * @returns {boolean} True if processing
     */
    isProcessing() {
        return this.processing;
    }

    /**
     * Get queue statistics.
     *
     * @returns {object} Queue stats
     */
    getStats() {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            totalProcessed: this.totalProcessed,
            totalErrors: this.totalErrors,
        };
    }
}

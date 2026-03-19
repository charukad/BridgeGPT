# ChatToAPI v1 — Task List

> Granular task checklist for building v1. Check off items as you complete them.

---

## Phase 1: Project Foundation *(Est. 1–2 days)*

### 1.1 — Initialize Node.js Project
- [ ] Create `package.json` with `npm init -y`
- [ ] Set `"type": "module"` in package.json
- [ ] Add `start`, `dev`, `login` scripts
- [ ] Install production dependencies (`express`, `cors`, `dotenv`, `uuid`, `playwright`)
- [ ] Install dev dependencies (`nodemon`)
- [ ] Run `npx playwright install chromium`
- [ ] Verify `npm run dev` doesn't crash

### 1.2 — Environment Configuration
- [ ] Create `.env.example` with all variables documented
- [ ] Create `.env` from `.env.example` and fill in values
- [ ] Create `.gitignore` (node_modules, auth, logs, .env)
- [ ] Verify `dotenv` loads all variables in a test script

### 1.3 — Logger Utility (`src/utils/logger.js`)
- [ ] Implement `debug()`, `info()`, `warn()`, `error()` methods
- [ ] Output as structured JSON with timestamps
- [ ] Respect `LOG_LEVEL` environment variable
- [ ] Add JSDoc comments to all functions

### 1.4 — Helper Utilities (`src/utils/helpers.js`)
- [ ] Implement `generateId()` — returns `chatcmpl-` + UUID
- [ ] Implement `sleep(ms)` — promisified setTimeout
- [ ] Implement `hashString(str)` — for cache keys
- [ ] Implement `formatResponse(content)` — OpenAI-format JSON
- [ ] Implement `formatStreamChunk(content, id)` — SSE chunk format
- [ ] Implement `formatErrorResponse(message, type, code)` — error JSON
- [ ] Add JSDoc comments to all functions
- [ ] Test `formatResponse()` output matches OpenAI schema

---

**Phase 1 Checkpoint:**
- [ ] ✅ `npm install` works
- [ ] ✅ Environment variables load correctly
- [ ] ✅ Logger outputs structured JSON
- [ ] ✅ Helper functions produce valid OpenAI-format responses

---

## Phase 2: Browser Engine *(Est. 3–4 days)*

### 2.1 — Browser Launcher (`src/browser/launcher.js`)
- [ ] Implement `launchBrowser()` with persistent context
- [ ] Use `auth/` directory for session storage
- [ ] Set realistic user-agent string
- [ ] Add `--disable-blink-features=AutomationControlled` flag
- [ ] Set viewport to 1280×720
- [ ] Implement `closeBrowser()` with graceful shutdown
- [ ] Implement `getPage()` to return active page
- [ ] Handle `HEADLESS` env variable (true/false)
- [ ] Auto-create `auth/` directory if missing
- [ ] Verify no automation banner appears

### 2.2 — Session Manager (`src/browser/session.js`)
- [ ] Implement `isLoggedIn(page)` — detect chat input presence
- [ ] Implement `waitForLogin(page)` — block until manual login completes
- [ ] Implement `getSessionStatus()` — return ready/login_required/error
- [ ] Handle Cloudflare challenge page detection
- [ ] Handle redirect to login page detection
- [ ] Set proper timeout (15s) for page load checks
- [ ] Log session status changes

### 2.3 — CSS Selectors (`src/browser/selectors.js`)
- [ ] Define `MESSAGE_INPUT` selector
- [ ] Define `SEND_BUTTON` selector
- [ ] Define `STOP_BUTTON` selector
- [ ] Define `ASSISTANT_MESSAGE` selector
- [ ] Define `NEW_CHAT_BUTTON` selector
- [ ] Define `LOGIN_FORM` selector
- [ ] Define `ERROR_MESSAGE` selector
- [ ] Define `RATE_LIMIT_TEXT` selector
- [ ] Define `NETWORK_ERROR_TEXT` selector
- [ ] Add JSDoc comment to each selector
- [ ] Verify all selectors against live ChatGPT UI (open in browser and test)

### 2.4 — Chat Automation (`src/browser/chat.js`)
- [ ] Implement `sendMessage(page, message)` — full send/receive cycle
  - [ ] Wait for input element
  - [ ] Clear existing text
  - [ ] Fill message text
  - [ ] Click send button
  - [ ] Wait for stop button to appear (response started)
  - [ ] Wait for stop button to disappear (response done)
  - [ ] Extract last assistant message text
  - [ ] Return extracted text
- [ ] Implement `sendMessageStreaming(page, message, onChunk)`
  - [ ] Set up MutationObserver via `page.evaluate()`
  - [ ] Call `onChunk(text)` for each new text node
  - [ ] Call `onChunk(null)` when response is complete
  - [ ] Clean up observer after completion
- [ ] Implement `startNewChat(page)` — click new chat button
- [ ] Implement `waitForResponse(page)` — wait for generation to finish
- [ ] Implement `isGenerating(page)` — check stop button visibility
- [ ] Handle "Something went wrong" error detection
- [ ] Handle rate limit detection
- [ ] Handle network error detection
- [ ] Handle response timeout (configurable via `BROWSER_TIMEOUT`)
- [ ] Handle empty response detection

### 2.5 — Response Parser (`src/utils/parser.js`)
- [ ] Implement `cleanResponse(rawText)` — trim whitespace, normalize newlines
- [ ] Implement `extractCodeBlocks(text)` — identify fenced code blocks
- [ ] Implement `parseMarkdown(text)` — preserve formatting, clean artifacts
- [ ] Handle multi-line responses
- [ ] Handle responses with mixed text and code

---

**Phase 2 Checkpoint:**
- [ ] ✅ Browser launches headlessly with saved session
- [ ] ✅ Login detection works correctly
- [ ] ✅ Can send a message manually via script and get a response
- [ ] ✅ Streaming text extraction works
- [ ] ✅ New chat button works

---

## Phase 3: API Layer *(Est. 2–3 days)*

### 3.1 — Express Server & Middleware
- [ ] Create `src/server.js` — Express app setup
  - [ ] Configure CORS (allow all origins)
  - [ ] Configure JSON body parser (10MB limit)
  - [ ] Mount middleware in correct order
  - [ ] Mount router
  - [ ] Add 404 handler for unknown routes
- [ ] Create `src/middleware.js`
  - [ ] Implement request logging middleware (method, path, duration)
  - [ ] Implement API key auth middleware (validate `Authorization: Bearer`)
  - [ ] Implement error handling middleware (catch-all, format as OpenAI error)
  - [ ] Skip auth for health check endpoint (`/`)
- [ ] Create `src/index.js` — main entry point
  - [ ] Load environment variables
  - [ ] Initialize browser
  - [ ] Check login status
  - [ ] Start Express server
  - [ ] Log startup message with port
  - [ ] Handle `SIGINT` / `SIGTERM` graceful shutdown (close browser, stop server)

### 3.2 — Chat Completions Endpoint (`POST /v1/chat/completions`)
- [ ] Create `src/router.js` with Express Router
- [ ] Validate request body
  - [ ] Check `messages` array exists and is non-empty
  - [ ] Check each message has `role` and `content`
  - [ ] Return 400 for invalid requests
- [ ] Extract last user message from messages array
- [ ] Enqueue into request queue
- [ ] Call `sendMessage()` and wait for response
- [ ] Format response using `formatResponse()`
- [ ] Return 200 with OpenAI-format JSON
- [ ] Test with `curl`
- [ ] Test with `openai` Python SDK

### 3.3 — Status, Login & New Chat Endpoints
- [ ] Implement `GET /v1/status`
  - [ ] Return login status, queue size, uptime, version
  - [ ] Return cache stats if enabled
- [ ] Implement `POST /v1/login`
  - [ ] Relaunch browser in visible mode
  - [ ] Navigate to ChatGPT
  - [ ] Return "login_started" response immediately
  - [ ] Background: poll `isLoggedIn()` every 5 seconds
  - [ ] On login success: save session, log event
- [ ] Implement `POST /v1/chat/new`
  - [ ] Call `startNewChat(page)`
  - [ ] Return success confirmation

### 3.4 — SSE Streaming Support
- [ ] Detect `stream: true` in request body
- [ ] Set SSE response headers (`text/event-stream`, `no-cache`, `keep-alive`)
- [ ] Call `sendMessageStreaming()` with chunk callback
- [ ] Format each chunk as `data: {OpenAI chunk JSON}\n\n`
- [ ] Send `data: [DONE]\n\n` at the end
- [ ] Handle client disconnect (`req.on('close')`)
- [ ] Test with `curl --no-buffer`
- [ ] Test with `openai` Python SDK `stream=True`
- [ ] Verify chunks are valid JSON individually

---

**Phase 3 Checkpoint:**
- [ ] ✅ Server starts and responds to requests
- [ ] ✅ Auth middleware rejects unauthorized requests
- [ ] ✅ `POST /v1/chat/completions` returns ChatGPT responses
- [ ] ✅ Streaming works end-to-end
- [ ] ✅ Status endpoint shows correct state
- [ ] ✅ Works with `openai` Python SDK (both streaming and non-streaming)

---

## Phase 4: Reliability Layer *(Est. 2 days)*

### 4.1 — Request Queue (`src/queue/requestQueue.js`)
- [ ] Implement `RequestQueue` class
- [ ] Implement `enqueue(taskFn)` — returns Promise
- [ ] Implement `getSize()` — return queue depth
- [ ] Implement `isProcessing()` — return boolean
- [ ] Process tasks sequentially (one at a time)
- [ ] Add per-task timeout (from `BROWSER_TIMEOUT`)
- [ ] On timeout: reject task, reload page, process next
- [ ] Integrate queue into chat completions handler
- [ ] Test: send 3 concurrent requests, verify sequential processing

### 4.2 — Retry Handler (`src/utils/retry.js`)
- [ ] Implement `withRetry(fn, options)` function
- [ ] Support configurable `maxRetries` (default from env)
- [ ] Support configurable `baseDelay` (default from env)
- [ ] Implement exponential backoff: `delay × 2^(attempt-1)`
- [ ] Accept `shouldRetry(error)` predicate function
- [ ] Define retryable error types (timeout, network, ChatGPT error)
- [ ] Define non-retryable error types (session expired, invalid input)
- [ ] Reload page before retry if browser error
- [ ] Log each retry attempt with attempt number and delay
- [ ] Wrap `sendMessage()` with retry in the router

### 4.3 — Response Cache (`src/utils/cache.js`)
- [ ] Implement `ResponseCache` class
- [ ] Implement `get(key)` — return cached value or null
- [ ] Implement `set(key, value)` — store with timestamp
- [ ] Implement `has(key)` — check existence
- [ ] Implement `clear()` — empty the cache
- [ ] Implement `getStats()` — return entries, hits, misses, hitRate
- [ ] Evict expired entries on access
- [ ] Generate cache key from message hash
- [ ] Respect `CACHE_ENABLED` and `CACHE_TTL_SECONDS` env vars
- [ ] Integrate cache check before calling ChatGPT
- [ ] Integrate cache store after receiving ChatGPT response
- [ ] Report cache stats in `/v1/status` endpoint

### 4.4 — Error Recovery
- [ ] Handle `page.on('crash')` — reopen page, navigate to ChatGPT
- [ ] Handle `browser.on('disconnected')` — relaunch browser entirely
- [ ] Handle navigation errors — retry navigation up to 3 times
- [ ] Handle ChatGPT error banner — detect and reload page
- [ ] Handle stuck response (no stop button for 2 minutes) — reload
- [ ] Log all recovery events with details
- [ ] Verify recovered state accepts new requests

---

**Phase 4 Checkpoint:**
- [ ] ✅ Concurrent requests are queued and processed one at a time
- [ ] ✅ Failed requests are retried automatically
- [ ] ✅ Cache hits return instant responses
- [ ] ✅ Browser crash triggers automatic recovery
- [ ] ✅ System remains functional after error recovery

---

## Phase 5: Packaging & Testing *(Est. 1–2 days)*

### 5.1 — Docker Setup
- [ ] Create `Dockerfile` using Playwright base image
- [ ] Create `docker-compose.yml` with volume mounts (auth, logs)
- [ ] Create `.dockerignore` (node_modules, auth, .env, .git)
- [ ] Test `docker-compose build`
- [ ] Test `docker-compose up`
- [ ] Verify session persists across container restarts
- [ ] Verify auto-restart on crash (`restart: unless-stopped`)

### 5.2 — README.md
- [ ] Write project overview and description
- [ ] Write quick start guide (5-minute setup)
- [ ] Include cURL usage example
- [ ] Include Python SDK usage example
- [ ] Include Node.js SDK usage example
- [ ] Document all environment variables
- [ ] Document Docker deployment steps
- [ ] Add FAQ section (common issues)
- [ ] Add license information

### 5.3 — End-to-End Testing
- [ ] Test 1: Login flow (`npm run login`)
- [ ] Test 2: Server starts (`npm start`)
- [ ] Test 3: Status check (`GET /v1/status`)
- [ ] Test 4: Auth rejection (no API key)
- [ ] Test 5: Send message (`POST /v1/chat/completions`)
- [ ] Test 6: Streaming (`stream: true`)
- [ ] Test 7: New chat (`POST /v1/chat/new`)
- [ ] Test 8: Queue test (3 simultaneous requests)
- [ ] Test 9: Error recovery (kill browser mid-response)
- [ ] Test 10: Cache hit (same message twice)
- [ ] Test 11: Python SDK compatibility
- [ ] Test 12: Docker deployment

---

**Phase 5 Checkpoint:**
- [ ] ✅ Docker container builds and runs
- [ ] ✅ README enables 5-minute setup
- [ ] ✅ All 12 E2E tests pass
- [ ] ✅ **v1 is complete and ready for use** 🎉

---

## Summary

| Phase | Tasks | Subtasks | Est. Days |
|-------|:-----:|:--------:|:---------:|
| Phase 1: Foundation | 4 | 22 | 1–2 |
| Phase 2: Browser Engine | 5 | 42 | 3–4 |
| Phase 3: API Layer | 4 | 35 | 2–3 |
| Phase 4: Reliability | 4 | 30 | 2 |
| Phase 5: Packaging | 3 | 21 | 1–2 |
| **Total** | **20** | **150** | **9–13** |

---

*v1 Task List — ChatToAPI*
*Last updated: 2026-03-19*

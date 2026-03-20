# BridgeGPT v2 — Task List

> Granular checklist for building v2. Push to GitHub after every sub-phase! 🚀

---

## 🔁 GitHub Push Reminder

> [!IMPORTANT]
> After completing **every sub-phase**, run:
> ```bash
> git add -A && git commit -m "feat(v2): <describe what you built>" && git push origin main
> ```

---

## Phase 1: System Prompt Support *(Feature 14)*

### 1.1 — Update `chat.js`
- [ ] Add `sendWithSystemPrompt(page, messages)` function
- [ ] Extract `system` role messages from the array
- [ ] Inject system content as hidden first message
- [ ] Wait for acknowledgment and discard it
- [ ] Fall back to normal `sendMessage` if no system message

### 1.2 — Update `router.js`
- [ ] Detect `system` role in incoming `messages` array
- [ ] Route to `sendWithSystemPrompt` when system message present
- [ ] Keep backward compat (requests with no system message unchanged)

### 1.3 — Test
- [ ] Test with `"role": "system"` persona (e.g. "You are a pirate")
- [ ] Test without system prompt (ensure nothing is broken)
- [ ] Test streaming mode with system prompt

### ✅ Sub-Phase 1 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f14): add system prompt injection support" && git push origin main
```

---

## Phase 2: Multi-Turn Conversation Memory *(Feature 15)*

### 2.1 — Update `router.js`
- [ ] Add `handleMultiTurnConversation(page, messages)` function
- [ ] Build context block from prior history turns
- [ ] Prepend history context to the latest user message
- [ ] Add `MAX_HISTORY_MESSAGES` env var support (default: 20)

### 2.2 — Update `.env.example`
- [ ] Add `MAX_HISTORY_MESSAGES=20` with comment

### 2.3 — Test
- [ ] Send 3-turn conversation: "My name is Dasun" → "What is my name?"
- [ ] Verify AI correctly recalls prior context
- [ ] Test with streaming mode

### ✅ Sub-Phase 2 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f15): add multi-turn conversation memory" && git push origin main
```

---

## Phase 3: Token Counting *(Feature 16)*

### 3.1 — Install dependency
- [ ] Run `npm install js-tiktoken`

### 3.2 — Create `src/utils/tokenizer.js`
- [ ] Implement `countTokens(text)` function
- [ ] Implement `countMessageTokens(messages)` function
- [ ] Use `gpt-4o` encoding

### 3.3 — Update `src/utils/helpers.js`
- [ ] Import tokenizer functions
- [ ] Update `formatResponse(text, inputMessages)` to accept messages
- [ ] Return real `prompt_tokens`, `completion_tokens`, `total_tokens`

### 3.4 — Update `src/router.js`
- [ ] Pass `messages` array into `formatResponse()` call

### 3.5 — Test
- [ ] Verify `usage` field has non-zero counts
- [ ] Check counts are reasonable for message length

### ✅ Sub-Phase 3 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f16): add real token counting with js-tiktoken" && git push origin main
```

---

## Phase 4: Model Selection *(Feature 2)*

### 4.1 — Update `src/browser/selectors.js`
- [ ] Add `MODEL_SELECTOR` CSS selector
- [ ] Add model option selectors for each supported model

### 4.2 — Create `src/browser/modelSelector.js`
- [ ] Implement `selectModel(page, modelName)` function
- [ ] Handle model not available (wrong plan) gracefully
- [ ] Map API model names → ChatGPT UI display names

### 4.3 — Update `src/router.js`
- [ ] Read `model` field from request body
- [ ] Call `selectModel()` before sending message
- [ ] Add `GET /v1/models` endpoint returning supported models

### 4.4 — Test
- [ ] Test `"model": "gpt-4o-mini"` request
- [ ] Test fallback when model is unsupported

### ✅ Sub-Phase 4 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f2): add model selection and /v1/models endpoint" && git push origin main
```

---

## Phase 5: File & Image Upload *(Feature 1)*

### 5.1 — Install dependency
- [ ] Run `npm install multer` (for multipart form parsing)

### 5.2 — Create `src/browser/fileUploader.js`
- [ ] Implement `uploadFile(page, filePath)` function
- [ ] Handle file input click (paperclip button)
- [ ] Wait for upload progress to complete

### 5.3 — Update `src/router.js`
- [ ] Add `multer` middleware for `/v1/chat/completions`
- [ ] Save uploaded file to `tmp/uploads/` directory
- [ ] Pass file path to `uploadFile()` before sending message

### 5.4 — Update `.env.example`
- [ ] Add `MAX_FILE_SIZE_MB=50`
- [ ] Add `UPLOAD_TEMP_DIR=./tmp/uploads`

### 5.5 — Test
- [ ] Upload a `.txt` file and ask a question about it
- [ ] Upload a `.png` image and ask ChatGPT to describe it
- [ ] Verify temp files are cleaned up after response

### ✅ Sub-Phase 5 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f1): add file and image upload support" && git push origin main
```

---

## Phase 6: Usage Dashboard *(Feature 10)*

### 6.1 — Install dependency
- [ ] Run `npm install better-sqlite3`

### 6.2 — Create `src/db/database.js`
- [ ] Initialize SQLite database at `data/bridgegpt.db`
- [ ] Create `requests` table (model, tokens, latency, status, timestamp)

### 6.3 — Update `src/middleware.js`
- [ ] Log every request to SQLite after response is sent

### 6.4 — Create dashboard UI `chatinterface/dashboard.html`
- [ ] Show total requests, avg latency, token usage chart (Chart.js)
- [ ] Serve at `/ui/dashboard`

### 6.5 — Update `src/server.js`
- [ ] Serve `dashboard.html` at `/ui/dashboard`

### 6.6 — Test
- [ ] Send 5 requests, verify they appear in dashboard

### ✅ Sub-Phase 6 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f10): add usage dashboard with SQLite logging" && git push origin main
```

---

## Phase 7: Multiple Account Support *(Feature 3)*

### 7.1 — Create `accounts.json` template
- [ ] Add example config with 2 accounts
- [ ] Document in README

### 7.2 — Create `src/browser/accountPool.js`
- [ ] Load accounts from `accounts.json`
- [ ] Launch a separate browser context per account
- [ ] Implement `round-robin` load balancing strategy
- [ ] Track per-account queue depth and request counts

### 7.3 — Update `src/index.js`
- [ ] Start account pool if `ACCOUNTS_CONFIG` env var is set
- [ ] Fall back to single-account mode if not set

### 7.4 — Update `/v1/status` endpoint
- [ ] Return per-account stats in multi-account mode

### 7.5 — Test
- [ ] Configure 2 accounts and send 10 requests
- [ ] Verify requests are distributed evenly

### ✅ Sub-Phase 7 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f3): add multiple account support with round-robin load balancing" && git push origin main
```

---

## Phase 8: DALL-E Image Generation *(Feature 5)*

### 8.1 — Create `src/browser/imageGenerator.js`
- [ ] Implement `generateImage(page, prompt)` function
- [ ] Start a new chat, send "Generate an image: ..."
- [ ] Wait for `<img>` element with DALL-E URL to appear
- [ ] Download image and save locally before URL expires

### 8.2 — Update `src/router.js`
- [ ] Add `POST /v1/images/generate` endpoint
- [ ] Serve generated images at `GET /v1/images/:filename`

### 8.3 — Update `.env.example`
- [ ] Add `IMAGES_DIR=./generated-images`
- [ ] Add `IMAGE_GENERATION_TIMEOUT=120000`

### 8.4 — Test
- [ ] Generate an image and verify it is saved and served locally

### ✅ Sub-Phase 8 Complete — Push to GitHub!
```bash
git add -A && git commit -m "feat(v2/f5): add DALL-E image generation via ChatGPT" && git push origin main
```

---

## Phase 9: Final Polish

- [ ] Update `README.md` with all v2 features
- [ ] Update `chatinterface/index.html` with model dropdown selector
- [ ] Add v2 upgrade section to README
- [ ] Tag GitHub release as `v2.0.0`

### ✅ v2 Complete — Final Push!
```bash
git add -A && git commit -m "release: BridgeGPT v2.0.0" && git push origin main
git tag v2.0.0 && git push origin v2.0.0
```

---

## Summary

| Phase | Feature | Priority |
|-------|---------|----------|
| 1 | System Prompt Support | 🔴 High |
| 2 | Multi-Turn Memory | 🔴 High |
| 3 | Token Counting | 🔴 High |
| 4 | Model Selection | 🟡 Medium |
| 5 | File & Image Upload | 🟡 Medium |
| 6 | Usage Dashboard | 🟡 Medium |
| 7 | Multiple Accounts | 🟢 Low |
| 8 | DALL-E Image Gen | 🟢 Low |
| 9 | Final Polish | 🟢 Low |

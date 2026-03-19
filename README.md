# 🌉 BridgeGPT

> Turn your ChatGPT subscription into a REST API.

**BridgeGPT** is a self-hosted reverse proxy that converts the ChatGPT web interface into an OpenAI-compatible REST API using browser automation. No separate API key needed — use what you already pay for.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🔄 **OpenAI SDK Compatible** — works with the official `openai` Python/Node.js SDKs
- ⚡ **Streaming (SSE)** — real-time token-by-token responses
- 📋 **Request Queue** — safely handles concurrent requests
- 🔁 **Auto-Retry** — exponential backoff on failures
- 💾 **Response Cache** — avoid duplicate requests
- 🐳 **Docker Support** — one-command deployment
- 🔑 **API Key Auth** — protect your wrapper

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/charukad/BridgeGPT.git
cd BridgeGPT
npm install
npx playwright install chromium
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and set a strong `API_KEY`:

```env
API_KEY=your-super-secret-key-here
```

> 💡 Generate a strong key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Login to ChatGPT (first time only)

```bash
npm run login
```

A browser window opens → log in to ChatGPT → window closes automatically.

### 4. Start the Server

```bash
npm start
```

```
============================================================
  🌉 BridgeGPT v1.0.0
============================================================
  API:     http://localhost:3000
  Status:  http://localhost:3000/v1/status
  Session: ready
============================================================
```

### 5. Use It!

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-super-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

---

## 📖 API Reference

### `POST /v1/chat/completions`

Send a message and get a response. Supports streaming.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "What is the capital of France?"}
  ],
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "bridgegpt",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "The capital of France is Paris."
    },
    "finish_reason": "stop"
  }]
}
```

### `GET /v1/status`
Health check — returns login status, queue depth, uptime.

### `POST /v1/chat/new`
Start a new ChatGPT conversation.

### `POST /v1/login`
Trigger login flow (opens visible browser).

---

## 🐍 Use with OpenAI SDKs

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-super-secret-key-here",
    base_url="http://localhost:3000/v1"
)

response = client.chat.completions.create(
    model="bridgegpt",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Python (Streaming)

```python
stream = client.chat.completions.create(
    model="bridgegpt",
    messages=[{"role": "user", "content": "Write a poem"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

### Node.js

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: 'your-super-secret-key-here',
    baseURL: 'http://localhost:3000/v1'
});

const response = await client.chat.completions.create({
    model: 'bridgegpt',
    messages: [{ role: 'user', content: 'Hello!' }]
});
console.log(response.choices[0].message.content);
```

---

## 🐳 Docker

```bash
# Login first (on host — Docker can't show browser window)
npm run login

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `API_KEY` | — | **Required.** Your wrapper's API key |
| `HEADLESS` | `true` | Run browser without UI |
| `BROWSER_TIMEOUT` | `60000` | Max response wait time (ms) |
| `CACHE_ENABLED` | `false` | Enable response caching |
| `CACHE_TTL_SECONDS` | `3600` | Cache lifetime |
| `MAX_RETRIES` | `3` | Retry attempts on failure |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

---

## 📁 Project Structure

```
BridgeGPT/
├── src/
│   ├── index.js              # Entry point
│   ├── server.js              # Express setup
│   ├── router.js              # API routes
│   ├── middleware.js           # Auth, logging, errors
│   ├── login.js               # Manual login script
│   ├── browser/
│   │   ├── launcher.js        # Playwright lifecycle
│   │   ├── session.js         # Login detection
│   │   ├── chat.js            # Message send/receive
│   │   └── selectors.js       # CSS selectors
│   ├── queue/
│   │   └── requestQueue.js    # Sequential request queue
│   └── utils/
│       ├── cache.js           # Response cache
│       ├── retry.js           # Retry with backoff
│       ├── logger.js          # JSON logger
│       └── helpers.js         # Formatting utilities
├── auth/                      # Session data (gitignored)
├── docs/                      # Detailed documentation
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Login required" | Run `npm run login` |
| Slow responses | Increase `BROWSER_TIMEOUT` in `.env` |
| Empty responses | CSS selectors may be outdated — update `src/browser/selectors.js` |
| "Browser crashed" | Restart server — auto-recovery will re-launch |

**Debug mode** (see what's happening in the browser):
```bash
HEADLESS=false npm start
```

---

## ⚠️ Disclaimer

This tool automates the ChatGPT web interface. Use responsibly and for personal use only. The authors are not responsible for any ToS violations.

---

## 📄 License

MIT © [charukad](https://github.com/charukad)

# 🕷️ XPS Shadow Scraper

> **Super Shadow REST API Agent** with Key Harvester Technology — purpose-built for intelligent web scraping with an AI chat interface, auto-deployed on Railway.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/xps-scraper)
![CI/CD](https://github.com/InfinityXOneSystems/Xps-scraper/actions/workflows/deploy.yml/badge.svg)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Scraping Agent** | Chat with an LLM to instruct the scraper in natural language |
| 🔑 **Key Harvester** | Automatically extracts API keys, JWTs, tokens, and secrets from web content |
| 🕸️ **Multi-URL Scraping** | Batch scrape URLs; extract text, links, images, headings, tables, and meta tags |
| 🎯 **CSS Selector Extraction** | Target specific page elements with custom CSS selectors |
| 💬 **Chat UI** | Open-source React chat interface with dark theme and markdown rendering |
| 🚀 **Railway Auto-Deploy** | One-click deploy to Railway with CI/CD on every push to `main` |
| 🔄 **XPS Intelligence Sync** | Nightly env-var sync from XPS Intelligence System, Frontend, and Lead Intelligence repos |
| 🛡️ **Auth & Rate Limiting** | Optional JWT / API-key auth and configurable rate limiting |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      XPS Shadow Scraper                     │
│                                                             │
│  ┌──────────────────┐          ┌──────────────────────────┐ │
│  │  Frontend (React) │  REST    │   Backend (Express/TS)   │ │
│  │  Chat UI :3000    │◄────────►│   REST API Agent :3001   │ │
│  └──────────────────┘          └──────────┬───────────────┘ │
│                                           │                  │
│                          ┌────────────────┼──────────────┐  │
│                          │                │              │  │
│                    ┌─────▼─────┐  ┌───────▼──────┐ ┌────▼──┤
│                    │  Scraper  │  │Key Harvester │ │  LLM  │
│                    │ (cheerio) │  │  (regex)     │ │ Agent │
│                    └───────────┘  └──────────────┘ └───────┘
└─────────────────────────────────────────────────────────────┘
```

### Services

| Service | Port | Stack |
|---------|------|-------|
| **Backend** | 3001 | Node.js 20 + Express + TypeScript |
| **Frontend** | 3000 | React 18 + Vite + Tailwind CSS |
| **LLM** (optional) | 11434 | Ollama (local) or any OpenAI-compatible API |

---

## 🚀 Quick Start

### Option 1 – Railway One-Click Deploy (Recommended)

1. Click the **Deploy on Railway** button above
2. Set the required environment variables (see `.env.example`)
3. Railway auto-deploys both frontend and backend — you're live in minutes

### Option 2 – Docker Compose (Local Development)

```bash
# 1. Clone and enter the repo
git clone https://github.com/InfinityXOneSystems/Xps-scraper.git
cd Xps-scraper

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your LLM API key and other settings

# 3. Start all services (backend + frontend + Ollama)
docker-compose up --build

# 4. Open the chat UI
open http://localhost:3000
```

### Option 3 – Run Services Directly

```bash
# Backend
cd backend
npm install
npm run dev     # → http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev     # → http://localhost:3000
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`.

### Health Check

```
GET /health
```
```json
{ "status": "ok", "service": "xps-scraper-backend", "version": "1.0.0" }
```

### 🕸️ Scraping

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scrape` | Scrape a single URL |
| `POST` | `/api/scrape/bulk` | Scrape multiple URLs |
| `POST` | `/api/scrape/extract` | Extract specific CSS selectors |

**Example – Scrape a URL:**
```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Example – Extract specific selectors:**
```bash
curl -X POST http://localhost:3001/api/scrape/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com",
    "selectors": {
      "stories": ".storylink",
      "scores": ".score"
    }
  }'
```

### 🔑 Key Harvester

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/keys/harvest` | Harvest keys from URL or raw content |
| `GET` | `/api/keys` | List all harvested keys (masked) |
| `GET` | `/api/keys/:id` | Get specific key details |
| `DELETE` | `/api/keys/:id` | Delete a key |
| `DELETE` | `/api/keys` | Clear all keys |
| `GET` | `/api/keys/export?format=json` | Export keys as JSON or CSV |

**Example – Harvest from URL:**
```bash
curl -X POST http://localhost:3001/api/keys/harvest \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/config.js"}'
```

**Detected Key Types:**

| Type | Pattern Example |
|------|----------------|
| API Key | `sk-abc123...`, `pk_live_...` |
| JWT | `eyJ...eyJ...signature` |
| AWS | `AKIA...`, `aws_secret_access_key` |
| Stripe | `sk_test_...`, `pk_live_...` |
| GitHub | `ghp_...`, `ghs_...` |
| OAuth | `ya29....` |
| Bearer Token | `Bearer eyJ...` |
| Generic Secret | `secret_key = "..."` |

### 🤖 AI Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agent/chat` | Chat with the scraping agent |
| `GET` | `/api/agent/conversation/:id` | Get conversation history |
| `POST` | `/api/agent/conversation` | Start a new conversation |

**Example – Chat:**
```bash
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Scrape https://example.com and list all external links"}'
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Backend port |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS origin |
| `LLM_API_URL` | No | `http://localhost:11434/v1` | LLM API endpoint |
| `LLM_API_KEY` | No | `ollama` | LLM API key |
| `LLM_MODEL` | No | `llama3.2` | LLM model name |
| `API_KEY` | No | *(none)* | Static API key for auth |
| `JWT_SECRET` | No | *(none)* | JWT signing secret |
| `RAILWAY_TOKEN` | Railway only | — | Railway deploy token |

### XPS Intelligence Sync

Set these as **GitHub repository Secrets** to enable nightly env sync:

| Secret | Description |
|--------|-------------|
| `SYNC_PAT` | GitHub PAT with `repo` scope |
| `XPS_INTELLIGENCE_API_URL` | XPS Intelligence System API URL |
| `XPS_INTELLIGENCE_API_KEY` | XPS Intelligence System API key |
| `XPS_LEAD_INTELLIGENCE_URL` | XPS Lead Intelligence API URL |
| `XPS_LEAD_INTELLIGENCE_KEY` | XPS Lead Intelligence API key |
| `XPS_FRONTEND_URL` | XPS Intelligence Frontend URL |

---

## 🔄 CI/CD

### Deploy Workflow (`.github/workflows/deploy.yml`)

Triggers on every push to `main`:
1. Runs backend tests
2. Builds frontend
3. Deploys both services to Railway

### Env Sync Workflow (`.github/workflows/sync-env.yml`)

Runs daily at 02:00 UTC:
- Fetches env vars from XPS Intelligence repos
- Pushes updated variables to Railway services
- Can be triggered manually with dry-run option

---

## 🏗️ Project Structure

```
Xps-scraper/
├── backend/                    # Express/TypeScript REST API
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── config.ts           # Centralised config
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT/API-key auth
│   │   │   └── rateLimiter.ts  # Rate limiting
│   │   ├── routes/
│   │   │   ├── scrape.ts       # Scraping endpoints
│   │   │   ├── agent.ts        # AI agent chat endpoints
│   │   │   └── keys.ts         # Key harvester endpoints
│   │   ├── services/
│   │   │   ├── scraper.ts      # Cheerio + axios scraper
│   │   │   ├── keyHarvester.ts # Regex-based key extractor
│   │   │   └── llm.ts          # OpenAI-compatible LLM client
│   │   └── tests/
│   │       └── scraper.test.ts # Unit tests
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # React/Vite Chat UI
│   ├── src/
│   │   ├── App.tsx             # Root component + layout
│   │   ├── api.ts              # API client
│   │   ├── types.ts            # TypeScript types
│   │   └── components/
│   │       ├── Chat.tsx        # Chat interface
│   │       ├── Scrape.tsx      # Scrape panel
│   │       └── Keys.tsx        # Key management panel
│   ├── Dockerfile
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Railway auto-deploy
│       └── sync-env.yml        # XPS Intelligence env sync
│
├── docker-compose.yml          # Local dev stack
├── railway.toml                # Railway deployment config
├── .env.example                # Environment template
└── README.md
```

---

## 🛠️ Development

```bash
# Run backend tests
cd backend && npm test

# Lint frontend
cd frontend && npm run lint

# Type-check backend
cd backend && npm run build
```

---

## 📄 License

MIT © InfinityXOneSystems
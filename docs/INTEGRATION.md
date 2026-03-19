# XPS Shadow Scraper — Full-Stack Integration Guide

> **Protocol:** 110% — Zero Tech Debt, TAP Policy, Quantum Standard  
> **Version:** 1.0.0  
> **Stack:** TypeScript · Node.js 20 · React 18 · Postgres · Redis · Groq · Ollama · Railway

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Quick Start](#2-quick-start)
3. [Template Repositories](#3-template-repositories)
4. [Service Configuration](#4-service-configuration)
5. [LLM Provider Setup](#5-llm-provider-setup)
6. [Railway Cloud Deployment](#6-railway-cloud-deployment)
7. [Docker Compose Reference](#7-docker-compose-reference)
8. [CI/CD Workflows](#8-cicd-workflows)
9. [OpenAI GPT Actions](#9-openai-gpt-actions)
10. [Playwright E2E Testing](#10-playwright-e2e-testing)
11. [XPS GitHub App](#11-xps-github-app)
12. [Security & Governance](#12-security--governance)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     XPS Shadow Scraper — Full Stack                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Frontend (React 18 + Vite)  :3000                                  │ │
│  │  • Chat / Agent Builder UI    • Scrape / Crawl panel                │ │
│  │  • Key Harvest display        • Workflow orchestration              │ │
│  └────────────────────────────┬────────────────────────────────────────┘ │
│                               │ REST API                                  │
│  ┌────────────────────────────▼────────────────────────────────────────┐ │
│  │  Backend / Orchestrator (Express + TS)  :3001                       │ │
│  │  Routes: /scrape /crawl /keys /agent /orchestrator /crm /leads      │ │
│  │  Services: scraper · firecrawl · keyHarvester · llm · redis · pg    │ │
│  └──┬──────────┬──────────┬──────────┬──────────────────────┬──────────┘ │
│     │          │          │          │                      │            │
│  ┌──▼──┐  ┌───▼──┐  ┌────▼────┐ ┌───▼───────────┐  ┌──────▼──────┐    │
│  │Pg   │  │Redis │  │Firecrawl│ │Open Claw :3003│  │Deep Research│    │
│  │:5432│  │:6379 │  │Cloud API│ │(templates/)   │  │:3004        │    │
│  └─────┘  └──────┘  └─────────┘ └───────────────┘  └─────────────┘    │
│                                                                           │
│  LLM: Groq Cloud (default) ←→ Ollama (optional local)  :11434           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User request
     │
     ▼
POST /api/orchestrator/run
     │
     ├── node: crawl    → Firecrawl API → pages[]
     ├── node: scrape   → XPS Scraper  → content{}
     ├── node: harvest  → keyHarvester → keys[]
     ├── node: research → Deep Research → facts[]
     └── node: export   → JSON/CSV
```

---

## 2. Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | https://nodejs.org |
| npm | ≥ 10 | bundled with Node.js |
| Docker | ≥ 24 | https://docker.com |
| Docker Compose | v2 | bundled with Docker Desktop |
| Git | any | https://git-scm.com |

### Step 1 — Clone and Set Up

```bash
# Clone this repository
git clone https://github.com/InfinityXOneSystems/Xps-scraper.git
cd Xps-scraper

# Download all template repositories and install dependencies
bash scripts/setup-integration.sh
```

### Step 2 — Configure Environment

```bash
cp .env.example .env
# Edit .env and fill in at minimum:
#   GROQ_API_KEY=gsk_...       (Groq Cloud — primary LLM)
#   FIRECRAWL_API_KEY=fc-...   (Firecrawl — web crawling)
#   API_KEY=...                (Backend auth in production)
```

### Step 3 — Start the Stack

```bash
# Core stack (recommended for dev)
docker compose up --build

# Full stack (includes template services, requires --full)
bash scripts/start-stack.sh --full

# OR: run services directly (without Docker)
cd backend && npm run dev &
cd frontend && npm run dev &
```

### Step 4 — Verify

```bash
# Backend health
curl http://localhost:3001/health

# Frontend
open http://localhost:3000

# Run E2E tests
npm run test:e2e
```

---

## 3. Template Repositories

All templates are cloned into `templates/` by `scripts/setup-integration.sh`.

| Template | Purpose | Local Path | Port |
|----------|---------|-----------|------|
| **firecrawl** | Web crawling engine | `templates/firecrawl/` | via API |
| **firecrawl-mcp** | MCP server | `templates/firecrawl-mcp/` | — |
| **open-lovable** | Agent builder UI | `templates/open-lovable/` | — |
| **open-agent-builder** | Agent composition | `templates/open-agent-builder/` | — |
| **open-claw** | Asset extraction | `templates/open-claw/` | 3003 |
| **open-deep-research** | LLM fact extraction | `templates/open-deep-research/` | 3004 |

> **Note:** Template services use the `templates` Docker Compose profile.  
> Start with: `docker compose -f docker-compose.full-stack.yml --profile templates up`

---

## 4. Service Configuration

### Backend Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `GET /health` | public | Health check |
| `POST /api/scrape` | auth | Scrape a URL |
| `POST /api/scrape/bulk` | auth | Scrape multiple URLs |
| `POST /api/crawl/crawl` | auth | Deep crawl via Firecrawl |
| `GET /api/crawl/status` | auth | Firecrawl availability |
| `POST /api/keys/harvest` | auth | Harvest keys from URL/content |
| `GET /api/keys` | auth | List harvested keys |
| `GET /api/keys/export` | auth | Export keys (JSON/CSV) |
| `POST /api/agent/chat` | auth | AI agent chat |
| `POST /api/orchestrator/run` | auth | Run a workflow |
| `GET /api/orchestrator/status/:id` | auth | Poll workflow status |

### Adding New Services

1. **Create adapter** in `backend/src/services/<name>Adapter.ts`:
   ```typescript
   import axios from 'axios';
   import { config } from '../config';
   
   export const myAdapter = {
     isAvailable: () => Boolean(config.MY_SERVICE_URL),
     call: async (data: unknown) => {
       const res = await axios.post(`${config.MY_SERVICE_URL}/api/action`, data);
       return res.data;
     },
   };
   ```

2. **Create route** in `backend/src/routes/<name>.ts`
3. **Register** in `backend/src/routes/index.ts`
4. **Add to Docker Compose** in `docker-compose.full-stack.yml`
5. **Add env vars** to `.env.example`

---

## 5. LLM Provider Setup

### Groq Cloud (Recommended — Production)

```bash
# 1. Get API key: https://console.groq.com
# 2. Set in .env:
GROQ_API_KEY=gsk_your_key_here
LLM_API_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_your_key_here   # same as GROQ_API_KEY
LLM_MODEL=llama-3.3-70b-versatile
```

Available Groq models:
- `llama-3.3-70b-versatile` (recommended)
- `mixtral-8x7b-32768`
- `gemma2-9b-it`

### Ollama (Local — Dev/Air-gapped)

```bash
# Start Ollama container
docker compose --profile ollama up ollama

# OR install locally: https://ollama.com
ollama pull llama3.2

# Set in .env:
LLM_API_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.2
```

### OpenAI

```bash
OPENAI_API_KEY=sk-your_key_here
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your_key_here
LLM_MODEL=gpt-4o-mini
```

---

## 6. Railway Cloud Deployment

### Initial Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create a new Railway project
railway init

# Link to existing project
railway link <project-id>
```

### Provision Infrastructure

```bash
# Add Postgres and Redis add-ons
railway add --plugin postgresql
railway add --plugin redis
```

### Set Environment Variables

```bash
# Required variables
railway variables set GROQ_API_KEY=gsk_...
railway variables set FIRECRAWL_API_KEY=fc-...
railway variables set API_KEY=$(openssl rand -hex 32)
railway variables set JWT_SECRET=$(openssl rand -hex 64)
railway variables set GITHUB_APP_ID=...
railway variables set GITHUB_APP_PRIVATE_KEY="$(cat private-key.pem)"
railway variables set GITHUB_APP_INSTALLATION_ID=...
```

### Deploy

```bash
# Backend
railway up --service backend

# Frontend
railway up --service frontend
```

### View Logs

```bash
railway logs --service backend --tail
```

---

## 7. Docker Compose Reference

### Core Stack (backend + frontend + DB + cache)

```bash
docker compose up --build
docker compose down -v   # tear down + remove volumes
```

### Full Stack (all services)

```bash
# Requires: bash scripts/setup-integration.sh first
docker compose -f docker-compose.full-stack.yml up --build

# With template services (open-claw, deep-research)
docker compose -f docker-compose.full-stack.yml --profile templates up

# With local Ollama LLM
docker compose -f docker-compose.full-stack.yml --profile ollama up
```

### Individual Services

```bash
# Start only DB + cache
docker compose up postgres redis

# Start backend only
docker compose up backend

# View logs
docker compose logs -f backend frontend
```

### Service Health Checks

```bash
curl http://localhost:3001/health   # backend
curl http://localhost:3000          # frontend
redis-cli -h localhost ping         # redis
psql postgresql://xps:xpspassword@localhost:5432/xps_scraper -c "SELECT 1"  # postgres
```

---

## 8. CI/CD Workflows

### Workflows Summary

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/integration.yml` | Push / PR | Clone templates, build, E2E tests, deploy |
| `.github/workflows/deploy.yml` | Push to main | Test + deploy to Railway |
| `.github/workflows/sync-env.yml` | Daily 02:00 UTC | Sync env vars from XPS repos |
| `.github/workflows/scraper.yml` | Daily 06:00 UTC | Scheduled scraper run |

### Required GitHub Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway deployment token |
| `VITE_API_URL` | Production frontend API URL |
| `GROQ_API_KEY` | Groq Cloud API key |
| `FIRECRAWL_API_KEY` | Firecrawl API key |
| `GITHUB_APP_ID` | XPS GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | XPS GitHub App private key (PEM) |
| `GITHUB_APP_INSTALLATION_ID` | XPS GitHub App installation ID |
| `SYNC_PAT` | GitHub PAT for env-sync workflow |

### Manual Workflow Dispatch

```bash
# Trigger integration workflow manually
gh workflow run integration.yml

# With custom inputs
gh workflow run integration.yml --field environment=staging --field run_e2e=true
```

---

## 9. OpenAI GPT Actions

The full OpenAPI 3.1 schema is at `openapi/gpt-actions.json`.

### Import to ChatGPT

1. Go to **ChatGPT → My GPTs → Create → Configure → Actions**
2. Click **Import from URL** or **Upload schema**
3. Use the schema from `openapi/gpt-actions.json`
4. Set **Authentication**: API Key → Header name: `X-API-Key`
5. Set **Server URL**: `https://your-backend.railway.app`

### Available Operations (Function Calls)

| `operationId` | Method | Path | Description |
|---------------|--------|------|-------------|
| `getHealth` | GET | `/health` | System health check |
| `scrapeUrl` | POST | `/api/scrape` | Scrape a single URL |
| `bulkScrape` | POST | `/api/scrape/bulk` | Scrape multiple URLs |
| `crawlSite` | POST | `/api/crawl/crawl` | Deep-crawl a website |
| `getCrawlStatus` | GET | `/api/crawl/status/{jobId}` | Poll crawl status |
| `harvestKeys` | POST | `/api/keys/harvest` | Harvest API keys/secrets |
| `listKeys` | GET | `/api/keys` | List harvested keys |
| `exportKeys` | GET | `/api/keys/export` | Export keys file |
| `runWorkflow` | POST | `/api/orchestrator/run` | Run agent workflow |
| `getWorkflowStatus` | GET | `/api/orchestrator/status/{runId}` | Poll workflow status |
| `agentChat` | POST | `/api/agent/chat` | AI agent chat |
| `getConversation` | GET | `/api/agent/conversation/{id}` | Get chat history |
| `deleteKey` | DELETE | `/api/keys/{id}` | Delete a key record |

---

## 10. Playwright E2E Testing

### Run Tests

```bash
# Install Playwright (one-time)
npx playwright install chromium --with-deps

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/integration.spec.ts

# Interactive UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### Test Coverage

| Suite | File | Tests |
|-------|------|-------|
| Backend Health | `dashboard.spec.ts` | 5 |
| Dashboard UI | `integration.spec.ts` | 5 |
| Navigation | `integration.spec.ts` | 4 |
| Scraping API | `integration.spec.ts` | 3 |
| Key Harvesting | `integration.spec.ts` | 4 |
| Crawl API | `integration.spec.ts` | 3 |
| Orchestrator | `integration.spec.ts` | 4 |
| Agent Chat | `integration.spec.ts` | 2 |
| OpenAPI Schema | `integration.spec.ts` | 2 |
| Full Pipeline | `integration.spec.ts` | 2 |

### Screenshots

Saved to `tests/e2e/screenshots/`:
- `dashboard-connected.png` — Dashboard connected state
- `scrape-tab.png` — Scrape interface
- `keys-tab.png` — Key harvest interface
- `chat-tab.png` — Agent chat interface
- `full-pipeline-final.png` — Full pipeline completion

---

## 11. XPS GitHub App

The **XPS GitHub App** provides global read/write/admin scope for CI/CD orchestration.

### Capabilities

- Clone private template repositories
- Push deployment artifacts
- Manage Railway deployments via token
- Sync environment variables across services
- Trigger and monitor CI/CD workflows

### Setup

1. **Create the GitHub App** at https://github.com/settings/apps/new
2. **Required permissions:**
   - Repository: Contents (read/write), Actions (read/write), Deployments (read/write)
   - Organization: Members (read)
3. **Install** on the `InfinityXOneSystems` organization
4. **Generate a private key** and download the `.pem` file
5. **Set secrets** in GitHub repository:
   ```
   GITHUB_APP_ID=<numeric-app-id>
   GITHUB_APP_PRIVATE_KEY=<contents-of-pem-file>
   GITHUB_APP_INSTALLATION_ID=<installation-id>
   ```

### Usage in Workflows

The `integration.yml` workflow uses the app token to:
- Authenticate clone operations for private/restricted repos
- Provide an audit trail for all deployment operations
- Enable cross-repo event triggers

---

## 12. Security & Governance

### TAP Protocol Enforcement

| Control | Implementation |
|---------|---------------|
| **Rate limiting** | Redis-backed, per-IP, configurable window/max |
| **Audit trail** | All write operations logged to `audit_log` table |
| **Secret masking** | Keys/tokens never returned in plain text |
| **Input sanitization** | Zod validation on all request bodies |
| **CORS hardening** | Only `FRONTEND_URL` origin allowed |
| **Auth** | API key or JWT on all `/api/*` routes |

### Governance Zones

| Zone | Routes | Auth | Rate Limit |
|------|--------|------|-----------|
| Public | `/health` | None | Global |
| API | `/api/*` | Key or JWT | 100/15min |
| Admin | `/api/keys/export` | Admin role | 10/15min |

### Secret Handling

- All harvested secrets are **masked on storage and retrieval**: `sk-****...****`
- Raw secret values are never written to logs or databases
- The `keyHarvester` service stores only: type, masked value, source URL, confidence score
- Export endpoint requires admin role and generates an audit log entry

### Dependency Security

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (with review)
npm audit fix

# Backend
cd backend && npm audit

# Frontend
cd frontend && npm audit
```

---

## 13. Troubleshooting

### Backend Won't Start

```bash
# Check Node version
node --version  # must be >= 20

# Check env vars
cat .env | grep -E "DATABASE_URL|REDIS_URL|PORT"

# Start dependencies first
docker compose up postgres redis

# Then backend directly
cd backend && npm run dev
```

### LLM Not Responding

```bash
# Check Groq API key
curl -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/openai/v1/models

# Check Ollama is running
docker compose ps ollama
docker compose exec ollama ollama list

# Test LLM endpoint directly
curl -X POST $LLM_API_URL/chat/completions \
  -H "Authorization: Bearer $LLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"hi"}]}'
```

### Playwright Tests Failing

```bash
# Check services are running
curl http://localhost:3001/health
curl http://localhost:3000

# Run with verbose output
DEBUG=pw:browser npx playwright test

# Check screenshots for visual debugging
ls tests/e2e/screenshots/

# Run with headed browser
npx playwright test --headed
```

### Railway Deploy Failing

```bash
# Check token
railway whoami

# Check project link
railway status

# View deployment logs
railway logs --service backend

# Re-deploy manually
railway up --service backend --detach
```

### Templates Not Found

```bash
# Re-run setup
bash scripts/setup-integration.sh

# Check templates directory
ls templates/

# Check network connectivity to GitHub
curl -I https://github.com/mendableai/firecrawl
```

---

## Developer Hand-off Checklist

Before handing off to another developer:

- [ ] `.env` file created and all required secrets filled in
- [ ] `bash scripts/setup-integration.sh` completed successfully
- [ ] `docker compose up --build` starts all services without errors
- [ ] `npm run test:e2e` passes (or known failures documented)
- [ ] Railway project linked (`railway link`)
- [ ] All GitHub App secrets set in repository settings
- [ ] `openapi/gpt-actions.json` imported into ChatGPT custom GPT
- [ ] `docs/INTEGRATION.md` read and understood

---

*Generated by XPS Shadow Scraper Integration Stack v1.0.0*  
*© InfinityXOneSystems — MIT License*

# GitHub Copilot Instructions — XPS Shadow Scraper Integration Stack

> **Protocol:** 110% — Zero Tech Debt, TAP Policy, Quantum Standard  
> **App:** XPS GitHub App (global read/write/admin scope)  
> **Stack:** TypeScript-first, event-driven, cloud-native

---

## 1. Repository Overview

This repository is the **XPS Shadow Scraper** — an AI-augmented, full-stack web intelligence system.
It integrates the following open-source template stacks:

| Template | Role | Local Path |
|---|---|---|
| [firecrawl/firecrawl](https://github.com/mendableai/firecrawl) | Web crawling engine + MCP agent mesh | `templates/firecrawl/` |
| [firecrawl-mcp](https://github.com/mendableai/mcp-server-firecrawl) | MCP server for Firecrawl | `templates/firecrawl-mcp/` |
| [open-lovable](https://github.com/mendableai/open-lovable) | Agent builder UI | `templates/open-lovable/` |
| [open-agent-builder](https://github.com/mendableai/open-agent-builder) | Agent composition logic | `templates/open-agent-builder/` |
| [open-claw](https://github.com/mendableai/open-claw) | Asset extraction/enrichment | `templates/open-claw/` |
| [open-deep-research](https://github.com/mendableai/open-deep-research) | LLM fact extraction | `templates/open-deep-research/` |
| InfinityXOneSystems/Xps-scraper | Core AI scraper + key harvester | `./` (this repo) |

---

## 2. First-Time Setup (Copilot / Developer Onboarding)

```bash
# 1. Clone all templates and wire the full stack
bash scripts/setup-integration.sh

# 2. Copy and fill env vars
cp .env.example .env
# Edit .env: fill GROQ_API_KEY, FIRECRAWL_API_KEY, GITHUB_APP_* secrets, etc.

# 3. Start the full stack (Docker Compose)
bash scripts/start-stack.sh

# 4. Run E2E tests
npm run test:e2e
```

---

## 3. Architecture & Service Map

```
                        ┌─────────────────────────────────────────────┐
                        │          Railway Cloud (Production)          │
                        └─────────────────────────────────────────────┘
       ┌──────────┬──────────┬─────────────────┬─────────────────────┐
       ▼          ▼          ▼                 ▼                     ▼
[XPS Backend]  [Firecrawl] [Open Claw]   [Deep Research]   [Open Lovable UI]
 :3001          :3002       :3003          :3004              :3000
    └─────────────────┬─────────────────────┘
                      ▼
           [Orchestrator API :3001/api/orchestrator]
                      ▼
           ┌──────────────────────┐
           │   Postgres :5432     │  ← entities, keys, events, pgvector
           │   Redis    :6379     │  ← queues, locks, rate limits
           └──────────────────────┘
                      ▼
           [LLM: Groq Cloud | Ollama Cloud]
```

### Port Reference

| Service | Port | URL |
|---|---|---|
| Frontend (React) | 3000 | http://localhost:3000 |
| Backend (XPS API) | 3001 | http://localhost:3001 |
| Firecrawl (self-hosted) | 3002 | http://localhost:3002 |
| Open Claw | 3003 | http://localhost:3003 |
| Deep Research | 3004 | http://localhost:3004 |
| n8n | 5678 | http://localhost:5678 |
| Ollama LLM | 11434 | http://localhost:11434 |
| Postgres | 5432 | postgresql://xps:xpspassword@localhost:5432/xps_scraper |
| Redis | 6379 | redis://localhost:6379 |

---

## 4. Coding Standards & Conventions

### TypeScript-First
- All new code must be TypeScript (strict mode)
- Use Zod for request validation
- Prefer `interface` over `type` for objects; `type` for unions/aliases
- Always export named types alongside route/service implementations

### API Design
- RESTful endpoints: `GET /api/<resource>`, `POST /api/<resource>`, etc.
- All endpoints protected by `authMiddleware` (except `/health`)
- Validate request bodies with Zod schemas before processing
- Return `{ error, message }` on failure; `{ data, meta }` on success
- Include `X-Request-Id` header in all responses

### Error Handling
- Never expose stack traces in production responses
- Log errors with `console.error('[service]', err.message, err.stack)`
- Use HTTP status codes correctly (400 validation, 401 auth, 404 not found, 500 internal)

### Security (TAP Protocol)
- **Secret masking:** Never log or return raw secret values; always mask with `****`
- **Rate limiting:** All write endpoints rate-limited via Redis
- **Audit trail:** All key-harvest and export operations logged to `audit_log` table
- **Input sanitization:** Validate all URLs, reject non-http(s) schemes
- **CORS:** Only allow `FRONTEND_URL` origin
- **Auth:** API key (`X-API-Key`) or JWT (`Authorization: Bearer`) required in production

### Database
- Use `pg` (node-postgres) with parameterized queries — never string interpolation
- Migrations in `db/migrations/` — use sequential timestamps (`001_`, `002_`, etc.)
- Always `UPSERT` / idempotent writes where possible

### Event-Driven Design
- Publish events to Redis pub/sub for cross-service communication
- Event schema: `{ event: string, payload: unknown, timestamp: string, traceId: string }`
- Subscribe in services that need to react to other services' events

---

## 5. Service Integration Patterns

### Adding a New Agent/Template

1. Clone the template into `templates/<name>/`
2. Add a service adapter in `backend/src/services/<name>Adapter.ts`
3. Add API route in `backend/src/routes/<name>.ts` 
4. Register route in `backend/src/routes/index.ts`
5. Add to `docker-compose.full-stack.yml`
6. Add env vars to `.env.example`
7. Add E2E test coverage in `tests/e2e/`

### Orchestrator Workflow Pattern

All multi-step operations use the orchestrator pattern:
```
POST /api/orchestrator/run
{
  "name": "full-pipeline",
  "nodes": [
    { "type": "crawl",    "config": { "url": "..." } },
    { "type": "scrape",   "config": { "selectors": [...] } },
    { "type": "harvest",  "config": { "extractKeys": true } },
    { "type": "research", "config": { "query": "..." } },
    { "type": "export",   "config": { "format": "json" } }
  ]
}
```

---

## 6. LLM Configuration

Switch LLM provider via environment:

| Provider | `LLM_API_URL` | `LLM_API_KEY` | `LLM_MODEL` |
|---|---|---|---|
| Groq Cloud | `https://api.groq.com/openai/v1` | `GROQ_API_KEY` | `llama-3.3-70b-versatile` |
| Ollama (local) | `http://ollama:11434/v1` | `ollama` | `llama3.2` |
| OpenAI | `https://api.openai.com/v1` | `OPENAI_API_KEY` | `gpt-4o-mini` |

---

## 7. CI/CD (GitHub Actions)

### Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy.yml` | Push to `main` | Test + build + deploy to Railway |
| `integration.yml` | Push to any branch / PR | Clone templates, full-stack E2E with Playwright |
| `sync-env.yml` | Daily 02:00 UTC | Sync env vars from XPS repos → Railway |
| `scraper.yml` | Daily 06:00 UTC | Live scraper run, upload artifacts |

### XPS GitHub App

The XPS GitHub App provides global read/write/admin access for orchestration:
- Set `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` as repository secrets
- The app authenticates CI operations, manages deployments, and syncs environments
- Used in `integration.yml` for cloning private templates and Railway CLI operations

---

## 8. Playwright E2E Tests

Tests live in `tests/e2e/`. Run with:
```bash
npm run test:e2e          # run all E2E tests
npm run test:e2e -- --ui  # interactive mode
```

Test categories:
- `dashboard.spec.ts` — Dashboard health and metrics
- `integration.spec.ts` — Full workflow: crawl → scrape → harvest → enrich → export → chat

**Screenshot convention:** Save to `tests/e2e/screenshots/<test-name>.png`

---

## 9. OpenAI GPT Actions

The full OpenAPI/GPT Actions schema is at `openapi/gpt-actions.json`.
All agent operations (crawl, scrape, harvest, enrich, export) are callable by LLMs with function-calling.

Import in ChatGPT:
1. Go to **My GPTs → Create → Configure → Actions**
2. Import schema from `openapi/gpt-actions.json`
3. Set authentication: API Key → Header `X-API-Key`
4. Set server URL: `https://your-backend.railway.app`

---

## 10. Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up --service backend
railway up --service frontend

# Add infrastructure
railway add --plugin postgresql
railway add --plugin redis

# View logs
railway logs --service backend
```

---

## 11. Docker Compose Quick Reference

```bash
# Full stack (all services including templates)
docker compose -f docker-compose.full-stack.yml up --build

# Core stack only (backend + frontend + DB + cache)
docker compose up --build

# Tear down
docker compose down -v
```

---

## 12. Security Governance Zones

| Zone | Scope | Controls |
|---|---|---|
| **Public** | `/health`, static assets | No auth, rate limited |
| **API** | `/api/*` | API key or JWT required |
| **Admin** | `/api/keys/export`, `/api/orchestrator/*` | Admin role + audit log |
| **Internal** | Inter-service calls | mTLS or shared secret |

---

## 13. Dependency Management

- Check for vulnerabilities: `npm audit`
- Update dependencies: `npm update`
- All new dependencies must be vetted for CVEs before addition
- Production dependencies: keep minimal; prefer built-in Node.js APIs
- No dependencies with LGPL/GPL licenses without legal review

---

## 14. Troubleshooting

| Problem | Solution |
|---|---|
| Backend not starting | Check `DATABASE_URL` and `REDIS_URL` are set; run `docker compose up postgres redis` first |
| LLM not responding | Verify `LLM_API_URL` and `LLM_API_KEY`; check Ollama is running with `ollama list` |
| Playwright tests failing | Ensure backend is running on :3001 and frontend on :3000 |
| Railway deploy failing | Check `RAILWAY_TOKEN` secret; run `railway status` to debug |
| Template not found | Run `bash scripts/setup-integration.sh` to clone all templates |

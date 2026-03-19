-- XPS Shadow Scraper — Database Initialization
-- Auto-runs when Postgres container starts for the first time.
-- Production migrations are managed separately in db/migrations/.

-- Enable pgvector extension (for semantic search / embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Audit log (append-only) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event       TEXT NOT NULL,
    actor       TEXT,
    resource    TEXT,
    details     JSONB,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce append-only via trigger (rules can be bypassed by superusers)
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS tg_audit_log_no_update ON audit_log;
CREATE TRIGGER tg_audit_log_no_update
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- ─── Crawl jobs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url           TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    pages_found   INTEGER DEFAULT 0,
    config        JSONB DEFAULT '{}',
    result        JSONB,
    error         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);

-- ─── Scraped pages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scraped_pages (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crawl_job_id UUID REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    title        TEXT,
    content      TEXT,
    links        JSONB DEFAULT '[]',
    meta         JSONB DEFAULT '{}',
    scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Harvested keys ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS harvested_keys (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type          TEXT NOT NULL,
    value_masked  TEXT NOT NULL,
    source_url    TEXT,
    confidence    REAL DEFAULT 1.0,
    metadata      JSONB DEFAULT '{}',
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Agent conversations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_conversations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    messages     JSONB NOT NULL DEFAULT '[]',
    model        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Workflow runs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_runs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id    TEXT,
    workflow_name  TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    nodes          JSONB DEFAULT '[]',
    log            JSONB DEFAULT '[]',
    output         JSONB,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scraped_pages_crawl_job ON scraped_pages(crawl_job_id);
CREATE INDEX IF NOT EXISTS idx_harvested_keys_type ON harvested_keys(type);
CREATE INDEX IF NOT EXISTS idx_harvested_keys_discovered ON harvested_keys(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

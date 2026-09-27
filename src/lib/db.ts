import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null
let schemaPromise: Promise<void> | null = null

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  sqlClient ??= neon(process.env.DATABASE_URL)
  return sqlClient
}

export async function ensureSchema() {
  if (schemaPromise) return schemaPromise
  const sql = getSql()
  schemaPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS heaven_integrations (
        org_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_name TEXT,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (org_id, provider, account_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS heaven_repositories (
        org_id TEXT NOT NULL,
        github_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        private BOOLEAN NOT NULL DEFAULT FALSE,
        html_url TEXT NOT NULL,
        default_branch TEXT,
        pushed_at TIMESTAMPTZ,
        description TEXT,
        owner_login TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (org_id, github_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS heaven_meetings (
        id UUID PRIMARY KEY,
        org_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        external_id TEXT,
        title TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        join_url TEXT,
        host_url TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS heaven_repositories_org_idx ON heaven_repositories(org_id)`
    await sql`CREATE INDEX IF NOT EXISTS heaven_meetings_org_idx ON heaven_meetings(org_id, scheduled_at DESC)`
  })()
  return schemaPromise
}

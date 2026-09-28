import { getSql, ensureSchema } from './db'
import { decryptText, encryptText } from './crypto'

export async function saveIntegration(input: {
  orgId: string
  provider: string
  accountId: string
  accountName?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date | null
  metadata?: Record<string, unknown>
}) {
  await ensureSchema()
  const sql = getSql()
  await sql`
    INSERT INTO heaven_integrations
      (org_id, provider, account_id, account_name, access_token, refresh_token, expires_at, metadata)
    VALUES
      (
        ${input.orgId},
        ${input.provider},
        ${input.accountId},
        ${input.accountName ?? null},
        ${input.accessToken ? encryptText(input.accessToken) : null},
        ${input.refreshToken ? encryptText(input.refreshToken) : null},
        ${input.expiresAt ?? null},
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
    ON CONFLICT (org_id, provider, account_id)
    DO UPDATE SET
      account_name = EXCLUDED.account_name,
      access_token = COALESCE(EXCLUDED.access_token, heaven_integrations.access_token),
      refresh_token = COALESCE(EXCLUDED.refresh_token, heaven_integrations.refresh_token),
      expires_at = EXCLUDED.expires_at,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `
}

export async function getIntegration(orgId: string, provider: string) {
  await ensureSchema()
  const sql = getSql()
  const rows = (await sql`
    SELECT org_id, provider, account_id, account_name, access_token, refresh_token, expires_at, metadata
    FROM heaven_integrations
    WHERE org_id = ${orgId} AND provider = ${provider}
    ORDER BY updated_at DESC
    LIMIT 1
  `) as unknown as Array<{
    org_id: string
    provider: string
    account_id: string
    account_name: string | null
    access_token: string | null
    refresh_token: string | null
    expires_at: string | Date | null
    metadata: Record<string, unknown> | null
  }>
  const row = rows[0]
  if (!row) return null

  return {
    ...row,
    accountId: String(row.account_id),
    accountName: row.account_name ? String(row.account_name) : null,
    accessToken: row.access_token ? decryptText(String(row.access_token)) : null,
    refreshToken: row.refresh_token ? decryptText(String(row.refresh_token)) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }
}

export async function listIntegrations(orgId: string) {
  await ensureSchema()
  const sql = getSql()
  const rows = (await sql`
    SELECT provider, account_id, account_name, expires_at, metadata, updated_at
    FROM heaven_integrations
    WHERE org_id = ${orgId}
    ORDER BY provider ASC, updated_at DESC
  `) as unknown as Array<{
    provider: string
    account_id: string
    account_name: string | null
    expires_at: string | Date | null
    metadata: Record<string, unknown>
    updated_at: string | Date
  }>
  return rows
}

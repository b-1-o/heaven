import { getSql, ensureSchema } from './db'
import { decryptText, encryptText } from './crypto'
import { githubRepos, githubUser, type GithubRepo } from './github'

export async function saveGithubConnection(
  orgId: string,
  token: { access_token: string; refresh_token?: string; expires_in?: number },
) {
  await ensureSchema()
  const sql = getSql()
  const user = await githubUser(token.access_token)
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null

  await sql`
    INSERT INTO heaven_integrations
      (org_id, provider, account_id, account_name, access_token, refresh_token, expires_at)
    VALUES
      (${orgId}, 'github', ${String(user.id)}, ${user.login}, ${encryptText(token.access_token)}, ${token.refresh_token ? encryptText(token.refresh_token) : null}, ${expiresAt})
    ON CONFLICT (org_id, provider, account_id)
    DO UPDATE SET
      account_name = EXCLUDED.account_name,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `

  return user
}

export async function githubTokenForWorkspace(orgId: string) {
  await ensureSchema()
  const sql = getSql()
  const rows = await sql`
    SELECT access_token, refresh_token, expires_at, account_id, account_name
    FROM heaven_integrations
    WHERE org_id = ${orgId} AND provider = 'github'
    ORDER BY updated_at DESC
    LIMIT 1
  `
  if (!rows[0]?.access_token) return null
  return {
    accessToken: decryptText(rows[0].access_token as string),
    refreshToken: rows[0].refresh_token ? decryptText(rows[0].refresh_token as string) : null,
    accountId: String(rows[0].account_id),
    accountName: String(rows[0].account_name ?? ''),
    expiresAt: rows[0].expires_at ? new Date(String(rows[0].expires_at)) : null,
  }
}

async function ensureRepositoryWebhook(
  token: string,
  repo: GithubRepo,
  webhookUrl: string,
) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) return

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2026-03-10',
  }

  const existingResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/hooks?per_page=100`,
    { headers, cache: 'no-store' },
  )
  if (!existingResponse.ok) return

  const existing = await existingResponse.json() as Array<{ config?: { url?: string }; active?: boolean }>
  if (existing.some((hook) => hook.active && hook.config?.url === webhookUrl)) return

  await fetch(
    `https://api.github.com/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/hooks`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'workflow_run', 'deployment_status', 'issues', 'issue_comment'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0',
        },
      }),
      cache: 'no-store',
    },
  )
}

export async function syncGithubRepos(orgId: string, webhookUrl?: string) {
  const connection = await githubTokenForWorkspace(orgId)
  if (!connection) return []

  const repos = await githubRepos(connection.accessToken)
  const sql = getSql()

  for (const repo of repos) {
    await sql`
      INSERT INTO heaven_repositories
        (org_id, github_id, name, full_name, private, html_url, default_branch, pushed_at, description, owner_login, updated_at)
      VALUES
        (${orgId}, ${repo.id}, ${repo.name}, ${repo.full_name}, ${repo.private}, ${repo.html_url}, ${repo.default_branch}, ${repo.pushed_at ? new Date(repo.pushed_at) : null}, ${repo.description}, ${repo.owner.login}, NOW())
      ON CONFLICT (org_id, github_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        private = EXCLUDED.private,
        html_url = EXCLUDED.html_url,
        default_branch = EXCLUDED.default_branch,
        pushed_at = EXCLUDED.pushed_at,
        description = EXCLUDED.description,
        owner_login = EXCLUDED.owner_login,
        updated_at = NOW()
    `
    if (webhookUrl) {
      try {
        await ensureRepositoryWebhook(connection.accessToken, repo, webhookUrl)
      } catch {
        // Webhook provisioning is best-effort; repository sync must still succeed.
      }
    }
  }

  return repos as GithubRepo[]
}

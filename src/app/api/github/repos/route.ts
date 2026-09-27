import { NextResponse } from 'next/server'
import { getSql, ensureSchema } from '@/lib/db'
import { githubTokenForWorkspace, syncGithubRepos } from '@/lib/github-connection'
import { getWorkspaceId } from '@/lib/workspace'

export async function GET(request: Request) {
  const orgId = await getWorkspaceId()
  const url = new URL(request.url)
  const sync = url.searchParams.get('sync') === '1'

  try {
    await ensureSchema()
    const connection = await githubTokenForWorkspace(orgId)
    if (!connection) return NextResponse.json({ connected: false, repositories: [] })

    if (sync) await syncGithubRepos(orgId)

    const sql = getSql()
    const rows = await sql`
      SELECT github_id, name, full_name, private, html_url, default_branch, pushed_at, description, owner_login
      FROM heaven_repositories
      WHERE org_id = ${orgId}
      ORDER BY pushed_at DESC NULLS LAST, name ASC
    `

    return NextResponse.json({
      connected: true,
      account: { id: connection.accountId, login: connection.accountName },
      repositories: rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load repositories'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

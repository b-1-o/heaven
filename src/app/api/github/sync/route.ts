import { NextResponse } from 'next/server'
import { syncGithubRepos, githubTokenForWorkspace } from '../../../lib/github-connection'
import { getWorkspaceId } from '../../../lib/workspace'

export async function POST() {
  try {
    const orgId = await getWorkspaceId()
    const connection = await githubTokenForWorkspace(orgId)
    if (!connection) return NextResponse.json({ connected: false }, { status: 409 })

    const repos = await syncGithubRepos(orgId)
    return NextResponse.json({ connected: true, count: repos.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

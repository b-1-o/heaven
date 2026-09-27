import { NextResponse } from 'next/server'
import { githubCommits } from '@/lib/github'
import { githubTokenForWorkspace } from '@/lib/github-connection'
import { getWorkspaceId } from '@/lib/workspace'

export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await context.params
    const connection = await githubTokenForWorkspace(await getWorkspaceId())
    if (!connection) return NextResponse.json({ error: 'GitHub is not connected' }, { status: 409 })

    const commits = await githubCommits(connection.accessToken, owner, repo)
    return NextResponse.json({ commits })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load commits'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

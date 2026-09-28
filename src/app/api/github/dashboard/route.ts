import { NextResponse } from 'next/server'
import {
  githubCommits,
  githubDeployments,
  githubPullRequests,
  githubRepos,
  githubUser,
  githubWorkflowRuns,
  type GithubCommit,
  type GithubDeployment,
  type GithubPullRequest,
  type GithubRepo,
  type GithubWorkflowRun,
} from '@/lib/github'
import { githubTokenForWorkspace } from '@/lib/github-connection'
import { getWorkspaceId } from '@/lib/workspace'

type Snapshot = {
  repo: GithubRepo
  commits: GithubCommit[]
  pullRequests: GithubPullRequest[]
  workflowRuns: GithubWorkflowRun[]
  deployments: GithubDeployment[]
}

export async function GET() {
  try {
    const connection = await githubTokenForWorkspace(await getWorkspaceId())
    if (!connection) return NextResponse.json({ connected: false })

    const token = connection.accessToken
    const account = await githubUser(token)
    const repositories = await githubRepos(token)
    const tracked = repositories
      .slice()
      .sort((a, b) => Date.parse(b.pushed_at ?? '') - Date.parse(a.pushed_at ?? ''))
      .slice(0, 6)

    const snapshots = await Promise.all(
      tracked.map(async (repo): Promise<Snapshot> => {
        const [commits, pullRequests, workflowRuns, deployments] = await Promise.allSettled([
          githubCommits(token, repo.owner.login, repo.name),
          githubPullRequests(token, repo.owner.login, repo.name),
          githubWorkflowRuns(token, repo.owner.login, repo.name),
          githubDeployments(token, repo.owner.login, repo.name),
        ])

        return {
          repo,
          commits: commits.status === 'fulfilled' ? commits.value.slice(0, 10) : [],
          pullRequests: pullRequests.status === 'fulfilled' ? pullRequests.value : [],
          workflowRuns: workflowRuns.status === 'fulfilled' ? workflowRuns.value.workflow_runs : [],
          deployments: deployments.status === 'fulfilled' ? deployments.value : [],
        }
      }),
    )

    const recentActivity = snapshots.flatMap((snapshot) => {
      const repo = snapshot.repo.full_name
      const commits = snapshot.commits.map((commit) => ({
        id: `commit:${repo}:${commit.sha}`,
        type: 'commit' as const,
        title: commit.commit.message.split('\n')[0],
        meta: `${repo} · ${commit.author?.login ?? commit.commit.author?.name ?? 'GitHub'}`,
        timestamp: commit.commit.author?.date ?? snapshot.repo.pushed_at ?? '',
        url: commit.html_url,
      }))
      const pulls = snapshot.pullRequests.map((pull) => ({
        id: `pull:${repo}:${pull.id}`,
        type: 'pull_request' as const,
        title: `#${pull.number} ${pull.title}`,
        meta: `${repo} · ${pull.state} · ${pull.user.login}`,
        timestamp: pull.updated_at,
        url: pull.html_url,
      }))
      const workflows = snapshot.workflowRuns.map((run) => ({
        id: `workflow:${repo}:${run.id}`,
        type: 'workflow' as const,
        title: `${run.name} · ${run.conclusion ?? run.status}`,
        meta: `${repo} · ${run.head_branch}`,
        timestamp: run.updated_at,
        url: run.html_url,
      }))
      const deployments = snapshot.deployments.map((deployment) => ({
        id: `deployment:${repo}:${deployment.id}`,
        type: 'deployment' as const,
        title: `Deployment · ${deployment.environment ?? deployment.ref}`,
        meta: `${repo} · ${deployment.creator?.login ?? 'GitHub'}`,
        timestamp: deployment.updated_at,
        url: `https://github.com/${repo}/deployments`,
      }))
      return [...commits, ...pulls, ...workflows, ...deployments]
    })
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 60)

    const workflows = snapshots
      .flatMap((snapshot) => snapshot.workflowRuns.map((run) => ({ ...run, repositoryFullName: snapshot.repo.full_name })))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .slice(0, 30)

    const deployments = snapshots
      .flatMap((snapshot) => snapshot.deployments.map((deployment) => ({ ...deployment, repositoryFullName: snapshot.repo.full_name })))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .slice(0, 30)

    const pullRequests = snapshots
      .flatMap((snapshot) => snapshot.pullRequests.map((pull) => ({ ...pull, repositoryFullName: snapshot.repo.full_name })))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .slice(0, 30)

    const commits = snapshots
      .flatMap((snapshot) => snapshot.commits.map((commit) => ({ ...commit, repositoryFullName: snapshot.repo.full_name })))
      .sort((a, b) => Date.parse(b.commit.author?.date ?? '') - Date.parse(a.commit.author?.date ?? ''))
      .slice(0, 30)

    return NextResponse.json({
      connected: true,
      account,
      repositories,
      recentActivity,
      workflows,
      deployments,
      pullRequests,
      commits,
      stats: {
        repositories: repositories.length,
        privateRepositories: repositories.filter((repo) => repo.private).length,
        commits: commits.length,
        openPullRequests: pullRequests.filter((pull) => pull.state === 'open').length,
        failedWorkflows: workflows.filter((run) => ['failure', 'cancelled', 'timed_out', 'action_required'].includes(run.conclusion ?? '')).length,
        deployments: deployments.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load GitHub dashboard'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const apiBase = 'https://api.github.com'

async function githubFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`GitHub API ${response.status}: ${message.slice(0, 300)}`)
  }

  return response.json() as Promise<T>
}

export type GithubUser = {
  id: number
  login: string
  avatar_url: string
  html_url: string
}

export type GithubRepo = {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  pushed_at: string | null
  description: string | null
  owner: { login: string }
}

export type GithubCommit = {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { name: string | null; date: string | null }
  }
  author: { login: string; avatar_url: string } | null
}

export async function githubUser(token: string) {
  return githubFetch<GithubUser>(token, '/user')
}

export async function githubRepos(token: string) {
  return githubFetch<GithubRepo[]>(token, '/user/repos?per_page=100&sort=pushed&direction=desc')
}

export async function githubCommits(token: string, owner: string, repo: string) {
  return githubFetch<GithubCommit[]>(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=20`)
}

export async function exchangeGithubCode(code: string) {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('GitHub OAuth is not configured')

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error('GitHub token exchange failed')
  return response.json() as Promise<{
    access_token?: string
    token_type?: string
    scope?: string
    refresh_token?: string
    expires_in?: number
    refresh_token_expires_in?: number
    error?: string
    error_description?: string
  }>
}

export type GithubPullRequest = {
  id: number
  number: number
  title: string
  html_url: string
  state: 'open' | 'closed'
  draft?: boolean | null
  created_at: string
  updated_at: string
  merged_at?: string | null
  user: { login: string; avatar_url: string }
  head: { ref: string }
  base: { ref: string }
}

export type GithubWorkflowRun = {
  id: number
  name: string
  display_title: string
  html_url: string
  status: string
  conclusion: string | null
  event: string
  head_branch: string
  head_sha: string
  created_at: string
  updated_at: string
  run_started_at?: string | null
  repository?: { full_name: string }
}

export type GithubDeployment = {
  id: number
  sha: string
  ref: string
  environment?: string | null
  description?: string | null
  created_at: string
  updated_at: string
  creator?: { login: string; avatar_url: string }
  repository_url?: string
}

export async function githubPullRequests(token: string, owner: string, repo: string) {
  return githubFetch<GithubPullRequest[]>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&sort=updated&direction=desc&per_page=10`,
  )
}

export async function githubWorkflowRuns(token: string, owner: string, repo: string) {
  return githubFetch<{ total_count: number; workflow_runs: GithubWorkflowRun[] }>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=10`,
  )
}

export async function githubDeployments(token: string, owner: string, repo: string) {
  return githubFetch<GithubDeployment[]>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/deployments?per_page=10`,
  )
}

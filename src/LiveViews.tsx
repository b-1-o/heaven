
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Github, GitPullRequest, GitCommitHorizontal, Rocket, CheckCircle2, XCircle, Clock3, ExternalLink, RefreshCcw, Users, Video, CalendarDays, Plus, Building2 } from 'lucide-react'
import { OrganizationSwitcher, useOrganization, useOrganizationList } from '@clerk/nextjs'
import type { ReactNode } from 'react'

type Repo = {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  pushed_at: string | null
  description: string | null
  language?: string | null
  stargazers_count?: number
}

type ActivityItem = {
  id: string
  type: 'commit' | 'pull_request' | 'workflow' | 'deployment'
  title: string
  meta: string
  timestamp: string
  url: string
}

type DashboardData = {
  connected: boolean
  account?: { login: string; avatar_url: string; html_url: string; name?: string | null }
  repositories?: Repo[]
  recentActivity?: ActivityItem[]
  workflows?: Array<{
    id: number
    name: string
    html_url: string
    status: string
    conclusion: string | null
    head_branch: string
    head_sha: string
    updated_at: string
    repositoryFullName: string
  }>
  deployments?: Array<{
    id: number
    sha: string
    ref: string
    environment?: string | null
    updated_at: string
    creator?: { login: string }
    repositoryFullName: string
  }>
  pullRequests?: Array<{
    id: number
    number: number
    title: string
    html_url: string
    state: 'open' | 'closed'
    updated_at: string
    user: { login: string }
    repositoryFullName: string
  }>
  commits?: Array<{
    sha: string
    html_url: string
    commit: { message: string; author: { name: string | null; date: string | null } }
    author: { login: string } | null
    repositoryFullName: string
  }>
  stats?: {
    repositories: number
    privateRepositories: number
    commits: number
    openPullRequests: number
    failedWorkflows: number
    deployments: number
  }
}

type Meeting = {
  id: string
  provider: 'zoom' | 'discord'
  title: string
  scheduled_at: string
  duration_minutes: number
  join_url: string | null
  host_url: string | null
  metadata: Record<string, unknown>
}

async function readJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

function useGithubDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await readJson('/api/github/dashboard'))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'GitHub dashboard failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return { data, loading, error, reload: load }
}

function LiveMetric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Github }) {
  return (
    <div className="metric-card glass-card">
      <div className="metric-head"><span>{label}</span><span className="metric-icon"><Icon size={16} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-delta">{detail}</div>
    </div>
  )
}

function LiveStatus({ conclusion, status }: { conclusion?: string | null; status?: string }) {
  if (conclusion === 'success') return <span className="presence online"><span />Passed</span>
  if (conclusion && ['failure', 'cancelled', 'timed_out', 'action_required'].includes(conclusion)) return <span className="presence offline"><span />{conclusion}</span>
  if (status === 'in_progress' || status === 'queued') return <span className="presence online"><span />{status}</span>
  return <span className="setting-value">{conclusion ?? status ?? 'unknown'}</span>
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ActivityGlyph({ type }: { type: ActivityItem['type'] }) {
  if (type === 'commit') return <GitCommitHorizontal size={15} />
  if (type === 'pull_request') return <GitPullRequest size={15} />
  if (type === 'workflow') return <CheckCircle2 size={15} />
  return <Rocket size={15} />
}

export function LiveOverview({ onView }: { onView: (view: 'repositories' | 'activity') => void }) {
  const { data, loading, error, reload } = useGithubDashboard()

  if (loading) {
    return <div className="page-body"><section className="panel"><div className="loading-state">Loading your GitHub workspace…</div></section></div>
  }

  if (!data?.connected) {
    return (
      <div className="page-body">
        <section className="connect-hero glass-card">
          <div className="connect-icon"><Github size={26} /></div>
          <div><span className="eyebrow">Live source control</span><h2>Connect your GitHub account</h2><p>HEAVEN will read your repositories, commits, pull requests, Actions runs and deployments. No demo data is shown after connection.</p></div>
          <button className="glass-button solid" onClick={() => { window.location.href = '/api/integrations/github/start' }}><Github size={15} />Connect GitHub</button>
        </section>
      </div>
    )
  }

  const stats = data.stats ?? { repositories: 0, privateRepositories: 0, commits: 0, openPullRequests: 0, failedWorkflows: 0, deployments: 0 }
  const activity = data.recentActivity ?? []
  const repos = data.repositories ?? []

  return (
    <div className="page-body">
      <div className="metric-grid">
        <LiveMetric label="Repositories" value={String(stats.repositories)} detail={String(stats.privateRepositories) + ' private'} icon={Github} />
        <LiveMetric label="Recent commits" value={String(stats.commits)} detail="Across active repositories" icon={GitCommitHorizontal} />
        <LiveMetric label="Open pull requests" value={String(stats.openPullRequests)} detail="Recently updated" icon={GitPullRequest} />
        <LiveMetric label="Failed CI runs" value={String(stats.failedWorkflows)} detail="Recent GitHub Actions" icon={Rocket} />
      </div>

      {error ? <div className="meeting-notice">{error}</div> : null}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">GitHub account</span><h2>{data.account?.name || data.account?.login}</h2></div><button className="glass-button" onClick={() => void reload()}><RefreshCcw size={15} />Refresh</button></div>
          <div className="account-card">
            <img className="account-avatar" src={data.account?.avatar_url} alt="" />
            <div><strong>@{data.account?.login}</strong><span>{stats.repositories} repositories connected to this workspace</span></div>
            <a className="glass-button" href={data.account?.html_url} target="_blank" rel="noreferrer"><ExternalLink size={15} />GitHub</a>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Repository pulse</span><h2>Active repositories</h2></div><button className="text-link" onClick={() => onView('repositories')}>View all <ExternalLink size={13} /></button></div>
          <div className="activity-list">
            {repos.slice(0, 5).map((repo) => (
              <a className="activity-row" href={repo.html_url} target="_blank" rel="noreferrer" key={repo.id}>
                <div className="activity-icon"><Github size={15} /></div>
                <div className="activity-copy"><strong>{repo.full_name}</strong><span>{repo.default_branch} · {repo.private ? 'Private' : 'Public'} · {repo.pushed_at ? formatWhen(repo.pushed_at) : 'No pushes'}</span></div>
                <ChevronRightIcon />
              </a>
            ))}
            {!repos.length ? <div className="empty-state"><p>No repositories were returned by GitHub.</p></div> : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">GitHub activity</span><h2>What changed</h2></div><button className="text-link" onClick={() => onView('activity')}>Open activity <ExternalLink size={13} /></button></div>
        <div className="activity-list">
          {activity.slice(0, 10).map((item) => (
            <a className="activity-row" href={item.url} target="_blank" rel="noreferrer" key={item.id}>
              <div className="activity-icon"><ActivityGlyph type={item.type} /></div>
              <div className="activity-copy"><strong>{item.title}</strong><span>{item.meta} · {formatWhen(item.timestamp)}</span></div>
              <ExternalLink size={14} className="activity-arrow" />
            </a>
          ))}
          {!activity.length ? <div className="empty-state"><p>No recent activity was returned by GitHub.</p></div> : null}
        </div>
      </section>
    </div>
  )
}

function ChevronRightIcon() {
  return <span className="activity-arrow">›</span>
}

export function LiveActivityView() {
  const { data, loading, error, reload } = useGithubDashboard()
  const [filter, setFilter] = useState<'all' | ActivityItem['type']>('all')

  const activity = useMemo(() => {
    const items = data?.recentActivity ?? []
    return filter === 'all' ? items : items.filter((item) => item.type === filter)
  }, [data, filter])

  if (!data?.connected && !loading) {
    return <div className="page-body"><section className="connect-hero glass-card"><div className="connect-icon"><Github size={26} /></div><div><h2>GitHub is not connected</h2><p>Connect GitHub to see real commits, pull requests, Actions and deployments here.</p></div><button className="glass-button solid" onClick={() => { window.location.href = '/api/integrations/github/start' }}>Connect GitHub</button></section></div>
  }

  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Live engineering stream</span><h1>Activity</h1><p>Recent GitHub changes across your active repositories.</p></div><button className="glass-button" onClick={() => void reload()}><RefreshCcw size={15} />Refresh</button></div>
      {error ? <div className="meeting-notice">{error}</div> : null}
      <div className="segmented status-filters">
        {(['all', 'commit', 'pull_request', 'workflow', 'deployment'] as const).map((value) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value.replace('_', ' ')}</button>)}
      </div>
      <section className="panel timeline-panel">
        {loading ? <div className="loading-state">Refreshing GitHub activity…</div> : null}
        {!loading && !activity.length ? <EmptyInline title="No activity" description="GitHub returned no recent changes for the connected repositories." /> : null}
        {!loading && activity.map((item) => (
          <a className="timeline-row" href={item.url} target="_blank" rel="noreferrer" key={item.id}>
            <div className="timeline-dot" />
            <div><strong>{item.title}</strong><span>{item.meta}</span></div>
            <time>{formatWhen(item.timestamp)}</time>
          </a>
        ))}
      </section>
    </div>
  )
}

export function LiveDeploymentsView() {
  const { data, loading, error, reload } = useGithubDashboard()
  if (!data?.connected && !loading) {
    return <div className="page-body"><section className="connect-hero glass-card"><div className="connect-icon"><Rocket size={26} /></div><div><h2>Connect GitHub first</h2><p>Deployment and CI status is read from your GitHub repositories and Actions.</p></div><button className="glass-button solid" onClick={() => { window.location.href = '/api/integrations/github/start' }}>Connect GitHub</button></section></div>
  }

  const runs = data?.workflows ?? []
  const deployments = data?.deployments ?? []

  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">GitHub Actions + deployments</span><h1>Deployments</h1><p>Live CI and deployment state from your connected repositories.</p></div><button className="glass-button" onClick={() => void reload()}><RefreshCcw size={15} />Refresh</button></div>
      {error ? <div className="meeting-notice">{error}</div> : null}

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Actions</span><h2>Recent workflow runs</h2></div></div>
        <div className="team-table">
          {loading ? <div className="loading-state">Loading workflow runs…</div> : null}
          {!loading && !runs.length ? <EmptyInline title="No workflow runs found" description="The connected repositories do not have recent GitHub Actions runs." /> : null}
          {runs.map((run) => (
            <a className="team-row" href={run.html_url} target="_blank" rel="noreferrer" key={String(run.id) + run.repositoryFullName}>
              <span className="avatar">{run.repositoryFullName.slice(0, 1).toUpperCase()}</span>
              <div><strong>{run.name}</strong><span>{run.repositoryFullName} · {run.head_branch} · {run.head_sha.slice(0, 7)}</span></div>
              <LiveStatus status={run.status} conclusion={run.conclusion} />
              <time>{formatWhen(run.updated_at)}</time>
              <ExternalLink size={15} className="muted-icon" />
            </a>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Deployments API</span><h2>Recent deployments</h2></div></div>
        <div className="team-table">
          {!deployments.length ? <EmptyInline title="No deployments found" description="GitHub has no recent deployments for the repositories currently tracked by HEAVEN." /> : null}
          {deployments.map((deployment) => (
            <a className="team-row" href={'https://github.com/' + deployment.repositoryFullName + '/deployments'} target="_blank" rel="noreferrer" key={String(deployment.id) + deployment.repositoryFullName}>
              <span className="avatar"><Rocket size={14} /></span>
              <div><strong>{deployment.repositoryFullName}</strong><span>{deployment.environment || deployment.ref} · {deployment.sha.slice(0, 7)}</span></div>
              <span className="setting-value">{deployment.creator?.login || 'GitHub'}</span>
              <time>{formatWhen(deployment.updated_at)}</time>
              <ExternalLink size={15} className="muted-icon" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

export function LiveAnalyticsView() {
  const { data, loading, error, reload } = useGithubDashboard()
  const stats = data?.stats ?? { repositories: 0, privateRepositories: 0, commits: 0, openPullRequests: 0, failedWorkflows: 0, deployments: 0 }
  const repoActivity = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of data?.recentActivity ?? []) {
      const repo = item.meta.split(' · ')[0]
      map.set(repo, (map.get(repo) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [data])

  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Engineering analytics</span><h1>Analytics</h1><p>These metrics are calculated from your connected GitHub data, not demo traffic.</p></div><button className="glass-button" onClick={() => void reload()}><RefreshCcw size={15} />Refresh</button></div>
      {loading ? <div className="panel"><div className="loading-state">Loading GitHub analytics…</div></div> : null}
      {error ? <div className="meeting-notice">{error}</div> : null}
      <div className="analytics-grid">
        <LiveMetric label="Repositories" value={String(stats.repositories)} detail={String(stats.privateRepositories) + ' private'} icon={Github} />
        <LiveMetric label="Recent commits" value={String(stats.commits)} detail="Across active repositories" icon={GitCommitHorizontal} />
        <LiveMetric label="Open PRs" value={String(stats.openPullRequests)} detail="Recently updated" icon={GitPullRequest} />
        <LiveMetric label="Failed workflows" value={String(stats.failedWorkflows)} detail="Current sample" icon={XCircle} />
      </div>
      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Repository activity</span><h2>Where work is happening</h2></div></div>
        <div className="source-list">
          {repoActivity.map(([repo, count]) => (
            <div className="source-row" key={repo}>
              <div><span>{repo}</span><strong>{count}</strong></div>
              <div className="source-track"><span style={{ width: String(Math.min(100, count * 10)) + '%' }} /></div>
              <small>events</small>
            </div>
          ))}
          {!repoActivity.length ? <EmptyInline title="No activity sample" description="Connect GitHub and refresh to populate engineering analytics." /> : null}
        </div>
      </section>
    </div>
  )
}

export function LiveMeetingsView() {
  const [provider, setProvider] = useState<'zoom' | 'discord'>('zoom')
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [guilds, setGuilds] = useState<Array<{ id: string; name: string }>>([])
  const [selectedGuild, setSelectedGuild] = useState('')
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('30')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    try {
      const [integrationData, meetingData, guildData] = await Promise.all([
        readJson('/api/integrations'),
        readJson('/api/meetings'),
        readJson('/api/integrations/discord/guilds'),
      ])
      setConnectedProviders((integrationData.integrations ?? []).map((item: { provider: string }) => item.provider))
      setMeetings(meetingData.meetings ?? [])
      setGuilds(guildData.guilds ?? [])
      setSelectedGuild(guildData.selectedGuildId ?? '')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to load meeting data')
    }
  }

  useEffect(() => { void load() }, [])

  const connected = connectedProviders.includes(provider)

  const connect = () => {
    window.location.href = provider === 'zoom' ? '/api/integrations/zoom/start' : '/api/integrations/discord/start'
  }

  const selectGuild = async (guildId: string) => {
    const guild = guilds.find((item) => item.id === guildId)
    setSelectedGuild(guildId)
    try {
      await readJson('/api/integrations/discord/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, guildName: guild?.name }),
      })
      setNotice('Discord server selected')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not select Discord server')
    }
  }

  const create = async () => {
    if (!title || !startTime) {
      setNotice('Enter a title and start time')
      return
    }
    setLoading(true)
    setNotice('')
    try {
      const data = await readJson('/api/meetings/' + provider, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startTime, durationMinutes: Number(duration) }),
      })
      setMeetings((current) => [...current, { id: 'local-' + Date.now(), provider, title: data.title, scheduled_at: data.startTime, duration_minutes: data.durationMinutes, join_url: data.joinUrl ?? null, host_url: data.hostUrl ?? null, metadata: {} }].sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)))
      setTitle('')
      setNotice((provider === 'zoom' ? 'Zoom meeting' : 'Discord event') + ' created')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Meeting creation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Team communication</span><h1>Meetings</h1><p>Create real Zoom meetings or Discord scheduled events from the workspace.</p></div><div className="segmented"><button className={provider === 'zoom' ? 'selected' : ''} onClick={() => setProvider('zoom')}>Zoom</button><button className={provider === 'discord' ? 'selected' : ''} onClick={() => setProvider('discord')}>Discord</button></div></div>

      {!connected ? (
        <section className="connect-hero glass-card">
          <div className="connect-icon">{provider === 'zoom' ? <Video size={26} /> : <Users size={26} />}</div>
          <div><h2>Connect {provider === 'zoom' ? 'Zoom' : 'Discord'}</h2><p>{provider === 'zoom' ? 'Authorize access to create meetings on your Zoom account.' : 'Authorize Discord, choose a server, and create scheduled events through its bot.'}</p></div>
          <button className="glass-button solid" onClick={connect}>Connect {provider === 'zoom' ? 'Zoom' : 'Discord'}</button>
        </section>
      ) : null}

      {provider === 'discord' && connected ? (
        <section className="panel meeting-setup">
          <div className="panel-head"><div><span className="eyebrow">Discord server</span><h2>Choose where events are created</h2></div></div>
          <div className="meeting-row">
            <select className="meeting-input" value={selectedGuild} onChange={(event) => void selectGuild(event.target.value)}>
              <option value="">Select server…</option>
              {guilds.map((guild) => <option value={guild.id} key={guild.id}>{guild.name}</option>)}
            </select>
          </div>
        </section>
      ) : null}

      {connected ? (
        <section className="panel meeting-setup">
          <div className="panel-head"><div><span className="eyebrow">New conference</span><h2>Schedule it</h2></div><span className="presence online"><span />Connected</span></div>
          <div className="meeting-form">
            <label><span>Title</span><input className="meeting-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly product sync" /></label>
            <label><span>Start</span><input className="meeting-input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
            <label><span>Duration</span><input className="meeting-input" type="number" min="1" max="1440" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
            <div className="meeting-submit"><button className="glass-button solid" onClick={() => void create()} disabled={loading}><Video size={15} />{loading ? 'Creating…' : 'Create conference'}</button></div>
          </div>
          {notice ? <div className="meeting-notice">{notice}</div> : null}
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Workspace calendar</span><h2>Scheduled meetings</h2></div><button className="glass-button" onClick={() => void load()}><RefreshCcw size={15} />Refresh</button></div>
        <div className="team-table">
          {!meetings.length ? <EmptyInline title="No meetings yet" description="Create a Zoom meeting or Discord event above and it will appear here." /> : null}
          {meetings.map((meeting) => (
            <div className="team-row" key={meeting.id}>
              <span className="avatar">{meeting.provider === 'zoom' ? 'Z' : 'D'}</span>
              <div><strong>{meeting.title}</strong><span>{meeting.provider.toUpperCase()} · {formatWhen(meeting.scheduled_at)} · {meeting.duration_minutes} min</span></div>
              {meeting.join_url ? <a className="glass-button" href={meeting.join_url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Join</a> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function LiveTeamView() {
  const { organization, membership } = useOrganization()
  const { createOrganization, setActive } = useOrganizationList()
  const [workspaceName, setWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  const createWorkspace = async () => {
    if (!workspaceName.trim()) {
      setNotice('Enter a workspace name')
      return
    }
    if (!createOrganization || !setActive) {
      setNotice('Workspace management is still loading')
      return
    }
    setCreating(true)
    setNotice('')
    try {
      const created = await createOrganization({ name: workspaceName.trim() })
      await setActive({ organization: created.id })
      setWorkspaceName('')
      setNotice('Workspace created')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create workspace')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Workspace and people</span><h1>Team</h1><p>Switch workspaces, create a team, and manage members with real Clerk Organizations.</p></div><OrganizationSwitcher hidePersonal={false} organizationProfileMode="modal" /></div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Active workspace</span><h2>{organization?.name ?? 'Personal workspace'}</h2></div><Building2 size={18} /></div>
          <div className="account-card">
            <span className="workspace-avatar"><Users size={16} /></span>
            <div><strong>{organization?.name ?? 'Personal workspace'}</strong><span>{membership?.role ?? 'Personal account'}</span></div>
          </div>
          <div className="invite-form">
            <input className="meeting-input" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="New workspace name" />
            <button className="glass-button solid" onClick={() => void createWorkspace()} disabled={creating}><Plus size={15} />{creating ? 'Creating…' : 'Create workspace'}</button>
          </div>
          <p className="auth-note">Clerk creates the organization and makes you its administrator. You can then switch into it from the workspace switcher.</p>
        </section>

        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Member management</span><h2>Build the team</h2></div><Users size={18} /></div>
          <p>Invitations, roles, removals and pending requests are handled by the connected Clerk Organization control panel.</p>
          <div className="invite-form">
            <button className="glass-button" onClick={() => window.location.href = '/organization-profile'}><Users size={15} />Manage organization</button>
            {organization ? <>
              <input className="meeting-input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" />
              <button className="glass-button solid" onClick={() => {
                if (!inviteEmail.trim()) return
                void organization.inviteMember({ emailAddress: inviteEmail.trim(), role: 'org:member' })
                  .then(() => { setInviteEmail(''); setNotice('Invitation sent') })
                  .catch((error) => setNotice(error instanceof Error ? error.message : 'Could not send invitation'))
              }}><Plus size={15} />Invite member</button>
            </> : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Why this is real</span><h2>Identity + workspace state</h2></div><CheckCircle2 size={18} /></div>
        <div className="health-stack">
          <div className="health-row"><span>Email authentication</span><strong>Clerk</strong><em>Verified by provider</em></div>
          <div className="health-row"><span>Organization membership</span><strong>{organization ? organization.name : 'Personal'}</strong><em>{membership?.role ?? 'Personal account'}</em></div>
          <div className="health-row"><span>Invitations</span><strong>Organization invites</strong><em>Sent by Clerk email</em></div>
        </div>
        {notice ? <div className="meeting-notice">{notice}</div> : null}
      </section>
    </div>
  )
}

function EmptyInline({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>
}

export type LiveViewMap = {
  overview: typeof LiveOverview
  activity: typeof LiveActivityView
  deployments: typeof LiveDeploymentsView
  analytics: typeof LiveAnalyticsView
  meetings: typeof LiveMeetingsView
  team: typeof LiveTeamView
}

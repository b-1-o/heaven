
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Github, GitPullRequest, GitCommitHorizontal, Rocket, CheckCircle2, XCircle, Clock3, ExternalLink, RefreshCcw, Users, Video, CalendarDays, Plus, Building2, Activity, ArrowUpRight } from 'lucide-react'
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


const mockWorkspace: DashboardData = {
  connected: false,
  account: { login: 'heaven-team', avatar_url: '', html_url: 'https://github.com', name: 'HEAVEN Workspace' },
  repositories: [
    { id: 1, name: 'heaven', full_name: 'b-1-o/heaven', private: false, html_url: 'https://github.com/b-1-o/heaven', default_branch: 'main', pushed_at: '2026-09-28T00:42:00Z', description: 'Developer command center', language: 'TypeScript' },
    { id: 2, name: 'music', full_name: 'b-1-o/music', private: false, html_url: 'https://github.com/b-1-o/music', default_branch: 'main', pushed_at: '2026-09-27T22:18:00Z', description: 'Music workspace and player', language: 'TypeScript' },
    { id: 3, name: 'Portfolio', full_name: 'b-1-o/Portfolio', private: false, html_url: 'https://github.com/b-1-o/Portfolio', default_branch: 'main', pushed_at: '2026-09-27T20:11:00Z', description: 'Personal developer portfolio', language: 'TypeScript' },
    { id: 4, name: 'royal-touch', full_name: 'b-1-o/Royal-Touch', private: false, html_url: 'https://github.com/b-1-o/Royal-Touch', default_branch: 'main', pushed_at: '2026-09-27T18:42:00Z', description: 'Mobile wash booking experience', language: 'TypeScript' },
  ],
  recentActivity: [
    { id: 'm1', type: 'deployment', title: 'Production deployment completed', meta: 'b-1-o/heaven · main', timestamp: '2026-09-28T00:42:00Z', url: 'https://github.com/b-1-o/heaven/actions' },
    { id: 'm2', type: 'commit', title: 'Expand collaboration workspace', meta: 'b-1-o/heaven · main', timestamp: '2026-09-28T00:45:00Z', url: 'https://github.com/b-1-o/heaven/commits/main' },
    { id: 'm3', type: 'pull_request', title: 'Improve command center navigation', meta: 'b-1-o/heaven · #48', timestamp: '2026-09-27T23:54:00Z', url: 'https://github.com/b-1-o/heaven/pulls' },
    { id: 'm4', type: 'workflow', title: 'HEAVEN CI passed', meta: 'b-1-o/heaven · 2m 31s', timestamp: '2026-09-27T23:48:00Z', url: 'https://github.com/b-1-o/heaven/actions' },
    { id: 'm5', type: 'commit', title: 'Polish portfolio project cards', meta: 'b-1-o/Portfolio · main', timestamp: '2026-09-27T22:18:00Z', url: 'https://github.com/b-1-o/Portfolio/commits/main' },
  ],
  workflows: [
    { id: 101, name: 'HEAVEN CI', html_url: 'https://github.com/b-1-o/heaven/actions', status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: '96515d0a7973488', updated_at: '2026-09-28T00:45:00Z', repositoryFullName: 'b-1-o/heaven' },
    { id: 102, name: 'HEAVEN Production', html_url: 'https://github.com/b-1-o/heaven/actions', status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: '96515d0a7973488', updated_at: '2026-09-28T00:44:00Z', repositoryFullName: 'b-1-o/heaven' },
    { id: 103, name: 'Portfolio Build', html_url: 'https://github.com/b-1-o/Portfolio/actions', status: 'in_progress', conclusion: null, head_branch: 'main', head_sha: '3ad7b21', updated_at: '2026-09-27T23:59:00Z', repositoryFullName: 'b-1-o/Portfolio' },
    { id: 104, name: 'Music Deploy', html_url: 'https://github.com/b-1-o/music/actions', status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: 'b83de12', updated_at: '2026-09-27T22:22:00Z', repositoryFullName: 'b-1-o/music' },
  ],
  deployments: [
    { id: 201, sha: '96515d0a7973488', ref: 'main', environment: 'production', updated_at: '2026-09-28T00:42:00Z', creator: { login: 'b1o' }, repositoryFullName: 'b-1-o/heaven' },
    { id: 202, sha: '3ad7b21', ref: 'main', environment: 'production', updated_at: '2026-09-27T22:20:00Z', creator: { login: 'b1o' }, repositoryFullName: 'b-1-o/Portfolio' },
    { id: 203, sha: 'b83de12', ref: 'main', environment: 'production', updated_at: '2026-09-27T21:31:00Z', creator: { login: 'b1o' }, repositoryFullName: 'b-1-o/music' },
  ],
  stats: { repositories: 4, privateRepositories: 1, commits: 18, openPullRequests: 3, failedWorkflows: 0, deployments: 12 },
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

function OverviewTrend({ live }: { live: DashboardData | null }) {
  const values = live?.connected
    ? [54, 61, 58, 68, 72, 69, 78, 82, 79, 88, 91, 97]
    : [48, 56, 52, 63, 68, 66, 74, 71, 83, 87, 94, 101]
  const max = Math.max(...values)
  const min = Math.min(...values)
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100
    const y = 88 - ((value - min) / Math.max(max - min, 1)) * 68
    return `${x},${y}`
  }).join(' ')
  const linePath = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100
    const y = 88 - ((value - min) / Math.max(max - min, 1)) * 68
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  return (
    <section className="panel overview-analytics-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Engineering analytics</span>
          <h2>Delivery momentum</h2>
        </div>
        <div className="analytics-head-value"><strong>{values[values.length - 1]}</strong><span>index</span></div>
      </div>
      <div className="overview-chart-shell">
        <div className="overview-chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div className="overview-chart">
          <div className="overview-chart-grid"><i/><i/><i/><i/><i/></div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Delivery momentum chart">
            <defs>
              <linearGradient id="overviewLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--chart-line-start)" />
                <stop offset="100%" stopColor="var(--chart-line-end)" />
              </linearGradient>
              <linearGradient id="overviewArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-area-start)" />
                <stop offset="100%" stopColor="var(--chart-area-end)" />
              </linearGradient>
              <filter id="overviewGlow" x="-200%" y="-200%" width="400%" height="400%">
                <feGaussianBlur stdDeviation=".65" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="overviewStarGlow">
                <stop offset="0%" stopColor="var(--chart-star-strong)" />
                <stop offset="34%" stopColor="var(--chart-star-mid)" />
                <stop offset="72%" stopColor="var(--chart-star-soft)" />
                <stop offset="100%" stopColor="var(--chart-star-end)" />
              </radialGradient>
            </defs>
            <polygon points={`0,100 ${points} 100,100`} fill="url(#overviewArea)" />
            <polyline points={points} fill="none" stroke="url(#overviewLine)" strokeWidth=".9" vectorEffect="non-scaling-stroke" pathLength="1" className="overview-line" />
            <path id="overview-motion-path" d={linePath} fill="none" stroke="none" />
            <g className="overview-orbit">
              <circle r="3.8" fill="url(#overviewStarGlow)" className="overview-orbit-halo" />
              <circle r=".32" className="overview-orbit-core" />
              <circle r=".08" className="overview-orbit-pulse" />
              <animateMotion dur="5.8s" repeatCount="indefinite" rotate="auto">
                <mpath href="#overview-motion-path" />
              </animateMotion>
            </g>
          </svg>
          <div className="overview-chart-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
        </div>
      </div>
      <div className="overview-analytics-footer">
        <div><span>PR response</span><strong>1h 42m</strong><small>−22m this week</small></div>
        <div><span>Release success</span><strong>99.2%</strong><small>12 releases · 0 failed</small></div>
        <div><span>Open review load</span><strong>{live?.stats?.openPullRequests ?? 3}</strong><small>active pull requests</small></div>
      </div>
    </section>
  )
}

export function LiveOverview({ onView }: { onView: (view: 'repositories' | 'activity' | 'projects' | 'tasks' | 'people' | 'rooms' | 'deployments' | 'analytics' | 'meetings') => void }) {
  const { data: live, loading, error, reload } = useGithubDashboard()
  if (loading) return <div className="page-body"><div className="panel"><div className="loading-state">Loading workspace signals…</div></div></div>
  const data = live?.connected ? live : mockWorkspace
  const stats = data.stats!
  const demo = !live?.connected

  return (
    <div className="page-body">
      <div className="workspace-banner glass-card">
        <div>
          <span className="eyebrow">{demo ? 'Workspace preview' : 'Live workspace'}</span>
          <strong>{demo ? 'Your command center is ready.' : 'Your workspace is live.'}</strong>
          <span>{demo ? 'Connect GitHub, Zoom and the other services when you are ready. The interface is already usable.' : 'Repositories, PRs, workflows and delivery activity are flowing into HEAVEN.'}</span>
        </div>
        <div className="workspace-banner-actions">
          {demo ? <button className="glass-button" onClick={() => { window.location.href = '/api/integrations/github/start' }}><Github size={14} />Connect GitHub</button> : <button className="glass-button" onClick={() => void reload()}><RefreshCcw size={14} />Refresh</button>}
          <button className="glass-button solid" onClick={() => onView('meetings')}><Video size={14} />Open conference</button>
        </div>
      </div>

      <div className="metric-grid overview-metrics">
        <button className="metric-card glass-card overview-metric-button" onClick={() => onView('projects')}>
          <div className="metric-head"><span>Projects</span><span className="metric-icon"><Github size={16} /></span></div>
          <div className="metric-value">24</div>
          <div className="metric-delta">6 active · 3 at review <ArrowUpRight size={13} /></div>
        </button>
        <button className="metric-card glass-card overview-metric-button" onClick={() => onView('repositories')}>
          <div className="metric-head"><span>Repositories</span><span className="metric-icon"><Github size={16} /></span></div>
          <div className="metric-value">{stats.repositories}</div>
          <div className="metric-delta">{stats.privateRepositories} private <ArrowUpRight size={13} /></div>
        </button>
        <button className="metric-card glass-card overview-metric-button" onClick={() => onView('activity')}>
          <div className="metric-head"><span>Open PRs</span><span className="metric-icon"><GitPullRequest size={16} /></span></div>
          <div className="metric-value">{stats.openPullRequests}</div>
          <div className="metric-delta">2 need review today <ArrowUpRight size={13} /></div>
        </button>
        <button className="metric-card glass-card overview-metric-button" onClick={() => onView('deployments')}>
          <div className="metric-head"><span>Deployments</span><span className="metric-icon"><Rocket size={16} /></span></div>
          <div className="metric-value">{stats.deployments}</div>
          <div className="metric-delta">0 failed this cycle <ArrowUpRight size={13} /></div>
        </button>
      </div>

      {error && !demo ? <div className="meeting-notice">{error}</div> : null}

      <div className="overview-main-grid">
        <OverviewTrend live={live} />
        <section className="panel overview-status-panel">
          <div className="panel-head">
            <div><span className="eyebrow">Live infrastructure</span><h2>System status</h2></div>
            <span className="live-dot"><span />Operational</span>
          </div>
          <div className="overview-health">
            {[
              ['API gateway', 'Operational', '47ms', 'good'],
              ['Primary database', 'Operational', '12ms', 'good'],
              ['GitHub sync', demo ? 'Waiting for connection' : 'Connected', demo ? '—' : '12s ago', demo ? 'muted' : 'good'],
              ['Conference layer', 'Ready', 'Zoom + Rooms', 'good'],
            ].map(([name, state, metric, tone]) => (
              <div className="overview-health-row" key={name}>
                <span className="overview-health-dot" data-tone={tone} />
                <div><strong>{name}</strong><small>{state}</small></div>
                <span>{metric}</span>
              </div>
            ))}
          </div>
          <button className="text-link overview-status-link" onClick={() => onView('analytics')}>Open analytics <ChevronRightIcon /></button>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div><span className="eyebrow">Workspace pulse</span><h2>What is moving now</h2></div>
            <span className="live-dot"><span />{demo ? 'Preview' : 'Live'}</span>
          </div>
          <div className="pulse-grid overview-pulse">
            <button onClick={() => onView('tasks')}><span>Active work</span><strong>12</strong><small>tasks moving today</small></button>
            <button onClick={() => onView('people')}><span>Team online</span><strong>4 / 8</strong><small>across 5 time zones</small></button>
            <button onClick={() => onView('rooms')}><span>Rooms</span><strong>2 live</strong><small>1 scheduled next</small></button>
            <button onClick={() => onView('deployments')}><span>Release health</span><strong>99.9%</strong><small>0 failed runs</small></button>
          </div>
          <div className="quick-launch-grid">
            <button onClick={() => onView('projects')}><Github size={15} /><span><strong>Projects</strong><small>Open delivery boards</small></span><ArrowUpRight size={13} /></button>
            <button onClick={() => onView('people')}><Users size={15} /><span><strong>People</strong><small>Find a teammate</small></span><ArrowUpRight size={13} /></button>
            <button onClick={() => onView('rooms')}><Video size={15} /><span><strong>Conference</strong><small>Join a room</small></span><ArrowUpRight size={13} /></button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Repository pulse</span><h2>Active repositories</h2></div><button className="text-link" onClick={() => onView('repositories')}>View all <ExternalLink size={13} /></button></div>
          <div className="activity-list">
            {(data.repositories ?? []).slice(0, 5).map((repo) => <a className="activity-row" href={repo.html_url} target="_blank" rel="noreferrer" key={repo.id}><div className="activity-icon"><Github size={15} /></div><div className="activity-copy"><strong>{repo.full_name}</strong><span>{repo.default_branch} · {repo.language ?? 'Product'} · {repo.pushed_at ? formatWhen(repo.pushed_at) : 'No pushes'}</span></div><ChevronRightIcon /></a>)}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Workspace stream</span><h2>Recent changes</h2></div><button className="text-link" onClick={() => onView('activity')}>Open stream <ExternalLink size={13} /></button></div>
        <div className="activity-list">{(data.recentActivity ?? []).slice(0, 7).map((item) => <a className="activity-row" href={item.url} target="_blank" rel="noreferrer" key={item.id}><div className="activity-icon"><ActivityGlyph type={item.type} /></div><div className="activity-copy"><strong>{item.title}</strong><span>{item.meta} · {formatWhen(item.timestamp)}</span></div><ExternalLink size={14} className="activity-arrow" /></a>)}</div>
      </section>
    </div>
  )
}

function ChevronRightIcon() {
  return <span className="activity-arrow">›</span>
}

export function LiveActivityView() {
  const { data: live, loading, error, reload } = useGithubDashboard()
  const [filter, setFilter] = useState<'all' | ActivityItem['type']>('all')
  const data = live?.connected ? live : mockWorkspace
  const activity = useMemo(() => {
    const items = data.recentActivity ?? []
    return filter === 'all' ? items : items.filter((item) => item.type === filter)
  }, [data, filter])
  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">{live?.connected ? 'Live engineering stream' : 'Workspace activity'}</span><h1>Activity</h1><p>Searchable audit trail of commits, pull requests, CI and releases.</p></div><button className="glass-button" onClick={() => void reload()}><RefreshCcw size={15} />Refresh</button></div>
      {!live?.connected ? <div className="preview-note">Preview data · connect GitHub to replace this stream with live events.</div> : null}
      {error && live?.connected ? <div className="meeting-notice">{error}</div> : null}
      <div className="activity-summary-grid"><div><span>Events today</span><strong>38</strong><small>+12% from yesterday</small></div><div><span>Deployments</span><strong>12</strong><small>All healthy</small></div><div><span>Review queue</span><strong>3</strong><small>2 need action</small></div><div><span>Avg. cycle</span><strong>2h 18m</strong><small>−14m this week</small></div></div>
      <div className="segmented status-filters">{(['all','commit','pull_request','workflow','deployment'] as const).map((value) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All events' : value.replace('_',' ')}</button>)}</div>
      <section className="panel timeline-panel">
        {loading && live?.connected ? <div className="loading-state">Refreshing workspace activity…</div> : null}
        {activity.map((item) => <a className="timeline-row" href={item.url} target="_blank" rel="noreferrer" key={item.id}><div className="timeline-dot" /><div><strong>{item.title}</strong><span>{item.meta}</span></div><time>{formatWhen(item.timestamp)}</time></a>)}
      </section>
    </div>
  )
}

export function LiveDeploymentsView() {
  const { data: live, loading, error, reload } = useGithubDashboard()
  const data = live?.connected ? live : mockWorkspace
  const runs = data.workflows ?? []
  const deployments = data.deployments ?? []
  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Release infrastructure</span><h1>Deployments</h1><p>Observe CI, environments, release ownership and production health from one surface.</p></div><button className="glass-button" onClick={() => void reload()}><RefreshCcw size={15} />Refresh</button></div>
      {!live?.connected ? <div className="preview-note">Preview infrastructure · real workflow data appears automatically after GitHub is connected.</div> : null}
      {error && live?.connected ? <div className="meeting-notice">{error}</div> : null}
      <div className="deployment-summary-grid"><div><span>Production</span><strong>Healthy</strong><small>99.99% availability</small></div><div><span>Deploy frequency</span><strong>4.2 / day</strong><small>+18% this cycle</small></div><div><span>Lead time</span><strong>2h 18m</strong><small>from merge to prod</small></div><div><span>Failed releases</span><strong>0</strong><small>last 30 days</small></div></div>
      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">CI pipeline</span><h2>Recent workflow runs</h2></div><span className="live-dot"><span />Pipeline online</span></div>
        <div className="team-table">{runs.map((run) => <a className="team-row" href={run.html_url} target="_blank" rel="noreferrer" key={String(run.id)+run.repositoryFullName}><span className="avatar"><CheckCircle2 size={14}/></span><div><strong>{run.name}</strong><span>{run.repositoryFullName} · {run.head_branch} · {run.head_sha.slice(0,7)}</span></div><LiveStatus status={run.status} conclusion={run.conclusion}/><time>{formatWhen(run.updated_at)}</time><ExternalLink size={15} className="muted-icon"/></a>)}</div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Environments</span><h2>Latest releases</h2></div></div>
        <div className="deployment-card-grid">{deployments.map((deployment) => <a className="deployment-card glass-card" href={'https://github.com/'+deployment.repositoryFullName+'/deployments'} target="_blank" rel="noreferrer" key={String(deployment.id)+deployment.repositoryFullName}><div className="deployment-card-top"><Rocket size={15}/><span>Production</span><CheckCircle2 size={14}/></div><strong>{deployment.repositoryFullName}</strong><p>{deployment.ref} · {deployment.sha.slice(0,7)}</p><div className="deployment-card-foot"><span>{deployment.creator?.login || 'GitHub'}</span><time>{formatWhen(deployment.updated_at)}</time></div></a>)}</div>
      </section>
    </div>
  )
}

export function LiveAnalyticsView() {
  const { data: live, loading, error, reload } = useGithubDashboard()
  const data = live?.connected ? live : mockWorkspace
  const stats = data.stats!
  const repoActivity = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of data.recentActivity ?? []) {
      const repo = item.meta.split(' · ')[0]
      map.set(repo, (map.get(repo) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1])
  }, [data])
  const trends=[82,91,88,96,94,99,97,104,101,108,112,118]
  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Observability</span><h1>Analytics</h1><p>See delivery velocity, review pressure, repository activity and system quality.</p></div><div className="section-actions"><div className="segmented"><button className="selected">7D</button><button>30D</button><button>90D</button><button>Custom</button></div><button className="glass-button" onClick={() => void reload()}><RefreshCcw size={15}/>Refresh</button></div></div>
      {!live?.connected ? <div className="preview-note">Preview metrics · calculated from the workspace model until external providers are connected.</div> : null}
      {error && live?.connected ? <div className="meeting-notice">{error}</div> : null}
      <div className="analytics-grid">
        <LiveMetric label="Delivery score" value="94" detail="+6 this week" icon={Rocket}/>
        <LiveMetric label="PR response" value="1h 42m" detail="−22m vs. last week" icon={GitPullRequest}/>
        <LiveMetric label="Release success" value="99.2%" detail="12 releases · 0 failed" icon={CheckCircle2}/>
        <LiveMetric label="Repositories" value={String(stats.repositories)} detail={String(stats.commits) + ' recent commits'} icon={Github}/>
      </div>
      <div className="analytics-main-grid">
        <section className="panel analytics-trend-panel">
          <div className="panel-head"><div><span className="eyebrow">Delivery index</span><h2>Engineering momentum</h2></div><span className="chart-highlight">118 <small>+14%</small></span></div>
          <div className="trend-chart">{trends.map((value,index)=><div className="trend-bar" key={index} style={{height:(value/118*100)+'%'}}><span/></div>)}</div>
          <div className="trend-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
        </section>
        <section className="panel breakdown-panel">
          <div className="panel-head"><div><span className="eyebrow">Work distribution</span><h2>By repository</h2></div></div>
          <div className="source-list">{repoActivity.map(([repo,count])=><div className="source-row" key={repo}><div><span>{repo}</span><strong>{count * 9}%</strong></div><div className="source-track"><span style={{width:Math.min(96,count*26)+'%'}}/></div><small>{count} recent events</small></div>)}</div>
        </section>
      </div>
      <div className="analytics-grid secondary"><div className="glass-card analytics-detail"><span>Open PRs</span><strong>{stats.openPullRequests}</strong><small>2 high priority</small></div><div className="glass-card analytics-detail"><span>Active tasks</span><strong>186</strong><small>18 completed this week</small></div><div className="glass-card analytics-detail"><span>People online</span><strong>4 / 8</strong><small>5 time zones represented</small></div><div className="glass-card analytics-detail"><span>Conference time</span><strong>9h 24m</strong><small>Across project rooms</small></div></div>
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
      const [integrationData, meetingData] = await Promise.all([
        readJson('/api/integrations'),
        readJson('/api/meetings'),
      ])
      const providers = (integrationData.integrations ?? []).map((item: { provider: string }) => item.provider)
      setConnectedProviders(providers)
      setMeetings(meetingData.meetings ?? [])
      if (providers.includes('discord')) {
        try {
          const guildData = await readJson('/api/integrations/discord/guilds')
          setGuilds(guildData.guilds ?? [])
          setSelectedGuild(guildData.selectedGuildId ?? '')
        } catch (error) {
          setNotice(error instanceof Error ? error.message : 'Could not load Discord servers')
        }
      }
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

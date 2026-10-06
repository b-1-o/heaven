'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { OrganizationSwitcher, useOrganization } from '@clerk/nextjs'
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Command,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Gauge,
  Github,
  GitBranch,
  Globe2,
  LayoutDashboard,
  Layers3,
  ListTodo,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Rocket,
  RefreshCcw,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Terminal,
  Video,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { activity, chartSeries, projects, type TaskStatus } from './data'
import { resetTasks, updateTaskStatus, useTasks } from './services/task-store'
import { LiveOverview, LiveActivityView, LiveDeploymentsView, LiveAnalyticsView, LiveMeetingsView, LiveTeamView } from './LiveViews'
import { ConferenceRoomsView, GlobalSearchPalette, PeopleDirectoryView } from './WorkspaceFeatures'

type View = 'overview' | 'repositories' | 'projects' | 'tasks' | 'deployments' | 'analytics' | 'activity' | 'meetings' | 'team' | 'people' | 'rooms' | 'integrations' | 'settings'


const routeViews: Record<string, View> = {
  '': 'overview',
  overview: 'overview',
  repositories: 'repositories',
  projects: 'projects',
  tasks: 'tasks',
  deployments: 'deployments',
  analytics: 'analytics',
  activity: 'activity',
  meetings: 'meetings',
  team: 'team',
  people: 'people',
  rooms: 'rooms',
  integrations: 'integrations',
  settings: 'settings',
}

function viewFromPathname(pathname: string): View {
  const key = pathname.replace(/^\//, '').replace(/\/$/, '')
  return routeViews[key] ?? 'overview'
}

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'repositories', label: 'Repositories', icon: Github },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'deployments', label: 'Deployments', icon: Rocket },
  { id: 'meetings', label: 'Meetings', icon: Video },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: ActivityIcon },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'people', label: 'People', icon: UserRound },
  { id: 'rooms', label: 'Conference rooms', icon: Video },
  { id: 'integrations', label: 'Integrations', icon: GitBranch },
]

const settingsNavigation = [{ id: 'settings' as View, label: 'Settings', icon: Settings2 }]

const taskColumns: TaskStatus[] = ['Backlog', 'In Progress', 'Review', 'Done']

const statusTone: Record<string, string> = {
  Active: 'status-active',
  Review: 'status-review',
  Paused: 'status-paused',
  Done: 'status-done',
  'In Progress': 'status-progress',
  Backlog: 'status-backlog',
}

function Starfield() {
  const stars = [
    [4, 8, 1.2, 0, 10, .52],[11, 28, .8, -2, 13, .34],[17, 71, 1.1, -6, 15, .44],
    [23, 14, .7, -4, 11, .3],[29, 46, 1.3, -9, 17, .58],[35, 82, .9, -12, 14, .36],
    [42, 23, .75, -7, 12, .31],[48, 61, 1, -1, 16, .4],[54, 9, 1.2, -8, 18, .48],
    [61, 36, .7, -10, 13, .28],[67, 77, 1.05, -5, 15, .46],[73, 18, .8, -11, 12, .33],
    [79, 54, 1.25, -3, 17, .5],[84, 9, .65, -8, 14, .27],[89, 68, 1.1, -6, 16, .42],
    [94, 32, .8, -2, 12, .31],[7, 52, .65, -9, 14, .3],[14, 92, 1.1, -4, 18, .43],
    [27, 9, .85, -1, 13, .32],[38, 58, .7, -7, 16, .29],[47, 93, 1.25, -10, 19, .48],
    [58, 48, .72, -4, 12, .29],[69, 93, .95, -6, 16, .4],[76, 41, .62, -2, 11, .25],
    [87, 17, 1.15, -9, 17, .46],[97, 82, .72, -5, 13, .3]
  ]

  return (
    <div className="starfield" aria-hidden="true">
      {stars.map(([left, top, size, delay, duration, opacity], index) => (
        <span
          key={index}
          className="starfield-star"
          style={{
            left: left + '%',
            top: top + '%',
            width: size + 'px',
            height: size + 'px',
            opacity,
            animationDelay: delay + 's',
            animationDuration: duration + 's',
          }}
        />
      ))}
    </div>
  )
}

function formatTitle(view: View) {
  return view === 'overview' ? 'Overview' : view.charAt(0).toUpperCase() + view.slice(1)
}

function Metric({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: typeof Gauge }) {
  return (
    <div className="metric-card glass-card">
      <div className="metric-head">
        <span>{label}</span>
        <span className="metric-icon"><Icon size={16} strokeWidth={1.7} /></span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-delta"><ArrowUpRight size={14} /> {delta}</div>
    </div>
  )
}

function GlassButton({ children, onClick, icon: Icon, variant = 'ghost', ariaLabel }: {
  children?: ReactNode
  onClick?: () => void
  icon?: typeof Plus
  variant?: 'ghost' | 'solid'
  ariaLabel?: string
}) {
  return (
    <button className={`glass-button ${variant}`} onClick={onClick} aria-label={ariaLabel}>
      {Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state glass-card">
      <div className="empty-orb"><Sparkles size={20} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function Sparkline() {
  const points = chartSeries.map((v, i) => {
    const x = (i / (chartSeries.length - 1)) * 100
    const y = 100 - ((v - 35) / 90) * 82
    return `${x},${y}`
  }).join(' ')

  return (
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Performance trend">
      <defs>
        <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d8d8d8" stopOpacity=".3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity=".95" />
        </linearGradient>
        <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill="url(#areaGlow)" />
      <polyline points={points} fill="none" stroke="url(#lineGlow)" strokeWidth=".9" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function ChartPanel() {
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">System throughput</span>
          <h2>Performance</h2>
        </div>
        <div className="segmented">
          <button className="selected">30D</button>
          <button>90D</button>
          <button>1Y</button>
        </div>
      </div>
      <div className="chart-stat">
        <strong>118.4k</strong>
        <span><ArrowUpRight size={14} /> 18.7%</span>
      </div>
      <div className="chart-wrap">
        <div className="chart-y"><span>120k</span><span>90k</span><span>60k</span><span>30k</span><span>0</span></div>
        <div className="chart-canvas">
          <div className="chart-grid">
            <i /><i /><i /><i /><i />
          </div>
          <Sparkline />
          <div className="chart-x"><span>01</span><span>08</span><span>15</span><span>22</span><span>30</span></div>
        </div>
      </div>
    </section>
  )
}

function ActivityPanel() {
  const icons = {
    deploy: Rocket,
    check: CheckCircle2,
    user: UserRound,
    bolt: Zap,
    settings: Settings2,
  } as const

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Workspace stream</span>
          <h2>Recent activity</h2>
        </div>
        <button className="icon-button" aria-label="Open activity"><MoreHorizontal size={17} /></button>
      </div>
      <div className="activity-list">
        {activity.map((entry) => {
          const Icon = icons[entry.icon as keyof typeof icons]
          return (
            <div className="activity-row" key={entry.text}>
              <div className="activity-icon"><Icon size={15} /></div>
              <div className="activity-copy"><strong>{entry.text}</strong><span>{entry.meta}</span></div>
              <ChevronRight size={14} className="activity-arrow" />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ProjectCard({ name, description, status, progress, tasks, stack, updated, onOpen }: {
  name: string; description: string; status: string; progress: number; tasks: number; stack: string[]; updated: string; onOpen: () => void
}) {
  return (
    <button className="project-card glass-card" onClick={onOpen}>
      <div className="project-topline">
        <span className={`status-pill ${statusTone[status]}`}><span />{status}</span>
        <MoreHorizontal size={17} className="muted-icon" />
      </div>
      <div className="project-mark"><Layers3 size={17} /></div>
      <h3>{name}</h3>
      <p>{description}</p>
      <div className="progress-meta"><span>Delivery</span><strong>{progress}%</strong></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="project-footer">
        <span>{tasks} tasks</span>
        <span>{updated}</span>
      </div>
      <div className="project-stack">{stack.map((item) => <span key={item}>{item}</span>)}</div>
    </button>
  )
}

function Overview({ onView }: { onView: (view: View) => void }) {
  return (
    <div className="page-body">
      <div className="metric-grid">
        <Metric label="Revenue" value="$48,290" delta="+12.4% this month" icon={BarChart3} />
        <Metric label="Projects" value="24" delta="+4 since last week" icon={Layers3} />
        <Metric label="Tasks" value="186" delta="+18 completed" icon={ListTodo} />
        <Metric label="Uptime" value="99.98%" delta="+0.03% this month" icon={Gauge} />
      </div>

      <div className="dashboard-grid">
        <ChartPanel />
        <section className="panel system-panel">
          <div className="panel-head">
            <div><span className="eyebrow">Live infrastructure</span><h2>System status</h2></div>
            <span className="live-dot"><span />Live</span>
          </div>
          <div className="system-list">
            {[
              [ServerCog, 'API gateway', 'Operational', '47ms'],
              [Database, 'Primary database', 'Operational', '12ms'],
              [Globe2, 'Edge network', 'Operational', '19ms'],
              [Cpu, 'Workers', 'Operational', '31ms'],
            ].map(([Icon, name, state, latency]) => {
              const Component = Icon as typeof ServerCog
              return <div className="system-row" key={name as string}><span className="system-icon"><Component size={15} /></span><span className="system-name">{name as string}<small>{state as string}</small></span><span className="system-latency">{latency as string}</span><span className="ok-dot" /></div>
            })}
          </div>
          <button className="text-link" onClick={() => onView('deployments')}>View deployment health <ChevronRight size={14} /></button>
        </section>
      </div>

      <div className="dashboard-grid lower">
        <section className="panel">
          <div className="panel-head">
            <div><span className="eyebrow">Work in motion</span><h2>Projects</h2></div>
            <button className="text-link" onClick={() => onView('projects')}>View all <ChevronRight size={14} /></button>
          </div>
          <div className="project-list">
            {projects.slice(0, 4).map((project) => (
              <button className="project-line" key={project.id} onClick={() => onView('projects')}>
                <div className="project-line-mark"><Layers3 size={15} /></div>
                <div className="project-line-copy"><strong>{project.name}</strong><span>{project.description}</span></div>
                <div className="project-line-meter"><span style={{ width: `${project.progress}%` }} /></div>
                <strong className="project-line-value">{project.progress}%</strong>
                <ChevronRight size={15} className="muted-icon" />
              </button>
            ))}
          </div>
        </section>
        <ActivityPanel />
      </div>
    </div>
  )
}

function ProjectsView({ onOpen }: { onOpen: (view: View) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | 'Active' | 'Review' | 'Paused'>('All')
  const filtered = useMemo(() => projects.filter((project) => {
    const haystack = (project.name + ' ' + project.description + ' ' + project.stack.join(' ')).toLowerCase()
    return haystack.includes(query.trim().toLowerCase()) && (status === 'All' || project.status === status)
  }), [query, status])

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">Workspace / portfolio</span>
          <h1>Projects</h1>
          <p>One place for products, delivery, owners, repositories and team context.</p>
        </div>
        <div className="section-actions">
          <GlassButton icon={Users} onClick={() => onOpen('people')}>Find people</GlassButton>
          <GlassButton icon={Plus} variant="solid" onClick={() => onOpen('tasks')}>New project</GlassButton>
        </div>
      </div>
      <div className="filter-row">
        <div className="search-field wide"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, stacks or descriptions…" /><kbd>/</kbd></div>
        <div className="segmented status-filters">
          {['All', 'Active', 'Review', 'Paused'].map((item) => <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item as typeof status)}>{item}</button>)}
        </div>
        <GlassButton icon={Video} onClick={() => onOpen('rooms')}>Open rooms</GlassButton>
      </div>
      <div className="project-grid">
        {filtered.map((project) => <ProjectCard {...project} key={project.id} onOpen={() => onOpen('tasks')} />)}
        <button className="project-card add-card" onClick={() => onOpen('tasks')}>
          <div className="empty-orb"><Plus size={18} /></div>
          <strong>Create a project</strong>
          <span>Start with tasks, owners and a delivery board.</span>
        </button>
      </div>
      <section className="project-insight-grid">
        <div className="glass-card project-insight"><span className="eyebrow">Delivery load</span><strong>{projects.reduce((sum, project) => sum + project.tasks, 0)} active tasks</strong><span>Across {projects.length} workspace projects</span></div>
        <div className="glass-card project-insight"><span className="eyebrow">Average progress</span><strong>{Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)}%</strong><span>Weighted across current delivery boards</span></div>
        <div className="glass-card project-insight"><span className="eyebrow">Team access</span><strong>8 people</strong><span>Search contributors from the workspace directory</span></div>
      </section>
    </div>
  )
}

function RepositoriesView() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState<{ login: string } | null>(null)
  const [repositories, setRepositories] = useState<Array<{
    github_id: number
    name: string
    full_name: string
    private: boolean
    html_url: string
    default_branch: string
    pushed_at: string | null
    description: string | null
  }>>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [commits, setCommits] = useState<Record<string, Array<{ sha: string; html_url: string; commit: { message: string; author: { name: string | null; date: string | null } } }>>>({})

  const load = async (sync = false) => {
    setLoading(!sync)
    if (sync) setSyncing(true)
    try {
      const response = await fetch(`/api/github/repos${sync ? '?sync=1' : ''}`, { cache: 'no-store' })
      const data = await response.json()
      setConnected(Boolean(data.connected))
      setAccount(data.account ?? null)
      setRepositories(data.repositories ?? [])
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => { void load(true) }, [])

  const openCommits = async (repo: string) => {
    setExpanded(expanded === repo ? null : repo)
    if (commits[repo]) return
    const [owner, name] = repo.split('/')
    const response = await fetch(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits`, { cache: 'no-store' })
    const data = await response.json()
    setCommits((current) => ({ ...current, [repo]: data.commits ?? [] }))
  }

  if (!connected) {
    return (
      <div className="page-body">
        <div className="section-toolbar">
          <div><span className="eyebrow">Source control</span><h1>Repositories</h1><p>Connect GitHub and turn HEAVEN into your live developer command center.</p></div>
        </div>
        <section className="connect-hero glass-card">
          <div className="connect-icon"><Github size={26} /></div>
          <div>
            <h2>Connect GitHub</h2>
            <p>HEAVEN will read your repositories, branches, commits and delivery activity on behalf of your account.</p>
          </div>
          <GlassButton icon={Github} variant="solid" onClick={() => { window.location.href = '/api/integrations/github/start' }}>Connect GitHub</GlassButton>
        </section>
      </div>
    )
  }

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">GitHub / {account?.login ?? 'connected'}</span><h1>Repositories</h1><p>{repositories.length} repositories available to this workspace.</p></div>
        <div className="section-actions">
          <GlassButton icon={RefreshCcw} onClick={() => void load(true)}>{syncing ? 'Syncing…' : 'Sync now'}</GlassButton>
          <GlassButton icon={Plus} variant="solid" onClick={() => { window.location.href = '/api/integrations/github/start' }}>Reconnect</GlassButton>
        </div>
      </div>
      {loading ? <div className="repo-grid">{Array.from({ length: 6 }).map((_, i) => <div className="repo-card glass-card skeleton-card" key={i} />)}</div> : null}
      {!loading && repositories.length === 0 ? <EmptyState title="No repositories returned" description="Grant access to the repositories you want HEAVEN to observe, then sync again." /> : null}
      <div className="repo-grid">
        {repositories.map((repo) => (
          <div className="repo-card glass-card" key={repo.github_id}>
            <div className="repo-topline">
              <span className="repo-mark"><Github size={15} /></span>
              <span className={repo.private ? 'repo-private' : 'repo-public'}>{repo.private ? 'Private' : 'Public'}</span>
            </div>
            <button className="repo-name" onClick={() => void openCommits(repo.full_name)}>{repo.full_name}</button>
            <p>{repo.description ?? 'No repository description.'}</p>
            <div className="repo-meta"><span>{repo.default_branch}</span><span>{repo.pushed_at ? new Date(repo.pushed_at).toLocaleString() : 'No pushes yet'}</span></div>
            <div className="repo-actions">
              <GlassButton icon={ActivityIcon} onClick={() => void openCommits(repo.full_name)}>Commits</GlassButton>
              <GlassButton icon={ExternalLink} onClick={() => { window.open(repo.html_url, '_blank', 'noopener,noreferrer') }}>GitHub</GlassButton>
            </div>
            {expanded === repo.full_name ? (
              <div className="repo-commits">
                {(commits[repo.full_name] ?? []).map((commit) => (
                  <a className="repo-commit" href={commit.html_url} target="_blank" rel="noreferrer" key={commit.sha}>
                    <span className="commit-dot" />
                    <span><strong>{commit.commit.message.split('\n')[0]}</strong><small>{commit.commit.author?.name ?? 'GitHub'} · {commit.commit.author?.date ? new Date(commit.commit.author.date).toLocaleString() : 'recent'}</small></span>
                    <code>{commit.sha.slice(0, 7)}</code>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function TasksView() {
  const tasks = useTasks()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'All' | TaskStatus>('All')
  const [mode, setMode] = useState<'table' | 'kanban'>('table')
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const visible = useMemo(() => tasks.filter((task) => {
    const matchesQuery = `${task.title} ${task.project} ${task.assignee}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'All' || task.status === filter
    return matchesQuery && matchesFilter
  }), [tasks, query, filter])

  const moveTask = (id: string, status: TaskStatus) => {
    updateTaskStatus(id, status)
  }

  const taskCount = visible.length

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">Execution layer</span><h1>Tasks</h1><p>Persistent, realtime work tracking with keyboard-friendly controls.</p></div>
        <div className="section-actions">
          <div className="segmented">
            <button className={mode === 'table' ? 'selected' : ''} onClick={() => setMode('table')}>Table</button>
            <button className={mode === 'kanban' ? 'selected' : ''} onClick={() => setMode('kanban')}>Kanban</button>
          </div>
          <GlassButton icon={Plus} variant="solid">Create task</GlassButton>
        </div>
      </div>

      <div className="filter-row">
        <div className="search-field wide"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks..." /><kbd>/</kbd></div>
        <div className="segmented status-filters">
          {['All', ...taskColumns].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item as typeof filter)}>{item}</button>)}
        </div>
        <GlassButton onClick={resetTasks}>Reset demo data</GlassButton>
      </div>

      {mode === 'table' ? (
        <section className="panel task-table">
          <div className="table-head task-grid">
            <span>Task</span><span>Project</span><span>Status</span><span>Priority</span><span>Owner</span><span>Updated</span>
          </div>
          {visible.map((task) => (
            <div className="table-row task-grid" key={task.id}>
              <div className="task-title"><span className={`task-check ${task.status === 'Done' ? 'done' : ''}`}>{task.status === 'Done' ? <Check size={12} /> : null}</span><strong>{task.title}</strong></div>
              <span>{task.project}</span>
              <select className={`inline-select ${statusTone[task.status]}`} value={task.status} onChange={(e) => moveTask(task.id, e.target.value as TaskStatus)} aria-label={`Status for ${task.title}`}>
                {taskColumns.map((status) => <option value={status} key={status}>{status}</option>)}
              </select>
              <span className={`priority ${task.priority.toLowerCase()}`}><span />{task.priority}</span>
              <span className="avatar">{task.assignee}</span>
              <span>{task.updated}</span>
            </div>
          ))}
          {taskCount === 0 ? <EmptyState title="No tasks found" description="Try another search or clear the status filter." /> : null}
        </section>
      ) : (
        <div className="kanban-grid">
          {taskColumns.map((column) => {
            const columnTasks = visible.filter((task) => task.status === column)
            return (
              <section
                className={`kanban-column ${draggedId ? 'drop-ready' : ''}`}
                key={column}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  if (draggedId) moveTask(draggedId, column)
                  setDraggedId(null)
                }}
              >
                <div className="kanban-head"><span>{column}</span><strong>{columnTasks.length}</strong></div>
                <div className="kanban-stack">
                  {columnTasks.map((task) => (
                    <article
                      className="kanban-card glass-card"
                      draggable
                      key={task.id}
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => setDraggedId(null)}
                    >
                      <div className="kanban-card-top">
                        <span className={`priority ${task.priority.toLowerCase()}`}><span />{task.priority}</span>
                        <MoreHorizontal size={15} className="muted-icon" />
                      </div>
                      <strong>{task.title}</strong>
                      <span className="kanban-project">{task.project}</span>
                      <div className="kanban-foot"><span className="avatar">{task.assignee}</span><span>{task.updated}</span></div>
                    </article>
                  ))}
                  {columnTasks.length === 0 ? <div className="kanban-empty">Drop a task here</div> : null}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DeploymentsView() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard?.writeText('a83f91c')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">Release infrastructure</span><h1>Deployments</h1><p>Observe production health and release flow.</p></div>
        <GlassButton icon={Rocket} variant="solid">Deploy</GlassButton>
      </div>
      <div className="deploy-hero glass-card">
        <div className="deploy-status"><span className="live-dot"><span />Live</span><span>Production</span></div>
        <div className="deploy-version">v1.8.4</div>
        <div className="deploy-command">
          <span><GitBranch size={14} /> a83f91c</span>
          <button className="icon-button" onClick={copy} aria-label="Copy commit"><Copy size={14} /></button>
          {copied ? <em>Copied</em> : null}
        </div>
        <div className="deploy-meta-grid">
          <div><span>Build time</span><strong>18.4s</strong></div>
          <div><span>Bundle</span><strong>412 KB</strong></div>
          <div><span>Region</span><strong>Global Edge</strong></div>
          <div><span>Health</span><strong>99.98%</strong></div>
        </div>
        <div className="deployment-actions"><GlassButton icon={Terminal}>View logs</GlassButton><GlassButton icon={RefreshCcw}>Rollback</GlassButton><GlassButton icon={ExternalLink}>Open production</GlassButton></div>
      </div>

      <div className="dashboard-grid lower">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Build output</span><h2>Release log</h2></div><span className="live-dot"><span />Streaming</span></div>
          <div className="log-panel">
            {[
              ['16:42:01', 'Installing dependencies...', 'muted'],
              ['16:42:04', 'Running build pipeline', 'info'],
              ['16:42:11', 'Compiling 214 modules', 'info'],
              ['16:42:17', 'Build completed successfully', 'success'],
              ['16:42:19', 'Deployment propagated globally', 'success'],
            ].map(([time, message, tone]) => <div className={`log-line ${tone}`} key={time}><time>{time}</time><span>{message}</span></div>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Runtime</span><h2>Health signals</h2></div><ShieldCheck size={18} /></div>
          <div className="health-stack">
            {[['Latency', '47ms', 'Low'], ['Error rate', '0.02%', 'Stable'], ['CPU', '31%', 'Healthy'], ['Memory', '58%', 'Healthy']].map(([name, value, state]) => <div className="health-row" key={name}><span>{name}</span><strong>{value}</strong><em>{state}</em></div>)}
          </div>
        </section>
      </div>
    </div>
  )
}

function AnalyticsView() {
  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">Observability</span><h1>Analytics</h1><p>Understand delivery, traffic and runtime quality.</p></div>
        <div className="segmented"><button>7D</button><button className="selected">30D</button><button>90D</button><button>Custom</button></div>
      </div>
      <div className="analytics-grid">
        {[
          ['Requests', '2.84M', '+18.7%', BarChart3],
          ['Active users', '48.2K', '+8.1%', Users],
          ['Deployments', '318', '+23', Rocket],
          ['Error rate', '0.02%', '-0.14%', ShieldCheck],
        ].map(([label, value, delta, Icon]) => {
          const MetricIcon = Icon as typeof BarChart3
          return <div className="analytics-metric glass-card" key={label as string}><MetricIcon size={17} /><span>{label as string}</span><strong>{value as string}</strong><em><ArrowUpRight size={13} /> {delta as string}</em></div>
        })}
      </div>
      <div className="dashboard-grid">
        <ChartPanel />
        <section className="panel breakdown-panel">
          <div className="panel-head"><div><span className="eyebrow">Traffic mix</span><h2>Sources</h2></div></div>
          <div className="source-list">
            {[['Direct', '42%', '84k'], ['Search', '29%', '58k'], ['Referral', '18%', '37k'], ['Social', '11%', '22k']].map(([name, pct, count]) => <div className="source-row" key={name}><div><span>{name}</span><strong>{pct}</strong></div><div className="source-track"><span style={{ width: pct }} /></div><small>{count}</small></div>)}
          </div>
        </section>
      </div>
    </div>
  )
}

function MeetingsView() {
  const [provider, setProvider] = useState<'zoom' | 'discord'>('zoom')
  const [integrations, setIntegrations] = useState<Array<{ provider: string; account_name: string | null }>>([])
  const [guilds, setGuilds] = useState<Array<{ id: string; name: string }>>([])
  const [selectedGuild, setSelectedGuild] = useState('')
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('30')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    const integrationsResponse = await fetch('/api/integrations', { cache: 'no-store' })
    const data = await integrationsResponse.json()
    setIntegrations(data.integrations ?? [])
    const discordResponse = await fetch('/api/integrations/discord/guilds', { cache: 'no-store' })
    const discord = await discordResponse.json()
    setGuilds(discord.guilds ?? [])
    setSelectedGuild(discord.selectedGuildId ?? '')
  }

  useEffect(() => { void load() }, [])

  const connected = integrations.some((item) => item.provider === provider)
  const connectUrl = provider === 'zoom' ? '/api/integrations/zoom/start' : '/api/integrations/discord/start'

  const create = async () => {
    setLoading(true)
    setNotice('')
    try {
      const response = await fetch(`/api/meetings/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startTime, durationMinutes: Number(duration) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Meeting creation failed')
      setNotice(`${provider === 'zoom' ? 'Zoom' : 'Discord'} meeting created`)
      setTitle('')
      if (data.joinUrl) window.open(data.joinUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Meeting creation failed')
    } finally {
      setLoading(false)
    }
  }

  const selectGuild = async (guildId: string) => {
    const guild = guilds.find((item) => item.id === guildId)
    setSelectedGuild(guildId)
    await fetch('/api/integrations/discord/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, guildName: guild?.name }),
    })
  }

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">Team communication</span><h1>Meetings</h1><p>Create and launch team conferences without leaving HEAVEN.</p></div>
        <div className="segmented"><button className={provider === 'zoom' ? 'selected' : ''} onClick={() => setProvider('zoom')}>Zoom</button><button className={provider === 'discord' ? 'selected' : ''} onClick={() => setProvider('discord')}>Discord</button></div>
      </div>

      {!connected ? (
        <section className="connect-hero glass-card">
          <div className="connect-icon"><Video size={26} /></div>
          <div><h2>Connect {provider === 'zoom' ? 'Zoom' : 'Discord'}</h2><p>{provider === 'zoom' ? 'Authorize HEAVEN to schedule meetings on your Zoom account.' : 'Authorize HEAVEN to connect your Discord account and choose a server where the bot is installed.'}</p></div>
          <GlassButton icon={Video} variant="solid" onClick={() => { window.location.href = connectUrl }}>Connect {provider === 'zoom' ? 'Zoom' : 'Discord'}</GlassButton>
        </section>
      ) : null}

      {provider === 'discord' && connected ? (
        <section className="panel meeting-setup">
          <div className="panel-head"><div><span className="eyebrow">Discord workspace</span><h2>Choose a server</h2></div></div>
          <div className="meeting-row">
            <select className="meeting-input" value={selectedGuild} onChange={(event) => void selectGuild(event.target.value)}>
              <option value="">Select server…</option>
              {guilds.map((guild) => <option value={guild.id} key={guild.id}>{guild.name}</option>)}
            </select>
            <span className="setting-value">{selectedGuild ? 'Selected' : 'Required'}</span>
          </div>
        </section>
      ) : null}

      {connected ? (
        <section className="panel meeting-setup">
          <div className="panel-head"><div><span className="eyebrow">New conference</span><h2>Schedule meeting</h2></div><span className="live-dot"><span />Connected</span></div>
          <div className="meeting-form">
            <label><span>Title</span><input className="meeting-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly product sync" /></label>
            <label><span>Start</span><input className="meeting-input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
            <label><span>Duration</span><input className="meeting-input" type="number" min="1" max="1440" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
            <div className="meeting-submit"><GlassButton icon={Video} variant="solid" onClick={() => void create()}>{loading ? 'Creating…' : 'Create conference'}</GlassButton></div>
          </div>
          {notice ? <div className="meeting-notice">{notice}</div> : null}
        </section>
      ) : null}
    </div>
  )
}

function ActivityView() {
  const [events, setEvents] = useState<Array<{
    id: string
    event_type: string
    repository: string | null
    actor_login: string | null
    summary: string
    occurred_at: string
  }>>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/activity', { cache: 'no-store' })
      const data = await response.json()
      setEvents(data.events ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">Live engineering stream</span><h1>Activity</h1><p>GitHub pushes, pull requests, CI runs and deployments flowing into the workspace.</p></div>
        <GlassButton icon={RefreshCcw} onClick={() => void load()}>Refresh</GlassButton>
      </div>
      <section className="panel timeline-panel">
        {loading ? Array.from({ length: 5 }).map((_, i) => <div className="timeline-row timeline-skeleton" key={i}><div className="timeline-dot" /><div><strong>Loading GitHub event…</strong><span>Synchronizing workspace activity</span></div><time>—</time></div>) : null}
        {!loading && events.length === 0 ? <EmptyState title="No GitHub activity yet" description="Connect GitHub and sync your repositories. HEAVEN will install webhooks so new activity can appear here automatically." /> : null}
        {!loading && events.map((event) => (
          <div className="timeline-row" key={event.id}>
            <div className="timeline-dot" />
            <div>
              <strong>{event.summary}</strong>
              <span>{event.actor_login ? `@${event.actor_login}` : 'GitHub'}{event.repository ? ` · ${event.repository}` : ''} · {new Date(event.occurred_at).toLocaleString()}</span>
            </div>
            <time>{event.event_type}</time>
          </div>
        ))}
      </section>
    </div>
  )
}


function TeamView() {
  const { organization, isLoaded } = useOrganization()
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')

  const invite = async () => {
    if (!organization || !email.trim()) return
    try {
      await organization.inviteMember({ emailAddress: email.trim(), role: 'org:member' })
      setNotice(`Invitation sent to ${email.trim()}`)
      setEmail('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not send invitation')
    }
  }

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">Workspace members</span><h1>Team</h1><p>Build a workspace, invite collaborators and keep roles centralized.</p></div>
        <OrganizationSwitcher appearance={{ elements: { rootBox: 'org-switcher' } }} />
      </div>
      <section className="panel invite-panel">
        <div className="panel-head"><div><span className="eyebrow">Invite collaborator</span><h2>Bring your team into HEAVEN</h2></div></div>
        <div className="invite-form">
          <input className="meeting-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
          <GlassButton icon={Plus} variant="solid" onClick={() => void invite()}>{isLoaded ? 'Send invitation' : 'Loading…'}</GlassButton>
        </div>
        {notice ? <div className="meeting-notice">{notice}</div> : null}
      </section>
      <section className="panel team-table">
        <div className="team-row"><span className="avatar large">H</span><div><strong>Active workspace</strong><span>{organization?.name ?? 'Personal workspace'}</span></div><span className="presence online"><span />Connected</span><span className="team-role">Workspace</span><MoreHorizontal size={17} className="muted-icon" /></div>
      </section>
    </div>
  )
}


function IntegrationsView() {
  const [items, setItems] = useState<Array<{ provider: string; account_name: string | null }>>([])
  useEffect(() => {
    fetch('/api/integrations', { cache: 'no-store' }).then((response) => response.json()).then((data) => setItems(data.integrations ?? []))
  }, [])

  const connected = (provider: string) => provider === 'zoom' || items.some((item) => item.provider === provider)
  const rows = [
    ['GitHub', Github, 'Repositories, commits and source activity', 'github'],
    ['Zoom', Video, 'Create and manage team meetings', 'zoom'],
    ['Discord', Users, 'Connect a server and schedule events', 'discord'],
    ['Postgres', Database, 'Persistent HEAVEN workspace data', 'database'],
  ] as const

  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Connected systems</span><h1>Integrations</h1><p>HEAVEN keeps credentials server-side and turns connected services into one operating surface.</p></div></div>
      <div className="integration-grid">
        {rows.map(([name, Icon, description, key]) => {
          const IntegrationIcon = Icon as typeof Github
          const isConnected = connected(key)
          return (
            <div className="integration-card glass-card" key={name}>
              <div className="integration-icon"><IntegrationIcon size={19} /></div>
              <div className="integration-copy"><strong>{name}</strong><p>{description}</p></div>
              <span className={isConnected ? 'connected' : 'available'}>{isConnected ? 'Connected' : key === 'database' ? 'Environment' : 'Not connected'}</span>
              {key === 'github' ? <GlassButton icon={Github} onClick={() => { window.location.href = '/api/integrations/github/start' }}>Connect</GlassButton> : key === 'zoom' ? <GlassButton icon={Video} onClick={() => { window.location.href = '/rooms' }}>Open rooms</GlassButton> : key === 'discord' ? <GlassButton icon={Users} onClick={() => { window.location.href = '/api/integrations/discord/start' }}>Connect</GlassButton> : <GlassButton icon={Settings2}>View</GlassButton>}
            </div>
          )
        })}
      </div>
    </div>
  )
}


function SettingsView({ dark, setDark }: { dark: boolean; setDark: (value: boolean) => void }) {
  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Workspace preferences</span><h1>Settings</h1><p>Control how HEAVEN behaves across this workspace.</p></div></div>
      <div className="settings-layout">
        <div className="settings-nav"><button className="selected">Appearance</button><button>Notifications</button><button>Members</button><button>Security</button><button>API</button></div>
        <section className="panel settings-panel">
          <div className="settings-block"><div><span className="eyebrow">Theme</span><h2>Visual mode</h2><p>The glass system stays dark-first, with a restrained light mode for daylight work.</p></div><button className="theme-switch" onClick={() => setDark(!dark)}><span className={dark ? 'active' : ''}>{dark ? <Moon size={15} /> : <Sun size={15} />}</span><span>{dark ? 'Dark' : 'Light'}</span></button></div>
          <div className="settings-block"><div><span className="eyebrow">Motion</span><h2>Interface movement</h2><p>Respect reduced-motion preferences and keep transitions subtle.</p></div><span className="setting-value">Adaptive</span></div>
          <div className="settings-block"><div><span className="eyebrow">Keyboard</span><h2>Command palette</h2><p>Open navigation and actions without leaving the keyboard.</p></div><kbd className="shortcut">⌘ K</kbd></div>
          <div className="settings-block"><div><span className="eyebrow">Data density</span><h2>Compact interface</h2><p>Optimized for dense information without sacrificing breathing room.</p></div><span className="setting-value">Comfortable</span></div>
        </section>
      </div>
    </div>
  )
}

function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (view: View) => void }) {
  const [query, setQuery] = useState('')
  const commands = [
    ['Dashboard', 'Overview', 'overview'],
    ['Open projects', 'Projects', 'projects'],
    ['View tasks', 'Tasks', 'tasks'],
    ['Deploy release', 'Deployments', 'deployments'],
    ['Open analytics', 'Analytics', 'analytics'],
    ['Workspace settings', 'Settings', 'settings'],
  ] as const
  const filtered = commands.filter(([name, label]) => `${name} ${label}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="command-palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input"><Search size={17} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search or run a command..." /><kbd>esc</kbd><button onClick={onClose} aria-label="Close command palette"><X size={16} /></button></div>
        <div className="palette-section-title">Navigate</div>
        <div className="palette-results">
          {filtered.map(([name, label, view], i) => <button className="palette-result" key={view} onClick={() => { onNavigate(view); onClose() }}><span className="palette-index">{String(i + 1).padStart(2, '0')}</span><span><strong>{name}</strong><small>{label}</small></span><ArrowUpRight size={14} /></button>)}
          {filtered.length === 0 ? <EmptyState title="Nothing matched" description="Try another command or search term." /> : null}
        </div>
        <div className="palette-footer"><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> select</span><span><kbd>esc</kbd> close</span></div>
      </div>
    </div>
  )
}


export default function App() {
  const pathname = usePathname()
  const router = useRouter()
  const view = viewFromPathname(pathname)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [dark, setDark] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        setPaletteOpen(true)
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false)
        setMobileNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem('heaven-theme')
    if (saved === 'light') setDark(false)
  }, [])

  useEffect(() => {
    const theme = dark ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('heaven-theme', theme)
  }, [dark])

  const navigate = (next: View) => {
    router.push(next === 'overview' ? '/' : `/${next}`)
    setMobileNavOpen(false)
  }

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }

  const renderView = () => {
    switch (view) {
      case 'overview': return <LiveOverview onView={navigate} />
      case 'repositories': return <RepositoriesView />
      case 'projects': return <ProjectsView onOpen={navigate} />
      case 'tasks': return <TasksView />
      case 'deployments': return <LiveDeploymentsView />
      case 'analytics': return <LiveAnalyticsView />
      case 'activity': return <LiveActivityView />
      case 'meetings': return <LiveMeetingsView />
      case 'team': return <LiveTeamView />
      case 'people': return <PeopleDirectoryView onView={navigate} onNotify={notify} />
      case 'rooms': return <ConferenceRoomsView onView={navigate} onNotify={notify} />
      case 'integrations': return <IntegrationsView />
      case 'settings': return <SettingsView dark={dark} setDark={setDark} />
    }
  }

  return (
    <div className="app-shell">
      <div className="atmosphere atmosphere-a" />
      <div className="atmosphere atmosphere-b" />
      <div className="noise" /><Starfield />
      <header className="mobile-header glass">
        <button className="icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
        <div className="brand"><span className="brand-mark"><Sparkles size={13} /></span><strong>HEAVEN</strong></div>
        <button className="icon-button" onClick={() => setPaletteOpen(true)} aria-label="Open command palette"><Command size={17} /></button>
      </header>

      <aside className={`sidebar glass ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Sparkles size={13} /></span><strong>HEAVEN</strong><span className="brand-version">v1.8</span></div>
        <button className="workspace-switch"><span className="workspace-avatar">H</span><span><strong>Heaven Labs</strong><small>Personal workspace</small></span><ChevronDown size={14} /></button>
        <nav className="sidebar-nav">
          <span className="nav-label">Workspace</span>
          {navigation.map(({ id, label, icon: Icon }) => <button className={view === id ? 'active' : ''} key={id} onClick={() => navigate(id)}><Icon size={16} /><span>{label}</span>{id === 'activity' ? <i className="nav-dot" /> : null}</button>)}
          <span className="nav-label separate">Manage</span>
          {settingsNavigation.map(({ id, label, icon: Icon }) => <button className={view === id ? 'active' : ''} key={id} onClick={() => navigate(id)}><Icon size={16} /><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="side-status" onClick={() => navigate('deployments')}><span className="live-dot"><span />All systems operational</span><ChevronRight size={14} /></button>
          <button className="profile-mini" onClick={() => notify('Profile menu opened')}><span className="avatar">ER</span><span><strong>Erik</strong><small>Owner</small></span><MoreHorizontal size={16} /></button>
        </div>
      </aside>

      {mobileNavOpen ? <button className="mobile-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" /> : null}

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{formatTitle(view)}</strong></div>
          <div className="topbar-actions">
            <button className="command-trigger glass" onClick={() => setPaletteOpen(true)}><Search size={14} /><span>Search</span><kbd>⌘ K</kbd></button>
            <button className="icon-button glass" onClick={() => notify('You are all caught up')} aria-label="Notifications"><Bell size={16} /><i /></button>
            <button className="icon-button glass" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>
        </header>

        {view === 'overview' ? (
          <section className="page-header">
            <div>
              <div className="status-line"><span className="live-dot"><span />Workspace online</span><span>Updated just now</span></div>
              <h1>Good afternoon.</h1>
              <p>Everything important, visible at a glance.</p>
            </div>
            <div className="page-header-actions">
              <GlassButton icon={Bell} onClick={() => notify('Notifications are clear')}>Alerts</GlassButton>
              <GlassButton icon={Plus} variant="solid" onClick={() => navigate('rooms')}>Open conference</GlassButton>
            </div>
          </section>
        ) : null}

        <div className="page-transition" key={pathname}>{renderView()}</div>

        <footer className="footer">
          <span>HEAVEN · Developer Operations</span>
          <span><KeyboardIcon /> Keyboard-first · Built for clarity</span>
        </footer>
      </main>

      {paletteOpen ? <GlobalSearchPalette onClose={() => setPaletteOpen(false)} onNavigate={navigate} /> : null}
      {notice ? <div className="toast glass"><CheckCircle2 size={15} /><span>{notice}</span></div> : null}
    </div>
  )
}

function KeyboardIcon() {
  return <span className="keyboard-icon"><Command size={11} /></span>
}

import { useEffect, useMemo, useState } from 'react'
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
  CircleDot,
  Clock3,
  Command,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Gauge,
  GitBranch,
  Globe2,
  LayoutDashboard,
  Layers3,
  ListTodo,
  Menu,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  Rocket,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Terminal,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { activity, chartSeries, initialTasks, projects, type Task, type TaskStatus } from './data'

type View = 'overview' | 'projects' | 'tasks' | 'deployments' | 'analytics' | 'activity' | 'team' | 'integrations' | 'settings'

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: Layers3 },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'deployments', label: 'Deployments', icon: Rocket },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: ActivityIcon },
  { id: 'team', label: 'Team', icon: Users },
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
  children?: React.ReactNode
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
  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">Workspace / portfolio</span>
          <h1>Projects</h1>
          <p>Track product delivery across the workspace.</p>
        </div>
        <GlassButton icon={Plus} variant="solid">New project</GlassButton>
      </div>
      <div className="filter-row">
        <div className="search-field"><Search size={15} /><input placeholder="Search projects..." /><kbd>/</kbd></div>
        <GlassButton icon={SlidersHorizontal}>Filters</GlassButton>
        <GlassButton icon={MoreHorizontal} ariaLabel="More project actions" />
      </div>
      <div className="project-grid">
        {projects.map((project) => <ProjectCard {...project} key={project.id} onOpen={() => onOpen('tasks')} />)}
        <button className="project-card add-card" onClick={() => undefined}>
          <div className="empty-orb"><Plus size={18} /></div>
          <strong>Create a project</strong>
          <span>Start with a clean workspace.</span>
        </button>
      </div>
    </div>
  )
}

function TasksView() {
  const [tasks, setTasks] = useState(initialTasks)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'All' | TaskStatus>('All')

  const visible = useMemo(() => tasks.filter((task) => {
    const matchesQuery = `${task.title} ${task.project} ${task.assignee}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'All' || task.status === filter
    return matchesQuery && matchesFilter
  }), [tasks, query, filter])

  const moveTask = (id: string, status: TaskStatus) => {
    setTasks((items) => items.map((item) => item.id === id ? { ...item, status, updated: 'now' } : item))
  }

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div><span className="eyebrow">Execution layer</span><h1>Tasks</h1><p>A keyboard-friendly workspace for product delivery.</p></div>
        <GlassButton icon={Plus} variant="solid">Create task</GlassButton>
      </div>

      <div className="filter-row">
        <div className="search-field wide"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks..." /><kbd>/</kbd></div>
        <div className="segmented status-filters">
          {['All', ...taskColumns].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item as typeof filter)}>{item}</button>)}
        </div>
      </div>

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
        {visible.length === 0 ? <EmptyState title="No tasks found" description="Try a different search or clear the status filter." /> : null}
      </section>
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
        <div className="deployment-actions"><GlassButton icon={Terminal}>View logs</GlassButton><GlassButton icon={RotateIcon}>Rollback</GlassButton><GlassButton icon={ExternalLink}>Open production</GlassButton></div>
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

function ActivityView() {
  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Audit trail</span><h1>Activity</h1><p>A clear timeline of every meaningful workspace action.</p></div><GlassButton icon={SlidersHorizontal}>Filter</GlassButton></div>
      <section className="panel timeline-panel">
        {[...activity, ...activity.slice(0, 3)].map((entry, i) => <div className="timeline-row" key={entry.text + i}><div className="timeline-dot" /><div><strong>{entry.text}</strong><span>{entry.meta}</span></div><time>{i * 17 + 2}m ago</time></div>)}
      </section>
    </div>
  )
}

function TeamView() {
  const team = [
    ['ER', 'Erik', 'Frontend / Product', 'Online'],
    ['MK', 'Mika', 'Design / Systems', 'Online'],
    ['JS', 'Jordan', 'Backend / Infra', 'Away'],
    ['AL', 'Alex', 'QA / Accessibility', 'Online'],
  ]
  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">Workspace members</span><h1>Team</h1><p>People, roles and access in one place.</p></div><GlassButton icon={Plus} variant="solid">Invite member</GlassButton></div>
      <section className="panel team-table">
        {team.map(([initials, name, role, state]) => <div className="team-row" key={name}><span className="avatar large">{initials}</span><div><strong>{name}</strong><span>{role}</span></div><span className={`presence ${state.toLowerCase()}`}><span />{state}</span><span className="team-role">Editor</span><MoreHorizontal size={17} className="muted-icon" /></div>)}
      </section>
    </div>
  )
}

function IntegrationsView() {
  const integrations = [['GitHub', GitBranch, 'Source control and pull requests', 'Connected'], ['Vercel', Globe2, 'Deployments and previews', 'Connected'], ['Postgres', Database, 'Primary application data', 'Connected'], ['Sentry', AlertTriangle, 'Runtime errors and traces', 'Available']]
  return (
    <div className="page-body">
      <div className="section-toolbar"><div><span className="eyebrow">External systems</span><h1>Integrations</h1><p>Connect the tools that power your delivery loop.</p></div></div>
      <div className="integration-grid">
        {integrations.map(([name, Icon, description, state]) => { const IntegrationIcon = Icon as typeof GitBranch; return <div className="integration-card glass-card" key={name as string}><div className="integration-icon"><IntegrationIcon size={19} /></div><div className="integration-copy"><strong>{name as string}</strong><p>{description as string}</p></div><span className={state === 'Connected' ? 'connected' : 'available'}>{state as string}</span><GlassButton icon={state === 'Connected' ? Settings2 : Plus} ariaLabel={`${state} ${name}`} /></div> })}
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

function RotateIcon({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" /><path d="M3 21v-5h5" /></svg>
}

export default function App() {
  const [view, setView] = useState<View>('overview')
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
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  const navigate = (next: View) => {
    setView(next)
    setMobileNavOpen(false)
  }

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }

  const renderView = () => {
    switch (view) {
      case 'overview': return <Overview onView={navigate} />
      case 'projects': return <ProjectsView onOpen={navigate} />
      case 'tasks': return <TasksView />
      case 'deployments': return <DeploymentsView />
      case 'analytics': return <AnalyticsView />
      case 'activity': return <ActivityView />
      case 'team': return <TeamView />
      case 'integrations': return <IntegrationsView />
      case 'settings': return <SettingsView dark={dark} setDark={setDark} />
    }
  }

  return (
    <div className="app-shell">
      <div className="atmosphere atmosphere-a" />
      <div className="atmosphere atmosphere-b" />
      <div className="noise" />
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

        <section className="page-header">
          <div>
            <div className="status-line"><span className="live-dot"><span />Workspace online</span><span>Updated just now</span></div>
            <h1>{view === 'overview' ? 'Good afternoon, Erik.' : formatTitle(view)}</h1>
            {view === 'overview' ? <p>Everything important, visible at a glance.</p> : null}
          </div>
          <div className="page-header-actions">
            <GlassButton icon={Bell} onClick={() => notify('Notifications are clear')}>Alerts</GlassButton>
            <GlassButton icon={Plus} variant="solid" onClick={() => notify('Quick action ready')}>Quick action</GlassButton>
          </div>
        </section>

        {renderView()}

        <footer className="footer">
          <span>HEAVEN · Developer Operations</span>
          <span><KeyboardIcon /> Keyboard-first · Built for clarity</span>
        </footer>
      </main>

      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={navigate} /> : null}
      {notice ? <div className="toast glass"><CheckCircle2 size={15} /><span>{notice}</span></div> : null}
    </div>
  )
}

function KeyboardIcon() {
  return <span className="keyboard-icon"><Command size={11} /></span>
}

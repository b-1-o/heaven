'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  MapPin,
  Mic,
  MonitorUp,
  MoreHorizontal,
  PanelTop,
  Phone,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react'
import { initialTasks, projects, type Task } from './data'

type Person = {
  id: string
  name: string
  initials: string
  role: string
  team: string
  location: string
  status: 'online' | 'away' | 'offline'
  timezone: string
  projects: string[]
  skills: string[]
  email: string
  availability: string
}

type Room = {
  id: string
  name: string
  project: string
  status: 'Live' | 'Scheduled' | 'Available'
  start: string
  duration: string
  host: string
  participantCount: number
  participants: string[]
  accent: string
}

const people: Person[] = [
  { id: 'erik', name: 'Erik Ghabuzyan', initials: 'EG', role: 'Product Engineer', team: 'Core Platform', location: 'Los Angeles, US', status: 'online', timezone: 'PDT · UTC−7', projects: ['Nebula Core', 'Glass Engine'], skills: ['Next.js', 'TypeScript', 'Product'], email: 'erik@heaven.dev', availability: 'Available now' },
  { id: 'mika', name: 'Mika Sato', initials: 'MS', role: 'Frontend Engineer', team: 'Core Platform', location: 'Tokyo, Japan', status: 'online', timezone: 'JST · UTC+9', projects: ['Atlas Mobile', 'Glass Engine'], skills: ['React', 'Motion', 'Design systems'], email: 'mika@heaven.dev', availability: 'Available now' },
  { id: 'jonah', name: 'Jonah Reed', initials: 'JR', role: 'Platform Engineer', team: 'Infrastructure', location: 'Austin, US', status: 'online', timezone: 'CDT · UTC−5', projects: ['Nebula Core', 'Signal API'], skills: ['Node.js', 'Postgres', 'Observability'], email: 'jonah@heaven.dev', availability: 'In a room' },
  { id: 'maya', name: 'Maya Chen', initials: 'MC', role: 'Product Designer', team: 'Design', location: 'San Francisco, US', status: 'away', timezone: 'PDT · UTC−7', projects: ['Glass Engine', 'Atlas Mobile'], skills: ['Figma', 'UX', 'Prototyping'], email: 'maya@heaven.dev', availability: 'Back in 18 min' },
  { id: 'alex', name: 'Alex Laurent', initials: 'AL', role: 'QA Engineer', team: 'Release', location: 'Paris, France', status: 'online', timezone: 'CEST · UTC+2', projects: ['Atlas Mobile', 'Signal API'], skills: ['QA', 'Playwright', 'Release'], email: 'alex@heaven.dev', availability: 'Available now' },
  { id: 'sophia', name: 'Sophia Morgan', initials: 'SM', role: 'Engineering Manager', team: 'Core Platform', location: 'New York, US', status: 'away', timezone: 'EDT · UTC−4', projects: ['Nebula Core'], skills: ['Architecture', 'Planning', 'People'], email: 'sophia@heaven.dev', availability: 'In focus mode' },
  { id: 'noah', name: 'Noah Williams', initials: 'NW', role: 'Backend Engineer', team: 'Infrastructure', location: 'Denver, US', status: 'offline', timezone: 'MDT · UTC−6', projects: ['Signal API'], skills: ['Go', 'Redis', 'APIs'], email: 'noah@heaven.dev', availability: 'Offline' },
  { id: 'lena', name: 'Lena Petrova', initials: 'LP', role: 'Product Manager', team: 'Product', location: 'Berlin, Germany', status: 'online', timezone: 'CEST · UTC+2', projects: ['Atlas Mobile', 'Nebula Core'], skills: ['Roadmaps', 'Research', 'Delivery'], email: 'lena@heaven.dev', availability: 'Available now' },
]

const initialRooms: Room[] = [
  { id: 'room-01', name: 'Nebula Daily', project: 'Nebula Core', status: 'Live', start: 'Now', duration: '27 min', host: 'Sophia Morgan', participantCount: 6, participants: ['SM', 'EG', 'JR', 'LP', 'AL', 'MS'], accent: 'Core' },
  { id: 'room-02', name: 'Design Critique', project: 'Glass Engine', status: 'Scheduled', start: 'Today · 4:30 PM', duration: '45 min', host: 'Maya Chen', participantCount: 4, participants: ['MC', 'MS', 'EG', 'AL'], accent: 'Design' },
  { id: 'room-03', name: 'Release Room', project: 'Atlas Mobile', status: 'Available', start: 'Open room', duration: '—', host: 'Alex Laurent', participantCount: 0, participants: [], accent: 'Release' },
  { id: 'room-04', name: 'Infra Sync', project: 'Signal API', status: 'Scheduled', start: 'Tomorrow · 9:00 AM', duration: '30 min', host: 'Jonah Reed', participantCount: 3, participants: ['JR', 'NW', 'EG'], accent: 'Infra' },
]

const statusLabel: Record<Person['status'], string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
}

const statusClass: Record<Person['status'], string> = {
  online: 'presence-online',
  away: 'presence-away',
  offline: 'presence-offline',
}

function Avatar({ initials, large = false }: { initials: string; large?: boolean }) {
  return <span className={large ? 'workspace-avatar feature-avatar large-avatar' : 'workspace-avatar feature-avatar'}>{initials}</span>
}

export function PeopleDirectoryView({ onView, onNotify }: { onView: (view: 'projects' | 'tasks') => void; onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState('All teams')
  const [selectedId, setSelectedId] = useState(people[0].id)

  const teams = ['All teams', ...Array.from(new Set(people.map((person) => person.team)))]

  const filtered = useMemo(() => people.filter((person) => {
    const haystack = person.name + ' ' + person.role + ' ' + person.team + ' ' + person.location + ' ' + person.projects.join(' ') + ' ' + person.skills.join(' ')
    return haystack.toLowerCase().includes(query.trim().toLowerCase()) && (team === 'All teams' || person.team === team)
  }), [query, team])

  const selected = people.find((person) => person.id === selectedId) ?? filtered[0] ?? people[0]

  const copyEmail = async () => {
    await navigator.clipboard?.writeText(selected.email)
    onNotify('Copied ' + selected.email)
  }

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">Workspace directory</span>
          <h1>People</h1>
          <p>Find teammates by name, role, project, skill or location without leaving the workspace.</p>
        </div>
        <div className="directory-summary glass-card">
          <span><Users size={14} /> {people.length} people</span>
          <span><Radio size={14} /> {people.filter((person) => person.status === 'online').length} online</span>
        </div>
      </div>

      <div className="filter-row directory-toolbar">
        <div className="search-field wide">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, projects, roles or skills…" />
          <kbd>/</kbd>
        </div>
        <div className="directory-filter">
          <Filter size={14} />
          <select value={team} onChange={(event) => setTeam(event.target.value)}>
            {teams.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="people-layout">
        <section className="panel people-panel">
          <div className="panel-head">
            <div><span className="eyebrow">Directory</span><h2>{filtered.length} matching teammates</h2></div>
            <MoreHorizontal size={17} className="muted-icon" />
          </div>
          <div className="people-list">
            {filtered.map((person) => (
              <button className={'person-row ' + (selected.id === person.id ? 'selected' : '')} key={person.id} onClick={() => setSelectedId(person.id)}>
                <Avatar initials={person.initials} />
                <span className="person-main">
                  <strong>{person.name}</strong>
                  <span>{person.role} · {person.team}</span>
                  <small>{person.projects.join(' · ')}</small>
                </span>
                <span className="person-presence"><i className={statusClass[person.status]} />{statusLabel[person.status]}</span>
                <ChevronRight size={14} className="muted-icon" />
              </button>
            ))}
            {filtered.length === 0 ? <div className="directory-empty"><Search size={18} /><strong>No people found</strong><span>Try a name, role, project or skill.</span></div> : null}
          </div>
        </section>

        <aside className="panel person-profile">
          <div className="profile-hero">
            <Avatar initials={selected.initials} large />
            <div><span className="eyebrow">{selected.team}</span><h2>{selected.name}</h2><p>{selected.role}</p></div>
            <span className={'profile-status ' + statusClass[selected.status]}><i />{statusLabel[selected.status]}</span>
          </div>
          <div className="profile-meta"><span><MapPin size={13} /> {selected.location}</span><span><Clock3 size={13} /> {selected.timezone}</span></div>
          <div className="profile-block">
            <span className="eyebrow">Working on</span>
            <div className="profile-projects">
              {selected.projects.map((project) => (
                <button key={project} onClick={() => onView('projects')}><BriefcaseBusiness size={13} />{project}<ArrowUpRight size={12} /></button>
              ))}
            </div>
          </div>
          <div className="profile-block">
            <span className="eyebrow">Skills</span>
            <div className="skill-list">{selected.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          </div>
          <div className="profile-actions">
            <button className="glass-button solid" onClick={() => onNotify('Starting a conversation with ' + selected.name)}><Phone size={14} /> Message</button>
            <button className="glass-button" onClick={() => void copyEmail()}><Copy size={14} /> Email</button>
          </div>
          <div className="profile-footer"><ShieldCheck size={13} /> {selected.availability}</div>
        </aside>
      </div>
    </div>
  )
}

export function ConferenceRoomsView({ onView, onNotify }: { onView: (view: 'meetings') => void; onNotify: (message: string) => void }) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'All' | Room['status']>('All')
  const [selectedRoomId, setSelectedRoomId] = useState(initialRooms[0].id)
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('heaven-conference-rooms')
      if (stored) setRooms(JSON.parse(stored) as Room[])
    } catch {
      // Keep defaults.
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('heaven-conference-rooms', JSON.stringify(rooms))
  }, [rooms])

  const filtered = useMemo(() => rooms.filter((room) => {
    const haystack = room.name + ' ' + room.project + ' ' + room.host
    return haystack.toLowerCase().includes(query.trim().toLowerCase()) && (filter === 'All' || room.status === filter)
  }), [rooms, query, filter])

  const activeRoom = rooms.find((room) => room.id === selectedRoomId) ?? filtered[0] ?? rooms[0]

  const openRoom = () => {
    setSelectedRoomId(activeRoom.id)
    setJoined(true)
    setRooms((items) => items.map((room) => room.id === activeRoom.id && room.status === 'Available'
      ? { ...room, status: 'Live', start: 'Now', duration: 'Just started', participantCount: 1, participants: ['EG'] }
      : room))
    onNotify('Joined ' + activeRoom.name)
  }

  const createRoom = () => {
    const name = newRoomName.trim()
    if (!name) return
    const room: Room = {
      id: 'room-' + Date.now(),
      name,
      project: 'Workspace',
      status: 'Live',
      start: 'Now',
      duration: 'Just started',
      host: 'Erik Ghabuzyan',
      participantCount: 1,
      participants: ['EG'],
      accent: 'Workspace',
    }
    setRooms((items) => [room, ...items])
    setSelectedRoomId(room.id)
    setJoined(true)
    setComposerOpen(false)
    setNewRoomName('')
    onNotify('Created ' + name)
  }

  return (
    <div className="page-body">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">Team communication</span>
          <h1>Conference Rooms</h1>
          <p>Persistent team rooms for standups, product reviews and live project sessions.</p>
        </div>
        <div className="section-actions">
          <button className="glass-button" onClick={() => onView('meetings')}><CalendarDays size={14} /> Meeting center</button>
          <button className="glass-button solid" onClick={() => setComposerOpen((open) => !open)}><Video size={14} /> New room</button>
        </div>
      </div>

      {composerOpen ? (
        <section className="panel room-composer">
          <div><span className="eyebrow">New room</span><h2>Open a workspace conference</h2></div>
          <div className="room-composer-row">
            <input className="meeting-input" autoFocus value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createRoom() }} placeholder="e.g. Launch room" />
            <button className="glass-button solid" onClick={createRoom}><Check size={14} /> Start room</button>
          </div>
        </section>
      ) : null}

      <div className="room-toolbar">
        <div className="filter-row">
          <div className="search-field wide"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rooms or projects…" /></div>
          <div className="segmented">
            {['All', 'Live', 'Scheduled', 'Available'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item as typeof filter)}>{item}</button>)}
          </div>
        </div>
      </div>

      <div className="room-layout">
        <section className="room-stage panel">
          <div className="room-stage-top">
            <div><span className="eyebrow"><span className="live-indicator" /> {activeRoom.status === 'Live' ? 'Live room' : activeRoom.status}</span><h2>{activeRoom.name}</h2><p>{activeRoom.project} · hosted by {activeRoom.host}</p></div>
            <span className="room-time">{activeRoom.start} · {activeRoom.duration}</span>
          </div>
          <div className="video-grid">
            {[...activeRoom.participants, ...(activeRoom.status === 'Live' && activeRoom.participants.length < 6 ? ['+'] : [])].slice(0, 6).map((initials, index) => (
              <div className={'video-tile ' + (index === 0 ? 'featured' : '')} key={activeRoom.id + '-' + index}>
                {initials === '+' ? <div className="video-avatar empty">+</div> : <div className="video-avatar">{initials}</div>}
                <span>{initials === '+' ? 'Invite' : people.find((person) => person.initials === initials)?.name ?? initials}</span>
                {index === 0 && activeRoom.status === 'Live' ? <i className="speaking-bar" /> : null}
              </div>
            ))}
            {activeRoom.participants.length === 0 ? <div className="video-empty"><PanelTop size={20} /><strong>Room is ready</strong><span>Start the room when the team is ready.</span></div> : null}
          </div>
          <div className="room-controls">
            <button className={'room-control ' + (muted ? 'active' : '')} onClick={() => setMuted((value) => !value)}><Mic size={16} /><span>{muted ? 'Unmute' : 'Mute'}</span></button>
            <button className={'room-control ' + (cameraOff ? 'active' : '')} onClick={() => setCameraOff((value) => !value)}><Camera size={16} /><span>{cameraOff ? 'Camera on' : 'Camera'}</span></button>
            <button className={'room-control ' + (sharing ? 'active' : '')} onClick={() => setSharing((value) => !value)}><MonitorUp size={16} /><span>{sharing ? 'Stop share' : 'Share'}</span></button>
            <button className="room-control" onClick={() => onNotify('Invite link copied')}><Copy size={16} /><span>Invite</span></button>
            {joined
              ? <button className="room-control danger" onClick={() => { setJoined(false); onNotify('You left the room') }}><Phone size={16} /><span>Leave</span></button>
              : <button className="room-control primary" onClick={openRoom}><Video size={16} /><span>{activeRoom.status === 'Scheduled' ? 'Open room' : 'Join room'}</span></button>}
          </div>
          {sharing ? <div className="sharing-banner"><MonitorUp size={14} /> Screen sharing mode is active for this room.</div> : null}
        </section>

        <aside className="room-list-panel panel">
          <div className="panel-head"><div><span className="eyebrow">Workspace rooms</span><h2>{filtered.length} rooms</h2></div><MoreHorizontal size={17} className="muted-icon" /></div>
          <div className="room-list">
            {filtered.map((room) => (
              <button className={'room-card ' + (activeRoom.id === room.id ? 'selected' : '')} key={room.id} onClick={() => { setSelectedRoomId(room.id); setJoined(false) }}>
                <div className="room-card-head"><span className={'room-status-badge ' + room.status.toLowerCase()}><i />{room.status}</span><span>{room.participantCount} people</span></div>
                <strong>{room.name}</strong><span>{room.project} · {room.start}</span>
                <div className="room-participants">{room.participants.slice(0, 5).map((initials) => <span key={initials}>{initials}</span>)}{room.participantCount > 5 ? <span>+{room.participantCount - 5}</span> : null}</div>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <section className="room-feature-grid">
        <div className="glass-card room-feature"><Sparkles size={16} /><div><strong>Project rooms</strong><span>Keep a conference attached to the project context instead of opening another tool.</span></div></div>
        <div className="glass-card room-feature"><ShieldCheck size={16} /><div><strong>Workspace controls</strong><span>Room state and participant context stay visible beside the call.</span></div></div>
        <div className="glass-card room-feature"><Video size={16} /><div><strong>External meeting bridge</strong><span>Use the Meetings center to create an actual Zoom or Discord session.</span></div></div>
      </section>
    </div>
  )
}

type SearchResult = {
  id: string
  title: string
  subtitle: string
  category: 'People' | 'Projects' | 'Tasks' | 'Rooms'
  view: 'people' | 'projects' | 'tasks' | 'rooms'
  icon: typeof UserRound
}

export function GlobalSearchPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (view: 'people' | 'projects' | 'tasks' | 'rooms') => void }) {
  const [query, setQuery] = useState('')

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    const values: SearchResult[] = []

    if (!q) {
      return [
        { id: 'cmd-people', title: 'Search people', subtitle: 'Find teammates by role, project, skill or location', category: 'People', view: 'people', icon: UserRound },
        { id: 'cmd-projects', title: 'Search projects', subtitle: 'Browse active product work and delivery status', category: 'Projects', view: 'projects', icon: BriefcaseBusiness },
        { id: 'cmd-rooms', title: 'Open conference rooms', subtitle: 'Join a live room or start a new workspace session', category: 'Rooms', view: 'rooms', icon: Video },
        { id: 'cmd-tasks', title: 'Find tasks', subtitle: 'Jump directly into execution work', category: 'Tasks', view: 'tasks', icon: Check },
      ]
    }

    people.forEach((person) => {
      const haystack = person.name + ' ' + person.role + ' ' + person.team + ' ' + person.projects.join(' ') + ' ' + person.skills.join(' ')
      if (haystack.toLowerCase().includes(q)) values.push({ id: person.id, title: person.name, subtitle: person.role + ' · ' + person.team, category: 'People', view: 'people', icon: UserRound })
    })
    projects.forEach((project) => {
      const haystack = project.name + ' ' + project.description + ' ' + project.stack.join(' ')
      if (haystack.toLowerCase().includes(q)) values.push({ id: project.id, title: project.name, subtitle: project.status + ' · ' + project.progress + '% delivery', category: 'Projects', view: 'projects', icon: BriefcaseBusiness })
    })
    initialTasks.forEach((task: Task) => {
      const haystack = task.title + ' ' + task.project + ' ' + task.assignee + ' ' + task.priority
      if (haystack.toLowerCase().includes(q)) values.push({ id: task.id, title: task.title, subtitle: task.project + ' · ' + task.status, category: 'Tasks', view: 'tasks', icon: Check })
    })
    initialRooms.forEach((room) => {
      const haystack = room.name + ' ' + room.project + ' ' + room.host + ' ' + room.status
      if (haystack.toLowerCase().includes(q)) values.push({ id: room.id, title: room.name, subtitle: room.status + ' · ' + room.project, category: 'Rooms', view: 'rooms', icon: Video })
    })

    return values.slice(0, 12)
  }, [query])

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="global-search" onMouseDown={(event) => event.stopPropagation()}>
        <div className="global-search-head">
          <Search size={17} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, projects, tasks or rooms…" />
          <kbd>esc</kbd>
          <button onClick={onClose} aria-label="Close search"><X size={16} /></button>
        </div>
        <div className="global-search-meta"><span>{query ? results.length + ' results' : 'Workspace search'}</span><span>⌘ K anywhere</span></div>
        <div className="global-search-results">
          {results.map((result) => {
            const Icon = result.icon
            return <button className="global-search-result" key={result.id} onClick={() => { onNavigate(result.view); onClose() }}>
              <span className="global-search-icon"><Icon size={15} /></span>
              <span><strong>{result.title}</strong><small>{result.subtitle}</small></span>
              <em>{result.category}</em>
              <ChevronRight size={14} />
            </button>
          })}
          {query && results.length === 0 ? <div className="global-search-empty"><Search size={18} /><strong>No matches</strong><span>Try another person, project, task or room.</span></div> : null}
        </div>
        <div className="global-search-footer"><span><kbd>↵</kbd> open result</span><span><kbd>esc</kbd> close</span><span>Searches the entire workspace</span></div>
      </div>
    </div>
  )
}

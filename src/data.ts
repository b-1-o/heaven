export type ProjectStatus = 'Active' | 'Review' | 'Paused'
export type TaskStatus = 'Backlog' | 'In Progress' | 'Review' | 'Done'
export type Priority = 'Low' | 'Medium' | 'High'

export type Project = {
  id: string
  name: string
  description: string
  status: ProjectStatus
  tasks: number
  progress: number
  updated: string
  stack: string[]
}

export type Task = {
  id: string
  title: string
  project: string
  status: TaskStatus
  priority: Priority
  assignee: string
  updated: string
}

export const projects: Project[] = [
  { id: 'prj-01', name: 'Nebula Core', description: 'Real-time edge orchestration layer.', status: 'Active', tasks: 42, progress: 78, updated: '2m ago', stack: ['React', 'Node', 'Postgres'] },
  { id: 'prj-02', name: 'Atlas Mobile', description: 'Native-feeling client platform for field teams.', status: 'Review', tasks: 26, progress: 91, updated: '18m ago', stack: ['React', 'TypeScript', 'PWA'] },
  { id: 'prj-03', name: 'Glass Engine', description: 'Design system and motion primitives.', status: 'Active', tasks: 31, progress: 64, updated: '1h ago', stack: ['CSS', 'Motion', 'Storybook'] },
  { id: 'prj-04', name: 'Signal API', description: 'Unified API gateway and observability surface.', status: 'Paused', tasks: 18, progress: 47, updated: '3h ago', stack: ['API', 'Redis', 'SQL'] },
]

export const initialTasks: Task[] = [
  { id: 'task-01', title: 'Stream deployment events', project: 'Nebula Core', status: 'In Progress', priority: 'High', assignee: 'ER', updated: '4m ago' },
  { id: 'task-02', title: 'Refine mobile navigation', project: 'Atlas Mobile', status: 'Review', priority: 'High', assignee: 'MK', updated: '14m ago' },
  { id: 'task-03', title: 'Tokenize glass surfaces', project: 'Glass Engine', status: 'Done', priority: 'Medium', assignee: 'ER', updated: '32m ago' },
  { id: 'task-04', title: 'Reduce hydration work', project: 'Nebula Core', status: 'Backlog', priority: 'High', assignee: 'JS', updated: '1h ago' },
  { id: 'task-05', title: 'Add deployment rollback', project: 'Signal API', status: 'In Progress', priority: 'Medium', assignee: 'ER', updated: '2h ago' },
  { id: 'task-06', title: 'Audit keyboard focus', project: 'Glass Engine', status: 'Done', priority: 'Low', assignee: 'AL', updated: '3h ago' },
]

export const activity = [
  { icon: 'deploy', text: 'Production deployment completed', meta: 'Nebula Core · 2m ago' },
  { icon: 'check', text: 'Erik moved “Tokenize glass surfaces” to Done', meta: 'Glass Engine · 32m ago' },
  { icon: 'user', text: 'Mika joined the workspace', meta: 'Team · 48m ago' },
  { icon: 'bolt', text: 'Realtime channel connected', meta: 'Signal API · 1h ago' },
  { icon: 'settings', text: 'Performance budget updated', meta: 'Workspace · 2h ago' },
]

export const chartSeries = [42, 51, 46, 68, 63, 76, 72, 85, 79, 94, 88, 98, 91, 105, 101, 114, 108, 118]

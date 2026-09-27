import { useSyncExternalStore } from 'react'
import { initialTasks, type Task, type TaskStatus } from '../data'

const STORAGE_KEY = 'heaven.tasks.v1'
const CHANNEL_NAME = 'heaven.realtime.v1'

let tasks = loadTasks()
const listeners = new Set<() => void>()
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return initialTasks
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialTasks
    const parsed = JSON.parse(raw) as Task[]
    return Array.isArray(parsed) ? parsed : initialTasks
  } catch {
    return initialTasks
  }
}

function publish() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  channel?.postMessage(tasks)
  listeners.forEach((listener) => listener())
}

channel?.addEventListener('message', (event) => {
  if (Array.isArray(event.data)) {
    tasks = event.data as Task[]
    listeners.forEach((listener) => listener())
  }
})

export function updateTaskStatus(id: string, status: TaskStatus) {
  tasks = tasks.map((task) => task.id === id ? { ...task, status, updated: 'now' } : task)
  publish()
}

export function resetTasks() {
  tasks = initialTasks
  publish()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return tasks
}

export function useTasks() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialTasks)
}

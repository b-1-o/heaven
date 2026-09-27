export type ApiResult<T> = {
  data: T
  source: 'remote' | 'local'
}

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')

function authHeaders() {
  const token = window.localStorage.getItem('heaven.auth.token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  if (!baseUrl) {
    throw new Error('Remote API is not configured. Set VITE_API_URL to enable the HEAVEN API.')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`)
  }

  return { data: await response.json() as T, source: 'remote' }
}

export const api = {
  isConfigured: () => Boolean(baseUrl),
  signIn: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>('/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; name: string; email: string }>('/auth/me'),
  tasks: () => request<import('../data').Task[]>('/tasks'),
  updateTask: (id: string, status: import('../data').TaskStatus) =>
    request<import('../data').Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

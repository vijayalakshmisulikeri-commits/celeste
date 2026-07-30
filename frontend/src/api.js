// api.js
// ------
// Every network call to the backend goes through this one file.
// Centralizing it means: one place to attach the auth token, one place
// to handle errors consistently, and every component just calls a
// plain JS function instead of repeating fetch() boilerplate everywhere.

// In production, set VITE_API_URL to your deployed backend's URL
// (Vite exposes env vars prefixed with VITE_ to the browser).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('celeste_token')
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null // no-content responses (e.g. delete)

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // FastAPI puts error messages in a `detail` field -- surface that
    // to the UI instead of a generic "something went wrong".
    const message = data?.detail || `Request failed (${res.status})`
    throw new Error(message)
  }

  return data
}

export const api = {
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: { name, email, password }, auth: false }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  me: () => request('/auth/me'),

  updateMe: (payload) => request('/auth/me', { method: 'PATCH', body: payload }),

  listTasks: (includeArchived = false) =>
    request(`/tasks?include_archived=${includeArchived}`),

  createTask: (payload) => request('/tasks', { method: 'POST', body: payload }),

  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: payload }),

  completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'POST' }),

  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  addSubtask: (taskId, title) =>
    request(`/tasks/${taskId}/subtasks`, { method: 'POST', body: { title } }),

  toggleSubtask: (taskId, subtaskId, done) =>
    request(`/tasks/${taskId}/subtasks/${subtaskId}?done=${done}`, { method: 'PATCH' }),

  deleteSubtask: (taskId, subtaskId) =>
    request(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' }),
}

export function saveToken(token) {
  localStorage.setItem('celeste_token', token)
}

export function clearToken() {
  localStorage.removeItem('celeste_token')
}

export function hasToken() {
  return Boolean(getToken())
}

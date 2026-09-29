// Shared Server-Sent Events streaming helper used by the live sync progress
// UIs. EventSource can't send the Authorization header, so we stream with
// fetch + a ReadableStream and parse `data: <json>` blocks by hand.
import apiClient from './client'

const API_BASE = apiClient.defaults.baseURL

// Pull a `data: <json>` payload out of one SSE block (ignores comments/pings).
export function parseSseBlock(block) {
  const dataLines = block
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
  if (!dataLines.length) return null
  try {
    return JSON.parse(dataLines.join('\n'))
  } catch {
    return null
  }
}

// Streams events from a relative API path. Calls onEvent(payload) per event and
// resolves when the connection closes. In demo/offline mode (localStorage
// shows the demo token) it resolves immediately returning `true` — callers
// should synthesize an idle { status: 'none' } event themselves.
export async function streamSse(path, { onEvent, signal } = {}) {
  const token = localStorage.getItem('opal_token')
  if (token === 'demo-token-opal-line') return true

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`Progress stream failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const payload = parseSseBlock(block)
      if (payload) onEvent?.(payload)
    }
  }
  return false
}
const BASE = process.env.WHORL_URL || 'http://localhost:3001'

export async function api(method: string, path: string, body?: Record<string, unknown>): Promise<void> {
  const url = `${BASE}${path}`
  const headers: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {}

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()

  // export csv is raw text, not JSON — output as-is
  if (path === '/api/export/csv') {
    process.stdout.write(text)
  } else {
    process.stdout.write(text + '\n')
  }

  if (!res.ok) process.exit(1)
}

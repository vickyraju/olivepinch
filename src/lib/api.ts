const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  // The login session is a cookie sent automatically (credentials: "include"). Explicit headers are for the
  // pre-auth signup token, used before any session exists.
  const headers: Record<string, string> = { "Content-Type": "application/json", ...opts.headers }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    credentials: "include",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : undefined

  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `Request failed with status ${res.status}`)
  }
  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: "POST", body, headers }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: "PATCH", body, headers }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}

/** For endpoints that need the auth header but return a non-JSON attachment (e.g. GDPR export). */
export async function fetchWithAuth(path: string): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" })
  if (!res.ok) throw new ApiError(res.status, `Request failed with status ${res.status}`)
  return res
}

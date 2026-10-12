export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/admin"
const TOKEN_KEY = "olivepinch_admin_token"

// One reason a request body was rejected: which field, and why.
export interface ApiIssue {
  path: (string | number)[]
  message: string
}

export class ApiError extends Error {
  status: number
  details?: ApiIssue[]
  // Plain-language reasons a request was refused (one per problem), when the server lists them.
  problems?: string[]
  constructor(status: number, message: string, details?: ApiIssue[], problems?: string[]) {
    super(message)
    this.details = details
    this.problems = problems
    this.name = "ApiError"
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : undefined

  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `Request failed with status ${res.status}`, Array.isArray(json?.details) ? json.details : undefined, Array.isArray(json?.problems) ? json.problems : undefined)
  }
  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}

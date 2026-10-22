/**
 * Where the restaurant's server lives.
 *
 * The default is same-origin: Express serves the built site and the API from one host, so a
 * relative '/api/...' call needs no CORS at all and the session cookie travels by itself.
 * `VITE_API_ORIGIN` exists only for the split layout — the site on one host, the API on
 * another — and setting it at build time is what makes each call name that origin and carry
 * credentials explicitly, which is what a credentialed cross-origin request requires.
 *
 * Nothing here holds a key. The session is an HttpOnly cookie the browser attaches; a value
 * compiled into the bundle would be readable by anybody who views source.
 */
const origin = String(import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/+$/, '')

/** True when the site and the API are on different hosts. */
export const SPLIT_ORIGIN = origin.length > 0

export function apiUrl(path: string): string {
  return `${origin}${path}`
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), { ...init, credentials: SPLIT_ORIGIN ? 'include' : 'same-origin' })
}

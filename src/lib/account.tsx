import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiUrl, apiFetch } from './api'
import type { Booking } from './bookings'

/**
 * The signed-in customer, held once for the whole app.
 *
 * There is no token in this code: the session is an HttpOnly cookie the browser
 * sends by itself, so a script here cannot read or leak it. Every call below goes to
 * the restaurant's own server — the account, the profile and the ticket history are
 * whatever the database says they are.
 */

export type Account = {
  id: number
  email: string
  name: string
  phone: string
  avatar: string
  created_at: string
}

export type AccountReply = {
  ok: boolean
  status: number
  user?: Account
  /** Field-level messages, so the form can put each one under its own input. */
  fields?: Record<string, string>
  hint?: string
}

export type History = {
  bookings: Booking[]
  /** 'idle' before the first call, so the page can tell "loading" from "empty". */
  state: 'idle' | 'loading' | 'ready' | 'error'
}

type AccountValue = {
  user: Account | null
  /** False until the first /auth/me answer, so the header does not flash "Sign in". */
  known: boolean
  signIn: (email: string, password: string) => Promise<AccountReply>
  signUp: (input: { email: string; name: string; phone?: string; password: string }) => Promise<AccountReply>
  signOut: () => Promise<void>
  saveProfile: (patch: { name?: string; phone?: string }) => Promise<AccountReply>
  uploadPhoto: (dataUrl: string) => Promise<AccountReply>
  removePhoto: () => Promise<AccountReply>
  history: History
  loadHistory: () => Promise<void>
}

const AccountContext = createContext<AccountValue | null>(null)

async function post(path: string, body?: unknown): Promise<AccountReply> {
  let response: Response
  try {
    response = await apiFetch(path, {
      method: 'POST',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return { ok: false, status: 0, hint: 'The restaurant server could not be reached.' }
  }
  const payload = (await response.json().catch(() => null)) as { user?: Account; fields?: Record<string, string>; hint?: string } | null
  return {
    ok: response.ok,
    status: response.status,
    user: payload?.user ?? undefined,
    fields: payload?.fields,
    hint: payload?.hint,
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null)
  const [known, setKnown] = useState(false)
  const [history, setHistory] = useState<History>({ bookings: [], state: 'idle' })

  useEffect(() => {
    let cancelled = false
    async function read() {
      try {
        const response = await apiFetch('/api/auth/me')
        const body = (await response.json()) as { user?: Account | null }
        if (!cancelled) setUser(body.user ?? null)
      } catch {
        /* offline: stay signed out, the forms will report the failure */
      } finally {
        if (!cancelled) setKnown(true)
      }
    }
    void read()
    return () => {
      cancelled = true
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistory((current) => ({ ...current, state: 'loading' }))
    try {
      const response = await apiFetch('/api/bookings/mine')
      if (!response.ok) {
        setHistory({ bookings: [], state: 'error' })
        return
      }
      const body = (await response.json()) as { bookings?: Booking[] }
      setHistory({ bookings: body.bookings ?? [], state: 'ready' })
    } catch {
      setHistory({ bookings: [], state: 'error' })
    }
  }, [])

  // History belongs to the session, so it is dropped the moment the session is.
  useEffect(() => {
    if (!user) setHistory({ bookings: [], state: 'idle' })
  }, [user])

  const value = useMemo<AccountValue>(
    () => ({
      user,
      known,
      history,
      loadHistory,
      async signIn(email, password) {
        const reply = await post('/api/auth/login', { email, password })
        if (reply.ok && reply.user) setUser(reply.user)
        return reply
      },
      async signUp(input) {
        const reply = await post('/api/auth/signup', input)
        if (reply.ok && reply.user) setUser(reply.user)
        return reply
      },
      async signOut() {
        await post('/api/auth/logout')
        setUser(null)
      },
      async saveProfile(patch) {
        const reply = await request('/api/profile', 'PATCH', patch)
        if (reply.ok && reply.user) setUser(reply.user)
        return reply
      },
      async uploadPhoto(dataUrl) {
        const reply = await post('/api/profile/photo', { dataUrl })
        if (reply.ok && reply.user) setUser(reply.user)
        return reply
      },
      async removePhoto() {
        const reply = await request('/api/profile/photo', 'DELETE')
        if (reply.ok && reply.user) setUser(reply.user)
        return reply
      },
    }),
    [user, known, history, loadHistory],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error('useAccount has to be used inside AccountProvider')
  return value
}

/** PATCH and DELETE need a verb post() does not cover. */
export async function request(
  path: string,
  method: 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<AccountReply> {
  let response: Response
  try {
    response = await apiFetch(path, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return { ok: false, status: 0, hint: 'The restaurant server could not be reached.' }
  }
  const payload = (await response.json().catch(() => null)) as { user?: Account; fields?: Record<string, string>; hint?: string } | null
  return { ok: response.ok, status: response.status, user: payload?.user, fields: payload?.fields, hint: payload?.hint }
}

/**
 * The picture only ever comes from the session's own account, so the file name is a
 * cache-buster, not an address: the server ignores it when deciding what to send.
 */
export function photoUrl(user: Account | null): string | null {
  return user?.avatar ? apiUrl(`/api/profile/photo?v=${encodeURIComponent(user.avatar)}`) : null
}

export async function fetchTicket(ref: string): Promise<{ status: number; booking: Booking | null }> {
  try {
    const response = await apiFetch(`/api/tickets/${encodeURIComponent(ref)}`)
    const body = (await response.json().catch(() => null)) as { booking?: Booking } | null
    return { status: response.status, booking: body?.booking ?? null }
  } catch {
    return { status: 0, booking: null }
  }
}

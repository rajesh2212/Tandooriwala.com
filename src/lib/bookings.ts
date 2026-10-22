/**
 * The booking and account API.
 *
 * Everything the customer sees about the room — layout, seating times, which chairs
 * are held, their own tickets — is read from the restaurant's own server. Nothing in
 * this file assumes a value locally, and nothing here holds a credential: the session
 * lives in an HttpOnly cookie the browser attaches on its own.
 */

import { apiFetch } from './api'

export type FloorArea = {
  id: string
  label: string
  /** 'open' is a part of the room you can walk through, 'service' a counter, 'room' a closed room. */
  kind: 'open' | 'service' | 'room'
  x: number
  y: number
  w: number
  h: number
}

export type FloorTable = {
  id: string
  shape: 'round' | 'rect'
  seats: number
  /** Table centre in room units; the room is scaled into the map by the client. */
  x: number
  y: number
  r?: number
  w?: number
  h?: number
}

export type FloorPlan = {
  room: { width: number; height: number }
  areas: FloorArea[]
  tables: FloorTable[]
}

/**
 * The private dining room books by couple, not by chair. `bookable` is the pair of
 * chairs that faces across one table and holds the couple; `extra` chairs are drawn
 * for scale but cannot be reserved, so they cannot raise the room's limit.
 */
export type CoupleSeat = {
  id: string
  table: string
  guests: number
  bookable: string[]
  extra: string[]
}

export type DiningRoom = {
  room: { width: number; height: number }
  areas: FloorArea[]
  tables: FloorTable[]
  couples: CoupleSeat[]
  limit: { couples: number; perTable: number }
}

export type Availability = {
  date: string
  /** Echoes the slot asked for, or null when only the room was requested. */
  slot: string | null
  slots: string[]
  /** The restaurant's own calendar day, so a phone in another country defaults to the
   *  same evening as one in Bhadrak instead of to whichever date it happens to be there. */
  today: string
  timezone: string
  floorPlan: FloorPlan
  diningRoom: DiningRoom
  /** Main-hall chairs another customer already holds for this seating. */
  taken: string[]
  /** Couple slots already held in the private dining room. */
  takenCouples: string[]
  /** Seatings the restaurant's clock has already run past for this date. */
  passed: string[]
}

export type BookingStatus = 'active' | 'cancelled'

export type Booking = {
  id: number
  ref: string
  booked_for: string
  slot: string
  name: string
  phone: string
  party_size: number
  note: string
  status: BookingStatus
  user_id: number | null
  created_at: string
  chairs: string[]
}

export type TicketErrors = Partial<
  Record<'date' | 'slot' | 'seats' | 'name' | 'phone' | 'partySize' | 'party_size' | 'photo', string>
>

export type BookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'rejected'; fields: TicketErrors }
  /** Someone else took a seat we were holding. `seats` names them. */
  | { ok: false; reason: 'conflict'; seats: string[] }
  | { ok: false; reason: 'rate-limited' }
  | { ok: false; reason: 'unreachable' }

export type BookingPayload = {
  date: string
  slot: string
  seats: string[]
  name: string
  phone: string
  partySize: number
  note?: string
  /** Honeypot. Humans never see it, bots fill it in. */
  company?: string
}

export type Room = 'hall' | 'private'

/** A booking attempt is in one room or the other; the server refuses a mix. */
export function roomOf(seats: string[]): Room {
  return seats.some((seat) => seat.startsWith('P')) ? 'private' : 'hall'
}

function number(chair: string) {
  const [, index] = chair.split('-')
  return Number(index)
}

/**
 * How a set of seats reads on a ticket: "Table A1, chairs 1 and 2" rather than a
 * list of internal ids. Couple slots become their own sentence because they are a
 * table, not a chair.
 */
export function describeSeats(chairs: string[]): string {
  if (!chairs.length) return 'No seats recorded'
  const hall = chairs.filter((chair) => chair.includes('-'))
  const couples = chairs.filter((chair) => !chair.includes('-'))
  const parts: string[] = []

  const byTable = new Map<string, string[]>()
  for (const chair of hall) {
    const [table] = chair.split('-')
    byTable.set(table, [...(byTable.get(table) ?? []), chair])
  }
  for (const [table, seats] of [...byTable.entries()].sort()) {
    const list = seats.sort((a, b) => number(a) - number(b)).map((seat) => number(seat))
    parts.push(`Table ${table}, ${list.length === 1 ? 'chair' : 'chairs'} ${list.join(' and ')}`)
  }
  if (couples.length === 1) parts.push(`Private dining room, table ${couples[0]} — one couple`)
  else if (couples.length > 1)
    parts.push(`Private dining room, tables ${couples.sort().join(' and ')} — ${couples.length} couples`)

  return parts.join(' · ')
}

async function json(path: string, init?: RequestInit): Promise<{ status: number; body: any } | null> {
  try {
    const response = await apiFetch(path, init)
    const body = await response.json().catch(() => null)
    return { status: response.status, body }
  } catch {
    return null
  }
}

export async function fetchAvailability(date: string, slot?: string | null): Promise<Availability | null> {
  const params = new URLSearchParams({ date })
  if (slot) params.set('slot', slot)
  const result = await json(`/api/tables?${params}`)
  return result && result.status === 200 ? (result.body as Availability) : null
}

export async function createBooking(payload: BookingPayload): Promise<BookingResult> {
  const result = await json('/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result) return { ok: false, reason: 'unreachable' }
  if (result.status === 201 && result.body?.booking) return { ok: true, booking: result.body.booking as Booking }
  if (result.status === 409) return { ok: false, reason: 'conflict', seats: (result.body?.seats as string[]) ?? [] }
  if (result.status === 429) return { ok: false, reason: 'rate-limited' }
  if (result.body?.fields) return { ok: false, reason: 'rejected', fields: result.body.fields as TicketErrors }
  return { ok: false, reason: 'unreachable' }
}

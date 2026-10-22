/**
 * Server-side validation. The browser validates for UX; this is the boundary
 * that actually decides what reaches the database.
 */

import { areaOf, capacityOf, diningRoom, isKnownSeat } from './config.js'
import { addDays, isPast, restaurantDay } from './clock.js'

const KINDS = new Set(['table', 'preorder', 'other'])
const MAX_MESSAGE = 600
const MAX_NAME = 80
const MAX_PARTY = 60
const MAX_NOTE = 300
const FUTURE_LIMIT_DAYS = 366
const MAX_EMAIL = 160
const MIN_PASSWORD = 8
const MAX_PASSWORD = 200
const EMAIL_SHAPE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

/** Drop control characters (keeping tab and newline) and collapse whitespace. */
function scrub(value) {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0)
    if (code === 9 || code === 10 || code === 13 || code >= 32) out += char
  }
  return out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

export function cleanText(value, max) {
  if (typeof value !== 'string') return null
  const cleaned = scrub(value)
  if (!cleaned) return null
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned
}

/** Accepts Indian mobile formats and returns +91XXXXXXXXXX, else null. */
export function normalisePhone(value) {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  const ten = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : null
  if (!ten || !/^[6-9]\d{9}$/.test(ten)) return null
  return `+91${ten}`
}

/**
 * The date a booking or enquiry may carry, checked as a calendar day in the
 * restaurant's own timezone. Comparing days rather than instants is what keeps the
 * window identical for a customer on another continent and the answer never depends
 * on where the server happens to sit.
 */
export function validDate(value, at = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  if (Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return null
  const today = restaurantDay(at)
  // One day of slack at the front: a customer mid-way through an evening in Bhadrak
  // can be a day behind the restaurant's date and still be booking for tonight.
  if (value < addDays(today, -1) || value > addDays(today, FUTURE_LIMIT_DAYS)) return null
  return value
}

export function validTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  return value
}

export function validParty(value) {
  const size = Number(value)
  if (!Number.isInteger(size) || size < 1 || size > MAX_PARTY) return null
  return size
}

/**
 * The restaurant's clock decides what "already gone" is, so neither a browser clock in
 * another country nor a server set to UTC can offer a seating the kitchen has closed.
 */
export function slotHasPassed(date, slot) {
  return isPast(date, slot)
}

/**
 * @returns {{ ok: true, enquiry: object } | { ok: false, errors: Record<string,string> }}
 */
export function validateEnquiry(body) {
  const errors = {}
  if (!body || typeof body !== 'object') return { ok: false, errors: { form: 'Send the form as JSON.' } }

  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : null
  if (!kind) errors.kind = 'Choose what the message is about.'

  const name = cleanText(body.name, MAX_NAME)
  if (!name || name.length < 2) errors.name = 'Tell us who to ask for.'

  const phone = normalisePhone(body.phone)
  if (!phone) errors.phone = 'Enter a 10-digit Indian mobile number.'

  const message = cleanText(body.message, MAX_MESSAGE) ?? ''

  const enquiry = {
    kind,
    name,
    phone,
    message,
    visitDate: body.date ? validDate(String(body.date)) : null,
    visitTime: body.time ? validTime(String(body.time)) : null,
    partySize: body.party ? validParty(body.party) : null,
  }

  if (kind === 'table') {
    if (!enquiry.visitDate) errors.date = 'Pick the date you want to eat.'
    if (!enquiry.partySize) errors.party = 'How many seats?'
  }
  if (body.date && !enquiry.visitDate) errors.date = 'That date is not one we can hold.'
  if (body.time && !enquiry.visitTime) errors.time = 'Use a 24-hour time like 20:30.'
  if (body.party && !enquiry.partySize) errors.party = `Between 1 and ${MAX_PARTY} guests.`

  if (errors.kind || errors.name || errors.phone || errors.date || errors.time || errors.party) {
    return { ok: false, errors }
  }
  return { ok: true, enquiry }
}

/**
 * Reservation validation. `slots` comes from server/config.js, and so does the seat
 * list, so a customer cannot book a time the restaurant has not set up or a seat
 * that does not exist in the room. The private dining room's couple limit is decided
 * here too — the extra chairs drawn around those tables are not bookable ids, so
 * they cannot raise the room's capacity from the client.
 *
 * @returns {{ ok: true, booking: object, seats: string[] } | { ok: false, errors: Record<string,string> }}
 */
export function validateBooking(body, { slots }) {
  const errors = {}
  if (!body || typeof body !== 'object') return { ok: false, errors: { form: 'Send the booking as JSON.' } }

  const date = body.date ? validDate(String(body.date)) : null
  if (!body.date) errors.date = 'Pick the day you want to eat.'
  else if (!date) errors.date = 'That date is not one we can hold.'

  const slot = typeof body.slot === 'string' && slots.includes(body.slot) ? body.slot : null
  if (!body.slot) errors.slot = 'Pick a seating time.'
  else if (!slot) errors.slot = 'That time is not one we open for bookings.'
  else if (date && slotHasPassed(date, slot)) errors.slot = 'That seating has already gone today. Pick a later time or another day.'

  const raw = Array.isArray(body.seats) ? body.seats : []
  const seats = [...new Set(raw.map((seat) => (typeof seat === 'string' ? seat.trim() : '')))].filter(Boolean)
  if (!raw.length) errors.seats = 'Choose at least one chair.'
  else if (seats.some((seat) => !isKnownSeat(seat))) errors.seats = 'One of those seats is not in our room.'
  else {
    const area = areaOf(seats[0])
    if (seats.some((seat) => areaOf(seat) !== area)) {
      errors.seats = 'The main hall and the private dining room cannot share one booking.'
    } else if (area === 'private' && seats.length > diningRoom.limit.couples) {
      errors.seats = `The private dining room holds ${diningRoom.limit.couples} couples in a seating, one per table.`
    }
  }

  const name = cleanText(body.name, MAX_NAME)
  if (!name || name.length < 2) errors.name = 'Tell us who the table is for.'

  const phone = normalisePhone(body.phone)
  if (!phone) errors.phone = 'Enter a 10-digit Indian mobile number.'

  const capacity = capacityOf(seats)
  const privateRoom = seats.length > 0 && areaOf(seats[0]) === 'private'
  const partySize = validParty(body.partySize)
  if (partySize === null) errors.partySize = `Between 1 and ${MAX_PARTY} guests.`
  else if (capacity && partySize > capacity) errors.partySize = 'You cannot seat more guests than the chairs you picked.'
  else if (privateRoom && capacity && partySize !== capacity)
    errors.partySize = 'In the private dining room a couple is two guests — one couple per table.'

  const note = cleanText(body.note, MAX_NOTE) ?? ''

  if (Object.keys(errors).length) return { ok: false, errors }

  return {
    ok: true,
    booking: { date, slot, name, phone, partySize, note },
    seats: seats.sort(),
  }
}

/** Normalised lowercase address, or null. */
export function validEmail(value) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase().slice(0, MAX_EMAIL)
  return EMAIL_SHAPE.test(email) && !email.includes('..') ? email : null
}

/**
 * A password is the only credential this site asks for, so the rules are stated once
 * here and mirrored in the form: 8-200 characters, at least one letter and one digit.
 */
export function checkPassword(value) {
  if (typeof value !== 'string' || !value) return 'Choose a password.'
  if (value.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (value.length > MAX_PASSWORD) return `Keep the password under ${MAX_PASSWORD} characters.`
  if (!/[a-z]/i.test(value)) return 'Include at least one letter.'
  if (!/\d/.test(value)) return 'Include at least one number.'
  return null
}

/**
 * @returns {{ ok: true, account: {email,name,phone,password} } | { ok: false, errors: Record<string,string> }}
 */
export function validateSignUp(body) {
  const errors = {}
  if (!body || typeof body !== 'object') return { ok: false, errors: { form: 'Send the form as JSON.' } }

  const email = validEmail(body.email)
  if (!body.email) errors.email = 'We need an email to sign you in.'
  else if (!email) errors.email = 'That does not look like an email address.'

  const name = cleanText(body.name, MAX_NAME)
  if (!name || name.length < 2) errors.name = 'Tell us who the account is for.'

  const phone = body.phone ? normalisePhone(body.phone) : null
  if (body.phone && !phone) errors.phone = 'Enter a 10-digit Indian mobile number.'

  const passwordError = checkPassword(body.password)
  if (passwordError) errors.password = passwordError

  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, account: { email, name, phone: phone || '', password: String(body.password) } }
}

export function validateSignIn(body) {
  const errors = {}
  const email = validEmail(body?.email)
  if (!email) errors.email = 'Enter the email you signed up with.'
  if (typeof body?.password !== 'string' || !body.password) errors.password = 'Enter your password.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, email, password: body.password }
}

/** Both profile fields are optional in a PATCH; whatever arrives must still be valid. */
export function validateProfileEdit(body) {
  const errors = {}
  if (!body || typeof body !== 'object') return { ok: false, errors: { form: 'Send the form as JSON.' } }
  const patch = {}
  if (body.name !== undefined) {
    patch.name = cleanText(body.name, MAX_NAME)
    if (!patch.name || patch.name.length < 2) errors.name = 'A name of at least two characters.'
  }
  if (body.phone !== undefined) {
    // An empty string clears the number; anything else has to parse.
    if (typeof body.phone === 'string' && !body.phone.trim()) patch.phone = ''
    else {
      patch.phone = normalisePhone(body.phone)
      if (!patch.phone) errors.phone = 'Enter a 10-digit Indian mobile number, or leave it empty to clear it.'
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, patch }
}

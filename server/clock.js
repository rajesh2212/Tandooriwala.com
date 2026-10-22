/**
 * The restaurant's clock.
 *
 * A seating time is a wall-clock hour in Bhadrak, not an hour in the timezone of
 * whichever machine happens to be running, and not the hour on the customer's phone.
 * Every decision about "today", "already gone" and "too far ahead" is therefore made
 * in one named timezone, so a customer booking from another country sees the same
 * room, the same open times and the same cut-offs as a customer standing outside the
 * restaurant.
 *
 * `RESTAURANT_TIMEZONE` is an IANA zone name and a setup value the owner can change.
 * A Node build without timezone data (small-icu) cannot answer for it, so the fixed
 * `RESTAURANT_UTC_OFFSET` is the documented fallback; India has no DST, so a constant
 * offset is exact there.
 */

export const restaurantTimezone = process.env.RESTAURANT_TIMEZONE || 'Asia/Kolkata'

/** '+05:30' or '-08:00' -> minutes ahead of UTC. */
function parseOffset(value) {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(String(value).trim())
  if (!match) return 330
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

const FALLBACK_OFFSET_MINUTES = parseOffset(process.env.RESTAURANT_UTC_OFFSET || '+05:30')

let zone = null
function zoneFormatter() {
  if (zone === null) {
    try {
      zone = new Intl.DateTimeFormat('en-US', {
        timeZone: restaurantTimezone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      // small-icu: no zone data on this platform, so use the configured offset.
      zone = false
    }
  }
  return zone || null
}

const pad = (value, width = 2) => String(value).padStart(width, '0')

/**
 * Minutes the restaurant's clock sits ahead of UTC at this instant. Read from the
 * zone itself when the platform knows it, so a zone that observes DST stays exact.
 */
function offsetMinutes(at) {
  const formatter = zoneFormatter()
  if (!formatter) return FALLBACK_OFFSET_MINUTES
  const parts = {}
  for (const { type, value } of formatter.formatToParts(at)) parts[type] = value
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000)
}

/** The restaurant's own calendar day for an instant: 'YYYY-MM-DD'. */
export function restaurantDay(at = new Date()) {
  const shifted = new Date(at.getTime() + offsetMinutes(at) * 60_000)
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** Whole days from a calendar day, with no timezone or DST drift in the arithmetic. */
export function addDays(iso, days) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * The instant a wall-clock time in the restaurant happens, as UTC milliseconds.
 *
 * The offset is probed twice so a zone that changes its offset across the boundary
 * still lands on the right instant; the second probe is what makes this DST-safe.
 */
function zonedMs(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) {
    return Number.NaN
  }
  const wall = Date.parse(`${date}T${time}:00Z`)
  const first = wall - offsetMinutes(new Date(wall)) * 60_000
  return wall - offsetMinutes(new Date(first)) * 60_000
}

/** Has this date and seating time already gone by in the restaurant? */
export function isPast(date, time, at = Date.now()) {
  const opensAt = zonedMs(date, time)
  return Number.isFinite(opensAt) && opensAt < at
}

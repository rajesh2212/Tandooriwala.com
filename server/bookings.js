import { db } from './db.js'

/**
 * Reservations. The tables themselves come from server/migrate.js; this file only
 * speaks SQL against them.
 *
 * Integrity rests on booking_seats' composite primary key (booked_for, slot,
 * chair): one row per chair per seating, enforced by SQLite itself. A booking is
 * written inside BEGIN IMMEDIATE, which takes the write lock before the
 * availability re-check, so two customers submitting the same seat at the same
 * moment cannot both succeed.
 *
 * `chair` holds either a main-hall chair ('A1-2') or a private-room couple slot
 * ('P1'), which is why the same key also caps the room at one couple per table.
 */

const takenStatement = db.prepare('SELECT 1 FROM booking_seats WHERE booked_for = ? AND slot = ? AND chair = ?')

const takenListStatement = db.prepare(`
  SELECT s.chair AS chair
  FROM booking_seats s
  JOIN bookings b ON b.id = s.booking_id
  WHERE s.booked_for = ? AND s.slot = ? AND b.status = 'active'
  ORDER BY s.chair
`)

const insertBookingStatement = db.prepare(`
  INSERT INTO bookings (ref, booked_for, slot, name, phone, party_size, note, user_id, created_at)
  VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?)
`)

const setRefStatement = db.prepare('UPDATE bookings SET ref = ? WHERE id = ?')

const insertSeatStatement = db.prepare('INSERT INTO booking_seats (booking_id, booked_for, slot, chair) VALUES (?, ?, ?, ?)')

const listBookingsStatement = db.prepare(`
  SELECT b.id, b.ref, b.booked_for, b.slot, b.name, b.phone, b.party_size, b.note, b.status, b.created_at,
         group_concat(s.chair, ',') AS chairs
  FROM bookings b
  LEFT JOIN booking_seats s ON s.booking_id = b.id
  GROUP BY b.id
  ORDER BY b.booked_for DESC, b.slot ASC, b.id DESC
  LIMIT ?
`)

/** Only ever filtered by the account id taken from the session, never from the client. */
const myBookingsStatement = db.prepare(`
  SELECT b.id, b.ref, b.booked_for, b.slot, b.name, b.phone, b.party_size, b.note, b.status, b.created_at,
         group_concat(s.chair, ',') AS chairs
  FROM bookings b
  LEFT JOIN booking_seats s ON s.booking_id = b.id
  WHERE b.user_id = ?
  GROUP BY b.id
  ORDER BY b.booked_for DESC, b.slot ASC, b.id DESC
  LIMIT ?
`)

const bookingByIdStatement = db.prepare(
  'SELECT id, ref, booked_for, slot, name, phone, party_size, note, status, user_id, created_at FROM bookings WHERE id = ?',
)

const bookingByRefStatement = db.prepare(
  'SELECT id, ref, booked_for, slot, name, phone, party_size, note, status, user_id, created_at FROM bookings WHERE ref = ?',
)

const seatsOfStatement = db.prepare('SELECT chair FROM booking_seats WHERE booking_id = ? ORDER BY chair')

const cancelStatement = db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'active'")

const deleteSeatsStatement = db.prepare('DELETE FROM booking_seats WHERE booking_id = ?')

const countBookingsStatement = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE status = 'active'")

export function takenChairs(date, slot) {
  return takenListStatement.all(date, slot).map((row) => row.chair)
}

function isTaken(chair, date, slot) {
  return takenStatement.get(date, slot, chair) !== undefined
}

/**
 * Reserve `chairs` for one seating. Returns the taken subset when any chair is
 * already held, so the caller can tell the customer exactly which seat to
 * change rather than failing the whole request blindly.
 */
export function createBooking(booking, chairs) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const taken = chairs.filter((chair) => isTaken(chair, booking.date, booking.slot))
    if (taken.length) {
      db.exec('ROLLBACK')
      return { ok: false, taken }
    }

    const result = insertBookingStatement.run(
      booking.date,
      booking.slot,
      booking.name,
      booking.phone,
      booking.partySize,
      booking.note,
      booking.userId ?? null,
      new Date().toISOString(),
    )
    const id = Number(result.lastInsertRowid)
    const ref = `TB-${String(id).padStart(4, '0')}`
    setRefStatement.run(ref, id)
    for (const chair of chairs) insertSeatStatement.run(id, booking.date, booking.slot, chair)

    db.exec('COMMIT')
    return { ok: true, id, ref }
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      /* the transaction is already gone */
    }
    throw error
  }
}

/** Free the chairs and mark the row, so a no-show cannot block a seat forever. */
export function cancelBooking(id) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = cancelStatement.run(id)
    if (result.changes === 0) {
      db.exec('ROLLBACK')
      return false
    }
    deleteSeatsStatement.run(id)
    db.exec('COMMIT')
    return true
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      /* the transaction is already gone */
    }
    throw error
  }
}

export function getBooking(id) {
  const booking = bookingByIdStatement.get(id)
  if (!booking) return null
  return { ...booking, chairs: seatsOfStatement.all(id).map((row) => row.chair) }
}

export function getBookingByRef(ref) {
  const booking = bookingByRefStatement.get(ref)
  if (!booking) return null
  return { ...booking, chairs: seatsOfStatement.all(booking.id).map((row) => row.chair) }
}

function withChairs(row) {
  return { ...row, chairs: row.chairs ? row.chairs.split(',') : [] }
}

export function listBookings(limit) {
  return listBookingsStatement.all(limit).map(withChairs)
}

/** A customer's own tickets. `userId` must come from the verified session. */
export function listMyBookings(userId, limit = 50) {
  return myBookingsStatement.all(userId, limit).map(withChairs)
}

export function countBookings() {
  return countBookingsStatement.get().n
}

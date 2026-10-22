import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { migrate } from './migrate.js'

const file = process.env.DATA_FILE || 'data/enquiries.db'
mkdirSync(path.dirname(path.resolve(file)), { recursive: true })

export const db = new DatabaseSync(file)

// busy_timeout comes first: it is what makes the WAL pragma below wait for another
// process instead of throwing "database is locked" at boot.
db.exec('PRAGMA busy_timeout = 5000')
db.exec('PRAGMA foreign_keys = ON')

// Switching a journal to WAL needs an exclusive lock, so two processes starting on the
// same file in the same instant can collide. Retry, then give up loudly.
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
for (let attempt = 1; ; attempt += 1) {
  try {
    db.exec('PRAGMA journal_mode = WAL')
    break
  } catch (error) {
    if (attempt > 10 || !String(error?.message ?? error).includes('locked')) throw error
    sleep(50)
  }
}

const applied = migrate(db)
// stderr, because scripts/check-bookings.mjs reads JSON off a child's stdout.
if (applied.length) console.error(`schema     applied ${applied.join(', ')}`)

const insertStatement = db.prepare(`
  INSERT INTO enquiries (kind, name, phone, visit_date, visit_time, party_size, message, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const listStatement = db.prepare(`
  SELECT id, kind, name, phone, visit_date, visit_time, party_size, message, status, created_at
  FROM enquiries
  ORDER BY id DESC
  LIMIT ?
`)

const setStatusStatement = db.prepare('UPDATE enquiries SET status = ? WHERE id = ?')

export function insertEnquiry(enquiry) {
  const result = insertStatement.run(
    enquiry.kind,
    enquiry.name,
    enquiry.phone,
    enquiry.visitDate ?? null,
    enquiry.visitTime ?? null,
    enquiry.partySize ?? null,
    enquiry.message,
    new Date().toISOString(),
  )
  return Number(result.lastInsertRowid)
}

export function listEnquiries(limit) {
  return listStatement.all(limit)
}

export function setEnquiryStatus(id, status) {
  const result = setStatusStatement.run(status, id)
  return result.changes > 0
}

/** Count of rows kept, so the operator can see the store is being written. */
export function countEnquiries() {
  return db.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n
}

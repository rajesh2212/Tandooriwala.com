/**
 * Schema migrations.
 *
 * Each migration is an ordered, idempotent step recorded in `schema_migrations`, so
 * a brand-new database and one that has been running since the enquiry-only build
 * both end up in the same shape. Restart the server to apply anything missing —
 * there is no separate migrate command to forget.
 *
 * Add a step by pushing onto the end of the list. Never edit an applied step: SQLite
 * cannot roll one back.
 */

const enquiries = {
  id: '0001_enquiries',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        kind       TEXT NOT NULL CHECK (kind IN ('table', 'preorder', 'other')),
        name       TEXT NOT NULL,
        phone      TEXT NOT NULL,
        visit_date TEXT,
        visit_time TEXT,
        party_size INTEGER,
        message    TEXT NOT NULL DEFAULT '',
        status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
        created_at TEXT NOT NULL
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC)')
  },
}

const bookings = {
  id: '0002_bookings',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ref        TEXT NOT NULL DEFAULT '',
        booked_for TEXT NOT NULL,
        slot       TEXT NOT NULL,
        name       TEXT NOT NULL,
        phone      TEXT NOT NULL,
        party_size INTEGER NOT NULL,
        note       TEXT NOT NULL DEFAULT '',
        status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
        created_at TEXT NOT NULL
      )
    `)
    // One row per chair per seating: the primary key is what makes a double booking
    // impossible, so it stays whatever else changes around it.
    db.exec(`
      CREATE TABLE IF NOT EXISTS booking_seats (
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        booked_for TEXT NOT NULL,
        slot       TEXT NOT NULL,
        chair      TEXT NOT NULL,
        PRIMARY KEY (booked_for, slot, chair)
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(booked_for, slot, status)')
  },
}

const accounts = {
  id: '0003_accounts',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        phone         TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        avatar        TEXT NOT NULL DEFAULT '',
        created_at    TEXT NOT NULL
      )
    `)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)')
  },
}

const bookingOwner = {
  id: '0004_booking_owner',
  up(db) {
    const columns = db.prepare('PRAGMA table_info(bookings)').all().map((row) => row.name)
    if (!columns.includes('user_id')) {
      db.exec('ALTER TABLE bookings ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL')
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, id DESC)')
  },
}

export const migrations = [enquiries, bookings, accounts, bookingOwner]

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)
  const done = new Set(db.prepare('SELECT id FROM schema_migrations').all().map((row) => row.id))
  const record = db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')
  const applied = []
  for (const step of migrations) {
    if (done.has(step.id)) continue
    db.exec('BEGIN IMMEDIATE')
    try {
      step.up(db)
      record.run(step.id, new Date().toISOString())
      db.exec('COMMIT')
      applied.push(step.id)
    } catch (error) {
      try {
        db.exec('ROLLBACK')
      } catch {
        /* the transaction is already gone */
      }
      throw new Error(`migration ${step.id} failed: ${error.message}`)
    }
  }
  return applied
}

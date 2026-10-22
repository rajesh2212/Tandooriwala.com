import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { db } from './db.js'

/**
 * Accounts and sessions, built on node:crypto and the same SQLite file as the rest
 * of the backend — no third-party auth service, no secret in the client.
 *
 *   - passwords are scrypt-hashed with a per-user salt and compared in constant time;
 *   - the session token is 32 random bytes, sent as an HttpOnly cookie, and only its
 *     SHA-256 is stored, so a database leak cannot be replayed as a login;
 *   - the cookie is SameSite=Lax and every mutation also checks the Origin header,
 *     which is what stops a third-party page from spending somebody's session.
 */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }
export const SESSION_DAYS = 30
export const SESSION_COOKIE = 'tw_session'

function hashPassword(password) {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p })
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$')
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, salt, key] = parts
  const expected = Buffer.from(key, 'base64')
  let actual
  try {
    actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
  } catch {
    return false
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const insertUserStatement = db.prepare(
  'INSERT INTO users (email, name, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
)
const userByEmailStatement = db.prepare(
  'SELECT id, email, name, phone, password_hash, avatar, created_at FROM users WHERE email = ?',
)
const userByIdStatement = db.prepare(
  'SELECT id, email, name, phone, password_hash, avatar, created_at FROM users WHERE id = ?',
)
const updateProfileStatement = db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')
const setAvatarStatement = db.prepare('UPDATE users SET avatar = ? WHERE id = ?')
const insertSessionStatement = db.prepare(
  'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
)
const sessionRowStatement = db.prepare(`
  SELECT s.expires_at AS expiresAt, u.id, u.email, u.name, u.phone, u.avatar, u.created_at
  FROM sessions s JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ?
`)
const deleteSessionStatement = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
const deleteExpiredStatement = db.prepare('DELETE FROM sessions WHERE expires_at < ?')

/** Never hand a password hash to the caller, not even to the API layer. */
function publicUser(row) {
  if (!row) return null
  const { password_hash: _ignored, ...user } = row
  return user
}

export function findUserByEmail(email) {
  return userByEmailStatement.get(email) || null
}

export function getUser(id) {
  return userByIdStatement.get(id) || null
}

export function createUser({ email, name, phone, password }) {
  try {
    const result = insertUserStatement.run(email, name, phone, hashPassword(password), new Date().toISOString())
    return { ok: true, user: publicUser(userByIdStatement.get(Number(result.lastInsertRowid))) }
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return { ok: false, error: 'duplicate' }
    throw error
  }
}

export function checkLogin(email, password) {
  const row = findUserByEmail(email)
  // Hash even when the address is unknown so a slow answer does not reveal which
  // emails exist. The comparison result is the same either way.
  if (!verifyPassword(password, row ? row.password_hash : 'scrypt$16384$8$1$AAAA$AAAA')) return null
  return publicUser(row)
}

export function startSession(userId) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000
  insertSessionStatement.run(hashToken(token), userId, new Date().toISOString(), expiresAt)
  if (Math.random() < 0.05) deleteExpiredStatement.run(Date.now())
  return { token, expiresAt }
}

export function endSession(token) {
  deleteSessionStatement.run(hashToken(token))
}

export function getSessionUser(token) {
  if (!token) return null
  const row = sessionRowStatement.get(hashToken(token))
  if (!row) return null
  if (row.expiresAt < Date.now()) {
    deleteSessionStatement.run(hashToken(token))
    return null
  }
  const { expiresAt: _ignored, ...user } = row
  return user
}

export function updateProfile(id, { name, phone }) {
  updateProfileStatement.run(name, phone, id)
  return publicUser(userByIdStatement.get(id))
}

/** The avatar string is a filename inside the private upload folder, never a URL. */
export function setAvatar(id, avatar) {
  setAvatarStatement.run(avatar, id)
  return publicUser(userByIdStatement.get(id))
}

export function toPublic(row) {
  return publicUser(row)
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

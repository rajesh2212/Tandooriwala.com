import { randomUUID, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { bookingSlots, diningRoom, floorPlan, isCouple, isHallChair } from './config.js'
import { restaurantDay, restaurantTimezone } from './clock.js'
import {
  cancelBooking,
  countBookings,
  createBooking,
  getBooking,
  getBookingByRef,
  listBookings,
  listMyBookings,
  takenChairs,
} from './bookings.js'
import { db, countEnquiries, insertEnquiry, listEnquiries, setEnquiryStatus } from './db.js'
import {
  SESSION_COOKIE,
  checkLogin,
  createUser,
  endSession,
  getSessionUser,
  getUser,
  setAvatar,
  startSession,
  updateProfile,
} from './auth.js'
import { MAX_AVATAR_BYTES, deleteAvatar, readAvatar, saveAvatar } from './uploads.js'
import {
  slotHasPassed,
  validateBooking,
  validateEnquiry,
  validateProfileEdit,
  validateSignIn,
  validateSignUp,
  validDate,
} from './validate.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')
const assetsDir = path.join(distDir, 'assets')
const adminPage = path.join(root, 'server', 'admin.html')

const IS_PROD = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT || 8787)
const ADMIN_KEY = process.env.TANDOORIWALA_ADMIN_KEY || ''

/**
 * The public origin of the site, e.g. https://tandooriwala.example — a real host name, never
 * a localhost one. In production it is required: it decides the Secure flag on the session
 * cookie, what the Origin check accepts, and where plain-HTTP visitors get sent.
 */
const TRUSTED_ORIGIN = (process.env.TRUSTED_ORIGIN || '').replace(/\/+$/, '')
/**
 * Only for the split-hosting layout (site on one origin, this API on another). Each entry
 * is an exact origin allowed to send credentialed requests. Empty means same-origin only,
 * which is how the app runs when Express serves `dist/` itself.
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(/[\s,]+/)
  .map((value) => value.replace(/\/+$/, ''))
  .filter(Boolean)
/** 'Lax' is right for same-origin hosting; a separate frontend origin needs 'None' + HTTPS. */
const SAME_SITE = (() => {
  const requested = (process.env.COOKIE_SAME_SITE || (ALLOWED_ORIGINS.length ? 'None' : 'Lax'))
    .trim()
    .toLowerCase()
  if (requested === 'none') return 'None'
  return 'Lax'
})()
/** How many proxies sit in front of this process. Getting it wrong hands clients a forged IP. */
const TRUST_PROXY_HOPS = Math.max(0, Number(process.env.TRUST_PROXY_HOPS ?? 1))
/** HTTPS is enforced whenever the deployed origin says so — the platform's own redirect
 *  does this too, but the Secure cookie depends on it, so the app insists as well. */
const ENFORCE_HTTPS = TRUSTED_ORIGIN.startsWith('https://')
/**
 * Host names an HTTP visitor may be redirected to. Taken from TRUSTED_ORIGIN plus any split
 * frontend origins, so a forged Host header cannot point somebody at a site we do not own;
 * an unrecognised host falls back to TRUSTED_ORIGIN.
 */
const HTTPS_HOSTS = new Set(
  [TRUSTED_ORIGIN, ...ALLOWED_ORIGINS]
    .map((value) => {
      try {
        return new URL(value).host
      } catch {
        return ''
      }
    })
    .filter(Boolean),
)

const RATE_WINDOW_MS = 10 * 60 * 1000
/** Writes are capped hard; reading availability is not, because it refreshes as the date changes.
 *  `auth` is separate so a guesser gets a different ceiling from a booker, and `admin` only
 *  counts wrong keys — an operator refreshing the inbox never burns it. */
const RATE_MAX = { message: 8, write: 6, read: 90, auth: 12, upload: 24, admin: 30 }

function productionProblem() {
  if (!IS_PROD) return null
  if (!TRUSTED_ORIGIN) {
    return 'NODE_ENV=production needs TRUSTED_ORIGIN set to the public https:// origin of the site.'
  }
  if (!TRUSTED_ORIGIN.startsWith('https://')) {
    return 'TRUSTED_ORIGIN has to be an https:// URL in production: the session cookie is only sent Secure, so an http:// site could not sign anybody in.'
  }
  if (SAME_SITE === 'None' && !ALLOWED_ORIGINS.length) {
    return 'COOKIE_SAME_SITE=None is only for a frontend hosted on another origin; list it in ALLOWED_ORIGINS or leave the cookie at Lax.'
  }
  if (!existsSync(path.join(distDir, 'index.html'))) {
    return 'dist/index.html is missing — run npm run build before starting the server in production.'
  }
  return null
}

const fatal = productionProblem()
if (fatal) {
  console.error(`refused to start  ${fatal}`)
  process.exit(1)
}

const app = express()
// One hop behind a reverse proxy on Fly.io, Railway, Render and friends. Set TRUST_PROXY_HOPS
// to match the real topology, or X-Forwarded-For from any client would be trusted and defeat
// the rate limit.
app.set('trust proxy', TRUST_PROXY_HOPS)
app.disable('x-powered-by')

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  // Only once HTTPS is the real deployment: a max-age here on a site that later falls back to
  // plain http would be unfixable for the length of the max-age.
  if (ENFORCE_HTTPS) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
  next()
})

/**
 * Send every visitor to the https:// version of the host they actually asked for, so an API
 * hosted apart from the site is not bounced onto the frontend origin. A form post is refused
 * rather than redirected, because a 301 in front of a POST gets retried as a GET and the
 * booking would quietly vanish. The health probe stays reachable over plain HTTP so a platform
 * that probes it from inside its own network still gets an answer.
 */
app.use((req, res, next) => {
  if (!ENFORCE_HTTPS || req.secure || req.path === '/api/health') return next()
  if (req.method === 'GET' || req.method === 'HEAD') {
    // Host is set by the platform's proxy to the public domain. It is only honoured when it is
    // one we were configured with — anything else goes to TRUSTED_ORIGIN.
    const host = (req.get('host') || '').replace(/:\d+$/, '')
    const target = HTTPS_HOSTS.has(host) ? `https://${req.get('host')}` : TRUSTED_ORIGIN
    res.redirect(301, `${target}${req.originalUrl}`)
    return
  }
  res.status(403).json({ error: 'https_required', hint: 'Send this to the https:// address of the site.' })
})

/** Sliding-window limiter, per client IP and route. In-memory on purpose: one restaurant. */
const hits = new Map()
function rateLimited(bucket, ip) {
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const seen = (hits.get(key) || []).filter((at) => now - at < RATE_WINDOW_MS)
  if (seen.length >= RATE_MAX[bucket]) {
    hits.set(key, seen)
    return true
  }
  seen.push(now)
  hits.set(key, seen)
  if (hits.size > 5000) {
    for (const [name, times] of hits) if (!times.some((at) => now - at < RATE_WINDOW_MS)) hits.delete(name)
  }
  return false
}
setInterval(() => hits.clear(), RATE_WINDOW_MS).unref()

/** Read the session cookie without pulling in a cookie-parser dependency. */
function readCookie(header, name) {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== name) continue
    const value = part.slice(eq + 1).trim()
    return value ? decodeURIComponent(value) : null
  }
  return null
}

/**
 * The session cookie, spelled out rather than pulled from a library.
 *
 * `Secure` is on whenever the deployment is HTTPS, which in production it always has to be:
 * an HttpOnly cookie that can cross a plain-HTTP hop is no secret at all. `SameSite` stays at
 * Lax for same-origin hosting and moves to None only when the site and this API are on
 * different origins, which is the split-hosting layout ALLOWED_ORIGINS exists for.
 */
function sessionCookie(req, token, maxAgeSeconds) {
  const secure = ENFORCE_HTTPS || req.secure
  const sameSite = secure ? SAME_SITE : 'Lax'
  const bits = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    `Path=/; Max-Age=${maxAgeSeconds}`,
    `Expires=${new Date(Date.now() + maxAgeSeconds * 1000).toUTCString()}`,
  ]
  if (secure) bits.push('Secure')
  return bits.join('; ')
}

/**
 * A cookie alone is not enough for a mutation: SameSite=Lax still lets a link
 * arrive, and an explicit Origin check is what rejects a page on another host
 * that tries to spend somebody's session.
 */
function allowedOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  if (ALLOWED_ORIGINS.includes(origin)) return true
  try {
    const from = new URL(origin)
    const host = req.get('host') || ''
    const wanted = new URL(TRUSTED_ORIGIN || `http://${host}`)
    if (from.host === wanted.host || from.host === host) return true
    /**
     * Development only — `TRUSTED_ORIGIN` is unset, so nothing is deployed yet. Vite proxies
     * `/api` from :5173 to this process on :8787 and rewrites `Host` while doing it, so the
     * ports legitimately differ here. Matching on the hostname still keeps any other site out.
     */
    return !TRUSTED_ORIGIN && from.hostname === new URL(`http://${host}`).hostname
  } catch {
    return false
  }
}

/**
 * Credentialed cross-origin calls, and only for the origins in ALLOWED_ORIGINS.
 * A wildcard cannot work here: a request that carries the session cookie has to name
 * exactly one origin, and the browser needs Vary so a shared cache cannot hand one
 * site's answer to another.
 */
function cors(req, res, next) {
  if (!ALLOWED_ORIGINS.length) return next()
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.append('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'content-type,x-admin-key')
    res.setHeader('Access-Control-Max-Age', '600')
    res.status(204).end()
    return
  }
  next()
}

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

const api = express.Router()

api.use(cors)

api.use((req, res, next) => {
  if (MUTATING.has(req.method) && !allowedOrigin(req)) {
    res.status(403).json({ error: 'origin', hint: 'This request has to come from the restaurant site itself.' })
    return
  }
  const token = readCookie(req.headers.cookie, SESSION_COOKIE)
  req.sessionToken = token || null
  // null when signed out or the session has expired; the value is never trusted
  // from the client, only from the database row behind this token.
  req.user = token ? getSessionUser(token) : null
  next()
})

function requireUser(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: 'sign_in', hint: 'Sign in to see this.' })
    return
  }
  next()
}

function sameSecret(provided) {
  if (!ADMIN_KEY || typeof provided !== 'string') return false
  const a = Buffer.from(provided)
  const b = Buffer.from(ADMIN_KEY)
  return a.length === b.length && timingSafeEqual(a, b)
}

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) {
    res.status(503).json({ error: 'admin_disabled', hint: 'Set TANDOORIWALA_ADMIN_KEY to read enquiries and bookings.' })
    return
  }
  if (sameSecret(req.get('x-admin-key'))) {
    next()
    return
  }
  // Only a wrong key is counted, so the restaurant's own staff can refresh the inbox
  // as often as they like while a guesser over the internet gets a ceiling.
  if (rateLimited('admin', req.ip || 'unknown')) {
    res.status(429).json({ error: 'too_many', hint: 'Too many wrong keys from this connection. Wait ten minutes.' })
    return
  }
  res.status(401).json({ error: 'unauthorized' })
}

/**
 * The probe a hosting platform watches. It answers only whether this process can still
 * reach its own store, because a deployment that mounts the database in the wrong place
 * otherwise looks healthy right up to the first booking.
 */
api.get('/health', (req, res) => {
  let store = 'unreachable'
  try {
    db.prepare('SELECT 1').get()
    store = 'ok'
  } catch {
    /* the file is locked or missing: the body and the 503 below say so */
  }
  res.status(store === 'ok' ? 200 : 503).json({
    ok: store === 'ok',
    uptime: Math.round(process.uptime()),
    signed_in: Boolean(req.user),
    store,
    restaurant_day: restaurantDay(),
    timezone: restaurantTimezone,
  })
})

/**
 * Accounts. The session token goes out as an HttpOnly cookie and never in JSON,
 * so the browser cannot leak it to page scripts and the client never has to store
 * a credential.
 */
function authRateBumped(res, req) {
  if (!rateLimited('auth', req.ip || 'unknown')) return false
  res.status(429).json({ error: 'too_many', hint: 'Too many attempts from this connection. Try again in a few minutes.' })
  return true
}

api.post('/auth/signup', express.json({ limit: '16kb' }), (req, res) => {
  if (authRateBumped(res, req)) return
  const result = validateSignUp(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid', fields: result.errors })
    return
  }
  try {
    const created = createUser(result.account)
    if (!created.ok) {
      res.status(409).json({
        error: 'invalid',
        fields: { email: 'That email already has an account. Log in instead.' },
        code: 'duplicate',
      })
      return
    }
    const { token, expiresAt } = startSession(created.user.id)
    res.setHeader('Set-Cookie', sessionCookie(req, token, Math.round((expiresAt - Date.now()) / 1000)))
    res.status(201).json({ ok: true, user: created.user })
  } catch (error) {
    console.error('signup failed', error)
    res.status(500).json({ error: 'server' })
  }
})

api.post('/auth/login', express.json({ limit: '16kb' }), (req, res) => {
  if (authRateBumped(res, req)) return
  const result = validateSignIn(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid', fields: result.errors })
    return
  }
  const user = checkLogin(result.email, result.password)
  // One message for both failures: which part was wrong is not the customer's
  // problem to learn, and it is exactly what an attacker is probing for.
  if (!user) {
    res.status(401).json({ error: 'credentials', hint: 'Email or password is not right.' })
    return
  }
  const { token, expiresAt } = startSession(user.id)
  res.setHeader('Set-Cookie', sessionCookie(req, token, Math.round((expiresAt - Date.now()) / 1000)))
  res.json({ ok: true, user })
})

api.post('/auth/logout', (req, res) => {
  if (req.sessionToken) endSession(req.sessionToken)
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0))
  res.json({ ok: true })
})

/** Who is reading the page right now — the header uses this, so it must answer 200 anonymous. */
api.get('/auth/me', (req, res) => {
  res.json({ user: req.user })
})

api.get('/profile', requireUser, (req, res) => {
  res.json({ user: req.user })
})

api.patch('/profile', express.json({ limit: '8kb' }), requireUser, (req, res) => {
  const result = validateProfileEdit(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid', fields: result.errors })
    return
  }
  try {
    const current = getUser(req.user.id)
    const user = updateProfile(req.user.id, {
      name: result.patch.name ?? current.name,
      phone: result.patch.phone ?? current.phone,
    })
    res.json({ ok: true, user })
  } catch (error) {
    console.error('profile update failed', error)
    res.status(500).json({ error: 'server' })
  }
})

const AVATAR_MESSAGES = {
  missing: 'Choose a photo first.',
  bad_type: 'That file is not a JPEG, PNG or WebP image.',
  too_large: `The photo has to be under ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)} MB.`,
  empty: 'That image is empty.',
  decode_failed: 'The image could not be read. Try exporting it again.',
  storage_unavailable: 'Photo storage is not available on this server yet.',
}

// The cap has to sit above the base64 form of MAX_AVATAR_BYTES, so the customer
// gets the sized-to-fit message from saveAvatar rather than a body-too-large page.
api.post('/profile/photo', express.json({ limit: '5mb' }), requireUser, async (req, res) => {
  if (rateLimited('upload', req.ip || 'unknown')) {
    res.status(429).json({ error: 'too_many', hint: 'Too many uploads from this connection. Try again shortly.' })
    return
  }
  try {
    const saved = await saveAvatar(req.user.id, req.body?.dataUrl)
    if (!saved.ok) {
      res.status(400).json({ error: 'invalid', fields: { photo: AVATAR_MESSAGES[saved.error] ?? 'That photo could not be saved.' } })
      return
    }
    // Replacing the picture makes the old file dead weight on the restaurant's disk.
    if (req.user.avatar) await deleteAvatar(req.user.avatar)
    const user = setAvatar(req.user.id, saved.avatar)
    res.status(201).json({ ok: true, user })
  } catch (error) {
    console.error('avatar upload failed', error)
    res.status(500).json({ error: 'server' })
  }
})

/**
 * The photo folder is not published, so this is the only way in — and it hands back
 * the caller's own picture, never anybody else's.
 */
api.get('/profile/photo', async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'sign_in' })
    return
  }
  const photo = req.user.avatar ? await readAvatar(req.user.avatar) : null
  if (!photo) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.setHeader('Cache-Control', 'private, max-age=86400')
  res.setHeader('ETag', photo.etag)
  res.type('image/jpeg').send(photo.buffer)
})

api.delete('/profile/photo', requireUser, async (req, res) => {
  if (req.user.avatar) await deleteAvatar(req.user.avatar)
  const user = setAvatar(req.user.id, '')
  res.json({ ok: true, user })
})


api.use('/enquiries', express.json({ limit: '8kb' }))

api.post('/enquiries', (req, res) => {
  const ip = req.ip || 'unknown'
  if (rateLimited('message', ip)) {
    res.status(429).json({ error: 'too_many', hint: 'Too many messages from this connection. Call +91 89173 92926 instead.' })
    return
  }

  // Hidden field only a bot would fill in. Answer as if it worked.
  if (typeof req.body?.company === 'string' && req.body.company.trim()) {
    res.status(201).json({ ok: true, id: randomUUID().slice(0, 8) })
    return
  }

  const result = validateEnquiry(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid', fields: result.errors })
    return
  }

  try {
    const id = insertEnquiry(result.enquiry)
    res.status(201).json({ ok: true, id })
  } catch (error) {
    console.error('enquiry insert failed', error)
    res.status(500).json({ error: 'server' })
  }
})

api.get('/enquiries', requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
  res.json({ enquiries: listEnquiries(limit), total: countEnquiries() })
})

api.patch('/enquiries/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const status = req.body?.status
  if (!Number.isInteger(id) || id < 1 || !['new', 'handled'].includes(status)) {
    res.status(400).json({ error: 'invalid' })
    return
  }
  res.json({ ok: setEnquiryStatus(id, status) })
})

/**
 * One call answers the whole chair map for a seating: the room layout, the times
 * the restaurant set up, and which chairs are already held. Availability is read
 * from the database, never assumed by the browser. `slot` is optional so the
 * page can ask for the room and the seating times before a customer has chosen.
 */
api.get('/tables', (req, res) => {
  const ip = req.ip || 'unknown'
  if (rateLimited('read', ip)) {
    res.status(429).json({ error: 'too_many', hint: 'Too many refreshes from this connection. Try again shortly.' })
    return
  }
  const date = validDate(String(req.query.date ?? ''))
  if (!date) {
    res.status(400).json({ error: 'invalid', fields: { date: 'Pick a date from today onward.' } })
    return
  }
  const requested = String(req.query.slot ?? '')
  if (requested && !bookingSlots.includes(requested)) {
    res.status(400).json({ error: 'invalid', fields: { slot: 'That time is not one we open for bookings.' } })
    return
  }
  // One array would make the client re-learn which ids are chairs and which are
  // couple slots; the server already knows, so it splits them here.
  const held = requested ? takenChairs(date, requested) : []
  res.json({
    date,
    slot: requested || null,
    slots: bookingSlots,
    // "Today" and the cut-offs belong to the restaurant, not to the customer's phone:
    // a browser two timezones away defaults to the same evening as one at the table.
    today: restaurantDay(),
    timezone: restaurantTimezone,
    floorPlan,
    diningRoom,
    taken: held.filter(isHallChair),
    takenCouples: held.filter(isCouple),
    // The restaurant's clock decides what "already gone" means, so the map cannot
    // offer a seating time the POST would reject.
    passed: bookingSlots.filter((time) => slotHasPassed(date, time)),
  })
})

api.use('/bookings', express.json({ limit: '8kb' }))

api.post('/bookings', (req, res) => {
  const ip = req.ip || 'unknown'
  if (rateLimited('write', ip)) {
    res.status(429).json({ error: 'too_many', hint: 'Too many booking attempts from this connection. Call +91 89173 92926 instead.' })
    return
  }

  if (typeof req.body?.company === 'string' && req.body.company.trim()) {
    res.status(201).json({ ok: true, ref: `TB-${randomUUID().slice(0, 4).toUpperCase()}` })
    return
  }

  const result = validateBooking(req.body, { slots: bookingSlots })
  if (!result.ok) {
    res.status(400).json({ error: 'invalid', fields: result.errors })
    return
  }

  try {
    // Taken inside the write transaction, so a seat claimed a moment ago is
    // still rejected here rather than slipping through as a duplicate row.
    // The account id comes from the session, never from the request body.
    const outcome = createBooking({ ...result.booking, userId: req.user?.id ?? null }, result.seats)
    if (!outcome.ok) {
      res.status(409).json({
        error: 'seats_taken',
        seats: outcome.taken,
        hint: 'Those chairs were booked while you were choosing. Pick others and try again.',
      })
      return
    }
    // Everything the ticket shows, read back from the row that was just written.
    res.status(201).json({ ok: true, booking: getBooking(outcome.id) })
  } catch (error) {
    console.error('booking insert failed', error)
    res.status(500).json({ error: 'server' })
  }
})

/**
 * A customer's own tickets. Filtered by the id taken from the session, so there is
 * no parameter to tamper with and no way to page through somebody else's evenings.
 */
api.get('/bookings/mine', requireUser, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
  res.json({ bookings: listMyBookings(req.user.id, limit) })
})

/** One ticket by its reference — still scoped, so a guessed reference is not a window. */
api.get('/tickets/:ref', requireUser, (req, res) => {
  const ref = String(req.params.ref || '').trim().toUpperCase()
  const booking = /^TB-\d{4}$/.test(ref) ? getBookingByRef(ref) : null
  if (!booking || booking.user_id !== req.user.id) {
    res.status(404).json({ error: 'not_found', hint: 'That ticket is not on this account.' })
    return
  }
  res.json({ booking })
})

api.get('/bookings', requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
  const date = req.query.date ? validDate(String(req.query.date)) : null
  const slot = bookingSlots.includes(String(req.query.slot ?? '')) ? String(req.query.slot) : null
  res.json({
    bookings: listBookings(limit),
    total: countBookings(),
    taken: date && slot ? takenChairs(date, slot) : [],
  })
})

/** Cancelling is the only way a chair comes back, so the operator needs it. */
api.patch('/bookings/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'invalid' })
    return
  }
  const booking = getBooking(id)
  if (!booking) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  if (req.body?.status === 'cancelled') {
    res.json({ ok: cancelBooking(id), booking: getBooking(id) })
    return
  }
  res.status(400).json({ error: 'invalid', hint: 'Only status "cancelled" is accepted.' })
})

api.use((req, res) => res.status(404).json({ error: 'not_found' }))

app.use('/api', api)

app.get('/admin', (req, res) => {
  res.set('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'")
  res.set('Cache-Control', 'no-store')
  res.sendFile(adminPage)
})

if (existsSync(path.join(distDir, 'index.html'))) {
  app.use(
    express.static(distDir, {
      index: false,
      // Vite fingerprints everything under /assets, so a new deploy cannot be shadowed by
      // a browser holding the old file — and the app shell must never be cached at all,
      // or a customer stays on the previous build after a release.
      setHeaders(res, filePath) {
        if (filePath.startsWith(assetsDir)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        } else if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400')
        }
      },
    }),
  )
  /**
   * The card a friend in another country sees in WhatsApp or Telegram is built from the tags
   * in this file before any JavaScript runs, and the domain is not known when the bundle is
   * built. So `{{SITE_ORIGIN}}` is filled in here from TRUSTED_ORIGIN: move to a custom
   * domain, restart, and every absolute link in the shell moves with it — no rebuild.
   */
  const shell = readFileSync(path.join(distDir, 'index.html'), 'utf8')
  const appShell = shell.split('{{SITE_ORIGIN}}').join(TRUSTED_ORIGIN)

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    // A missing asset must 404, not answer with the app shell.
    if (path.extname(req.path)) return res.status(404).end()
    res.setHeader('Cache-Control', 'no-cache')
    res.type('html').send(appShell)
  })
}

/**
 * Anything that escapes the routes above still answers as JSON. Express default pages leak
 * the stack and the framework, and a browser fetch that gets HTML back reports a useless
 * "could not be reached" to the customer. The unused fourth argument is what makes Express
 * treat this as an error handler rather than a route.
 */
app.use((error, req, res, _next) => {
  const status = Number(error.status || error.statusCode || 500)
  const failed = status >= 500
  if (failed) console.error(req.method, req.originalUrl, error)
  const bodies = {
    'entity.too.large': 'That is bigger than this form accepts.',
    'entity.parse.failed': 'The message did not arrive as expected. Try again.',
    'encoding.unsupported': 'That file cannot be read here.',
  }
  res.status(status).json({
    // A stack trace is nobody's business but the restaurant's, so the customer gets a
    // sentence and the server log gets the error object.
    error: failed ? 'server' : String(error.type || 'request_failed'),
    hint: failed ? 'Something went wrong on our side. Call the restaurant.' : bodies[error.type] ?? error.message,
  })
})

const server = app.listen(PORT, () => {
  const where = IS_PROD ? TRUSTED_ORIGIN : `http://localhost:${PORT}`
  console.log(`env      ${IS_PROD ? 'production' : process.env.NODE_ENV || 'development'}`)
  console.log(`api      ${where}/api`)
  console.log(`admin    ${where}/admin`)
  console.log(`clock    ${restaurantTimezone} — restaurant day ${restaurantDay()}`)
  console.log(
    `store    ${existsSync(distDir) ? 'serving dist/ with SPA fallback' : 'dist/ not built — API only (run npm run dev for the site)'}`,
  )
  if (!ADMIN_KEY) console.warn('TANDOORIWALA_ADMIN_KEY is unset, so the enquiry inbox is write-only.')
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 1500).unref()
  })
}

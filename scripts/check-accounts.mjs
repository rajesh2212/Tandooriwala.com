/**
 * Accounts, tickets and private-room check.
 *
 * Boots the real server against a throwaway database and drives it over HTTP with
 * two separate cookie jars, so what is tested is the path a browser takes: the
 * session cookie, the ownership filters, and the constraints inside SQLite.
 *
 *   node scripts/check-accounts.mjs
 *
 * Nothing here touches data/enquiries.db.
 */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const probeFile = path.join(root, 'data', '.accounts-check.db')
const uploadDir = path.join(root, 'data', '.accounts-check-uploads')
const PORT = 8901 + (process.pid % 40)
const origin = `http://127.0.0.1:${PORT}`
const base = `${origin}/api`
// validDate() only accepts a date within a year, so the probe books two days ahead.
const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)

let passed = 0
const failures = []
function check(label, condition, detail) {
  if (condition) {
    passed += 1
    console.log(`  ok    ${label}`)
    return
  }
  failures.push(label)
  console.log(`  FAIL  ${label}${detail === undefined ? '' : ` -> ${JSON.stringify(detail).slice(0, 240)}`}`)
}

/**
 * One cookie jar per "browser", and one client address per jar: the rate limiter
 * counts writes per IP, and a single scripted connection would hit the production
 * ceiling long before the booking rules were finished.
 */
function client(ip) {
  let cookie = ''
  return {
    request: async (method, route, body, extra = {}) => {
      const headers = { Origin: origin, 'X-Forwarded-For': ip, ...extra.headers }
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      if (cookie && !extra.noCookie) headers.Cookie = cookie
      const res = await fetch(base + route, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const setCookie = res.headers.get('set-cookie')
      if (setCookie) cookie = setCookie.split(';')[0]
      const type = res.headers.get('content-type') || ''
      const payload = type.includes('json')
        ? await res.json()
        : type.startsWith('image/')
          ? Buffer.from(await res.arrayBuffer())
          : await res.text()
      return { status: res.status, json: payload, type, rawCookie: cookie }
    },
  }
}

const stamp = Date.now()
const guest = client('10.90.0.1')
const other = client('10.90.0.2')
const walkIn = client('10.90.0.3')

async function main() {
  console.log('sign-up')
  const rejected = await guest.request('POST', '/auth/signup', { email: 'not-an-email', name: 'X', password: 'short' })
  check('invalid details are refused, field by field', rejected.status === 400 && rejected.json.fields?.email && rejected.json.fields?.password, rejected.json)

  const made = await guest.request('POST', '/auth/signup', {
    email: `guest${stamp}@example.com`,
    name: 'First Guest',
    phone: '8917392926',
    password: 'tandoor123',
  })
  check('sign-up returns the account and never the hash', made.status === 201 && made.json.user?.id && !('password_hash' in made.json.user), made.json)
  check('sign-up opens a session', /tw_session=/.test(made.rawCookie || ''), made.rawCookie)

  const dupe = await guest.request('POST', '/auth/signup', {
    email: `guest${stamp}@example.com`,
    name: 'Copycat',
    password: 'tandoor123',
  })
  check('a duplicate email says so plainly', dupe.status === 409 && /already has an account/i.test(dupe.json.fields?.email || ''), dupe.json)

  console.log('sign-in')
  const badPassword = await other.request('POST', '/auth/login', { email: `guest${stamp}@example.com`, password: 'wrongpass1' })
  const noAccount = await other.request('POST', '/auth/login', { email: `nobody${stamp}@example.com`, password: 'wrongpass1' })
  check('a wrong password is refused', badPassword.status === 401, badPassword.json)
  check('an unknown email answers identically', noAccount.status === 401 && JSON.stringify(noAccount.json) === JSON.stringify(badPassword.json), noAccount.json)

  const second = await other.request('POST', '/auth/signup', {
    email: `other${stamp}@example.com`,
    name: 'Second Guest',
    password: 'tandoor123',
  })
  check('a second account can be created', second.status === 201, second.json)

  console.log('profile')
  const edited = await guest.request('PATCH', '/profile', { name: 'Renamed Guest' })
  check('a profile edit is saved', edited.status === 200 && edited.json.user?.name === 'Renamed Guest', edited.json)
  const cleared = await guest.request('PATCH', '/profile', { phone: '' })
  check('the phone number can be cleared', cleared.status === 200 && cleared.json.user?.phone === '', cleared.json)
  const anonProfile = await fetch(`${base}/profile`)
  check('the profile needs a session', anonProfile.status === 401, anonProfile.status)
  const forged = await fetch(`${base}/profile`, { headers: { Cookie: 'tw_session=not-a-real-token' } })
  check('a made-up cookie is not a login', forged.status === 401, forged.status)

  console.log('profile photo')
  const png = (await sharp({ create: { width: 40, height: 40, channels: 3, background: '#e08a1e' } }).png().toBuffer()).toString('base64')
  const photo = await guest.request('POST', '/profile/photo', { dataUrl: `data:image/png;base64,${png}` })
  check('a photo upload is stored', photo.status === 201 && /^\d+-\d+\.jpg$/.test(photo.json.user?.avatar || ''), photo.json)
  const served = await guest.request('GET', '/profile/photo')
  check('it is served back as a re-encoded JPEG', served.status === 200 && served.type.startsWith('image/jpeg') && served.json.length > 100, served.status)
  const stolen = await other.request('GET', '/profile/photo')
  check('another signed-in customer cannot read it', stolen.status === 404, stolen.json)
  const stranger = await fetch(`${base}/profile/photo`)
  check('an anonymous request gets no photo', stranger.status === 401, stranger.status)
  const notImage = await guest.request('POST', '/profile/photo', { dataUrl: 'data:text/plain;base64,aGVsbG8=' })
  check('a non-image is refused on its bytes', notImage.status === 400 && /not a JPEG/i.test(notImage.json.fields?.photo || ''), notImage.json)
  const tooBig = await guest.request('POST', '/profile/photo', {
    dataUrl: `data:image/png;base64,${Buffer.alloc(Math.ceil(3.3 * 1024 * 1024), 7).toString('base64')}`,
  })
  check('an over-size photo names the limit', tooBig.status === 400 && /MB/i.test(tooBig.json.fields?.photo || ''), tooBig.json)
  const removed = await guest.request('DELETE', '/profile/photo')
  check('the photo can be removed', removed.status === 200 && removed.json.user?.avatar === '', removed.json)

  console.log('private dining room')
  const both = await guest.request('POST', '/bookings', {
    date,
    slot: '21:00',
    seats: ['P1', 'P2'],
    name: 'Renamed Guest',
    phone: '8917392926',
    partySize: 4,
  })
  check('two couples — one per table — fit the room', both.status === 201, both.json)
  const extraChair = await guest.request('POST', '/bookings', {
    date,
    slot: '20:00',
    seats: ['P1-2'],
    name: 'Renamed Guest',
    phone: '8917392926',
    partySize: 1,
  })
  check('a decorative chair cannot raise the capacity', extraChair.status === 400 && /not in our room/i.test(extraChair.json.fields?.seats || ''), extraChair.json)
  const halfCouple = await guest.request('POST', '/bookings', {
    date,
    slot: '12:30',
    seats: ['P1'],
    name: 'Renamed Guest',
    phone: '8917392926',
    partySize: 1,
  })
  check('a couple is two guests, so a solo party is refused', halfCouple.status === 400 && /couple/i.test(halfCouple.json.fields?.partySize || ''), halfCouple.json)
  const mixed = await guest.request('POST', '/bookings', {
    date,
    slot: '13:30',
    seats: ['P1', 'A1-1'],
    name: 'Renamed Guest',
    phone: '8917392926',
    partySize: 3,
  })
  check('the two rooms cannot share one booking', mixed.status === 400 && /cannot share/i.test(mixed.json.fields?.seats || ''), mixed.json)

  console.log('tickets and isolation')
  const hall = await guest.request('POST', '/bookings', {
    date,
    slot: '20:00',
    seats: ['A1-1', 'A1-2'],
    name: 'Renamed Guest',
    phone: '8917392926',
    partySize: 2,
  })
  check('a hall booking is saved with a reference', hall.status === 201 && /^TB-\d{4}$/.test(hall.json.booking?.ref || ''), hall.json)
  const ref = hall.json.booking?.ref

  const claim = await other.request('POST', '/bookings', {
    date,
    slot: '20:00',
    seats: ['A1-1'],
    name: 'Second Guest',
    phone: '9812345678',
    partySize: 1,
  })
  check('the same chair cannot go to a second account', claim.status === 409 && claim.json.seats?.includes('A1-1'), claim.json)

  const mine = await guest.request('GET', '/bookings/mine')
  const theirs = await other.request('GET', '/bookings/mine')
  const myRefs = (mine.json.bookings || []).map((b) => b.ref)
  check('history holds this customer’s bookings', myRefs.includes(ref), myRefs)
  check('history never holds another customer’s', !(theirs.json.bookings || []).some((b) => b.ref === ref), theirs.json)
  const ticket = await guest.request('GET', `/tickets/${ref}`)
  check('a ticket read carries chairs and status', ticket.status === 200 && ticket.json.booking?.chairs?.length === 2 && ticket.json.booking.status === 'active', ticket.json)
  const wrongTicket = await other.request('GET', `/tickets/${ref}`)
  check('another customer cannot open that ticket', wrongTicket.status === 404, wrongTicket.json)

  const map = await guest.request('GET', `/tables?date=${date}&slot=20:00`)
  const evening = await guest.request('GET', `/tables?date=${date}&slot=21:00`)
  const areas = (map.json.floorPlan?.areas || []).map((a) => a.id)
  check('the plan labels balcony, cash, private, toilet and party', ['balcony', 'cash', 'private', 'toilet', 'party'].every((id) => areas.includes(id)), areas)
  check('the private room publishes two couple slots', map.json.diningRoom?.couples?.length === 2 && map.json.diningRoom?.limit?.couples === 2, map.json.diningRoom?.couples)
  check('chairs and couples are reported apart', map.json.taken?.includes('A1-1') && !map.json.taken?.includes('P1'), {
    taken: map.json.taken,
    couples: map.json.takenCouples,
  })
  check('availability is per seating, not global', evening.json.takenCouples?.join(',') === 'P1,P2' && !evening.json.taken?.length, {
    taken: evening.json.taken,
    couples: evening.json.takenCouples,
  })

  const anon = await walkIn.request('POST', '/bookings', {
    date,
    slot: '12:30',
    seats: ['A2-1'],
    name: 'Walk In',
    phone: '8917392926',
    partySize: 1,
  })
  check('a booking still works with no account', anon.status === 201 && !anon.json.booking?.user_id, anon.json)
  const afterAnon = await guest.request('GET', '/bookings/mine')
  check('an anonymous booking belongs to nobody’s history', !(afterAnon.json.bookings || []).some((b) => b.ref === anon.json.booking?.ref), afterAnon.json)

  const crossSite = await fetch(`${base}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'X-Forwarded-For': '10.90.0.4' },
    body: JSON.stringify({ date, slot: '12:30', seats: ['A3-1'], name: 'Attacker', phone: '8917392926', partySize: 1 }),
  })
  check('a request from another site is refused', crossSite.status === 403, crossSite.status)

  await guest.request('POST', '/auth/logout')
  const afterLogout = await guest.request('GET', '/bookings/mine')
  check('logging out ends the session', afterLogout.status === 401, afterLogout.json)
}

function removeFiles() {
  for (const suffix of ['', '-wal', '-shm']) rmSync(probeFile + suffix, { force: true })
  rmSync(uploadDir, { recursive: true, force: true })
}

/** Windows keeps a lock on an open SQLite file for a moment after the writer exits. */
async function removeProbe() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      removeFiles()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  console.warn(`(could not remove ${probeFile} — delete it by hand)`)
}

removeFiles()
const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(root, 'server', 'index.js')], {
  cwd: root,
  env: { ...process.env, DATA_FILE: probeFile, UPLOAD_DIR: 'data/.accounts-check-uploads', PORT: String(PORT), TANDOORIWALA_ADMIN_KEY: 'check' },
  stdio: 'ignore',
})

const started = Date.now()
while (Date.now() - started < 15_000) {
  try {
    if ((await fetch(`${base}/health`)).ok) break
  } catch {
    /* not listening yet */
  }
  await new Promise((resolve) => setTimeout(resolve, 150))
}

try {
  await main()
} catch (error) {
  failures.push(`crashed: ${error.message}`)
  console.error(error)
} finally {
  const closed = new Promise((resolve) => server.once('close', resolve))
  server.kill('SIGTERM')
  await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 5000))])
  await removeProbe()
}

console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) console.log(failures.map((f) => ` - ${f}`).join('\n'))
process.exitCode = failures.length ? 1 : 0

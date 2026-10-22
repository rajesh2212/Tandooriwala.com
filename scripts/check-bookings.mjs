/**
 * Double-booking check.
 *
 * Spawns one child process per attempt, all pointing at the same SQLite file and
 * all reaching for the same chair. Separate processes matter: it is the database
 * write lock being tested, not Node's event loop. Exactly one attempt should win.
 *
 *   node scripts/check-bookings.mjs            # 8 workers on a throwaway database
 *   node scripts/check-bookings.mjs --workers 20
 *
 * The throwaway file is removed at the end, so this never touches the real inbox.
 */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const self = fileURLToPath(import.meta.url)
const probeFile = path.join(root, 'data', '.double-booking-check.db')
const date = '2099-01-01'
const slot = '20:00'
const chair = 'A1-1'

const args = process.argv.slice(2)
const workersIndex = args.indexOf('--workers')
const workers = workersIndex === -1 ? 8 : Number(args[workersIndex + 1])

function spawnNode(flag, extra) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', self, flag, ...(extra ?? [])], {
      cwd: root,
      env: { ...process.env, DATA_FILE: probeFile },
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk) => (out += chunk))
    child.stderr.on('data', (chunk) => (err += chunk))
    child.on('error', (error) => resolve({ error: String(error) }))
    child.on('close', () => {
      const lastLine = out.trim().split('\n').filter(Boolean).pop()
      try {
        resolve(JSON.parse(lastLine ?? ''))
      } catch {
        resolve({ error: (lastLine || err.trim() || 'no output').slice(0, 200) })
      }
    })
  })
}

if (args[0] === '--attempt') {
  const { createBooking } = await import('../server/bookings.js')
  const outcome = createBooking(
    { date, slot, name: `Worker ${args[1]}`, phone: '+918917392926', partySize: 1, note: '' },
    [chair],
  )
  console.log(JSON.stringify(outcome.ok ? { won: true, ref: outcome.ref } : { lost: true, taken: outcome.taken }))
} else if (args[0] === '--prepare') {
  // Opening the database is what runs the migrations.
  await import('../server/db.js')
  console.log(JSON.stringify({ prepared: true }))
} else {
  for (const suffix of ['', '-wal', '-shm']) rmSync(probeFile + suffix, { force: true })

  // Migrate once, on its own, so twelve processes are racing for a chair and not
  // for the right to create the schema.
  const prepared = await spawnNode('--prepare')
  if (prepared.error) {
    console.log(`FAIL — could not prepare ${probeFile}: ${prepared.error}`)
    process.exitCode = 1
  } else {
    const results = await Promise.all(
      Array.from({ length: workers }, (_, index) => spawnNode('--attempt', [String(index)])),
    )
    const won = results.filter((result) => result.won).length
    const lost = results.filter((result) => result.lost).length
    const failed = results.length - won - lost

    console.log(`attempts:   ${workers}`)
    console.log(`won:        ${won}`)
    console.log(`rejected:   ${lost} ${lost ? `(seats_taken: ${results.find((r) => r.lost)?.taken})` : ''}`)
    if (failed) console.log(`errors:     ${failed} -> ${JSON.stringify(results.filter((r) => r.error))}`)
    console.log(won === 1 && failed === 0 ? 'PASS — one chair, one booking' : 'FAIL — a chair was handed out more than once')

    for (const suffix of ['', '-wal', '-shm']) rmSync(probeFile + suffix, { force: true })
    process.exitCode = won === 1 && failed === 0 ? 0 : 1
  }
}

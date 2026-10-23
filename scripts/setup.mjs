/**
 * One command that makes a fresh download runnable: `npm run setup`.
 *
 * It checks the two things that actually break a first run — a Node too old for
 * `node:sqlite`, and a missing `.env` — and then writes a `.env` that is safe for a
 * laptop: a real, freshly generated admin key so `/admin` opens, and no `NODE_ENV` or
 * `TRUSTED_ORIGIN`, which are production-only and refuse to boot locally.
 *
 * It never overwrites an existing `.env`, prints no secret it did not just create, and
 * touches nothing else.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const MIN = { major: 22, minor: 13 }
const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')

const { major, minor } = process.versions.node.split('.').map(Number)
const tooOld = major < MIN.major || (major === MIN.major && minor < MIN.minor)

if (tooOld) {
  console.error(
    `Node ${process.versions.node} is too old. The backend uses node:sqlite, which needs ` +
      `Node >= ${MIN.major}.${MIN.minor}. Install a newer Node from nodejs.org (LTS), then ` +
      `run npm install and npm run setup again.`,
  )
  process.exitCode = 1
} else {
  console.log(`node ${process.versions.node} — ok, node:sqlite is available`)
}

if (existsSync(envPath)) {
  console.log('.env already exists — leaving it exactly as it is.')
} else {
  const key = randomBytes(24).toString('base64url')
  const body = [
    '# Created by `npm run setup`. Gitignored: this file never belongs in Git,',
    '# and nothing in it is a real credential — it is a local-only secret.',
    '',
    '# The only value a local run needs. It unlocks the owner inbox at /admin;',
    '# copy it from this file and paste it into that page.',
    `TANDOORIWALA_ADMIN_KEY=${key}`,
    '',
    '# Optional: uncomment only if 8787 is already taken on this machine.',
    '# PORT=8787',
    '',
    '# Production-only, deliberately absent here. Setting NODE_ENV=production without',
    '# TRUSTED_ORIGIN makes the server refuse to start, which is the correct behaviour',
    '# for a laptop. See .env.example and DEPLOYING.md when you are ready to publish.',
    '',
  ].join('\n')
  try {
    // `wx` fails instead of truncating if the file appeared since the check above, so a
    // second run — or a hand-made `.env` — can never be overwritten.
    writeFileSync(envPath, body, { mode: 0o600, flag: 'wx' })
    console.log('.env created with a fresh local admin key (it is in the file, not printed here).')
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log('.env already exists — leaving it exactly as it is.')
    } else {
      console.error(`Could not write .env: ${error.message}. Create it by hand — see .env.example.`)
      process.exitCode = 1
    }
  }
}

if (!existsSync(path.join(root, 'node_modules'))) {
  console.log('node_modules is missing — run npm install first.')
} else {
  console.log('Next:  npm run dev   (and, in a second terminal, npm start for /api)')
}

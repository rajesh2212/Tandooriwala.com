import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Profile photos.
 *
 * The project has one storage service: the restaurant's own disk, under `data/`
 * (gitignored, the same place the database lives). Nothing is pushed to a third
 * party, so there is no bucket key or signed URL to leak — and nothing is public
 * either. Files are written outside `dist/` and served only through an authorised
 * API route that checks the session belongs to the account in the path.
 *
 * Every upload is decoded and re-encoded with sharp before it is stored, so what
 * lands on disk is always a clean 512px JPEG regardless of what was sent.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// resolve(), not join(): a deployment points this at a mounted volume (`/data/...`), and
// join would graft that onto the project directory instead of honouring it.
export const AVATAR_DIR = path.resolve(root, process.env.UPLOAD_DIR || 'data/uploads/avatars')

export const MAX_AVATAR_BYTES = 3 * 1024 * 1024
const ACCEPTED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const SIDE = 512

let sharpPromise = null
/** Loaded lazily so a missing optional dependency degrades one feature, not the site. */
function getSharp() {
  if (!sharpPromise) sharpPromise = import('sharp').then((m) => m.default || m)
  return sharpPromise
}

const FILENAME = /^(\d+)-(\d+)\.jpg$/

function sniff(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png'
  if (
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp'
  return null
}

/** Accepts a data: URL from FileReader. Returns the stored filename, not a public path. */
export async function saveAvatar(userId, dataUrl) {
  if (typeof dataUrl !== 'string') return { ok: false, error: 'missing' }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl)
  if (!match) return { ok: false, error: 'bad_type' }
  const [, mime, body] = match
  if (!ACCEPTED[mime]) return { ok: false, error: 'bad_type' }

  const raw = Buffer.from(body.replace(/\s/g, ''), 'base64')
  if (!raw.length) return { ok: false, error: 'empty' }
  if (raw.byteLength > MAX_AVATAR_BYTES) return { ok: false, error: 'too_large' }
  // The declared type must agree with the first bytes, or it is not an image.
  if (sniff(raw) !== mime) return { ok: false, error: 'bad_type' }

  let sharp
  try {
    sharp = await getSharp()
  } catch {
    return { ok: false, error: 'storage_unavailable' }
  }

  let encoded
  try {
    encoded = await sharp(raw, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(SIDE, SIDE, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
  } catch {
    return { ok: false, error: 'decode_failed' }
  }
  if (!encoded?.length || sniff(encoded) !== 'image/jpeg') return { ok: false, error: 'decode_failed' }

  const name = `${userId}-${Date.now()}.jpg`
  await mkdir(AVATAR_DIR, { recursive: true })
  await writeFile(path.join(AVATAR_DIR, name), encoded, { flag: 'wx' })
  return { ok: true, avatar: name, bytes: encoded.byteLength }
}

export async function readAvatar(name) {
  if (!FILENAME.test(String(name))) return null
  try {
    const buffer = await readFile(path.join(AVATAR_DIR, String(name)))
    return { buffer, etag: `"${name}"` }
  } catch {
    return null
  }
}

export async function deleteAvatar(name) {
  if (!FILENAME.test(String(name))) return false
  try {
    await unlink(path.join(AVATAR_DIR, String(name)))
    return true
  } catch {
    return false
  }
}

import { apiFetch } from './api'

export type EnquiryKind = 'table' | 'preorder' | 'other'

export type EnquiryPayload = {
  kind: EnquiryKind
  name: string
  phone: string
  date?: string
  time?: string
  party?: number
  message?: string
  /** Honeypot. Humans never see it, bots fill it in. */
  company?: string
}

export type EnquiryFieldErrors = Partial<Record<'kind' | 'name' | 'phone' | 'date' | 'time' | 'party', string>>

export type EnquiryResult =
  | { ok: true }
  | { ok: false; reason: 'rejected'; fields: EnquiryFieldErrors }
  | { ok: false; reason: 'rate-limited' }
  | { ok: false; reason: 'unreachable' }

const ENQUIRY_PATH = '/api/enquiries'

/**
 * Posts to the restaurant's own enquiry store. Same-origin by default — the Vite dev
 * server proxies /api and `npm start` serves the built site from Express — and pointed at
 * `VITE_API_ORIGIN` only when the site and the API are deployed apart.
 */
export async function submitEnquiry(payload: EnquiryPayload): Promise<EnquiryResult> {
  let response: Response
  try {
    response = await apiFetch(ENQUIRY_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: false, reason: 'unreachable' }
  }

  if (response.ok) return { ok: true }
  if (response.status === 429) return { ok: false, reason: 'rate-limited' }

  try {
    const body = (await response.json()) as { error?: string; fields?: EnquiryFieldErrors }
    if (body?.fields && Object.keys(body.fields).length) {
      return { ok: false, reason: 'rejected', fields: body.fields }
    }
  } catch {
    /* fall through to unreachable-style handling */
  }
  return { ok: false, reason: 'unreachable' }
}

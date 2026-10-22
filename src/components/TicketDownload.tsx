/**
 * The control that turns a confirmed booking into a PDF the customer can keep.
 *
 * The file is built in the browser from the booking row this account was given, so no
 * second request can pull in somebody else's table. It only ever renders for a confirmed
 * booking — a cancelled one has nothing to hand out — and every failure ends as a plain
 * sentence in the live region under the button, never a silent no-op.
 */

import { useState } from 'react'
import type { Booking } from '../lib/bookings'
import { buildTicketPdf } from '../lib/ticketPdf'
import { cn } from '../lib/cn'
import { Check, Download } from './Icons'

export function TicketDownload({ booking, className }: { booking: Booking; className?: string }) {
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function save() {
    if (busy) return
    setBusy(true)
    setSaved(false)
    setProblem(null)

    const ticket = await buildTicketPdf(booking)
    if (!ticket.ok) {
      setBusy(false)
      setProblem(ticket.message)
      return
    }

    try {
      const url = URL.createObjectURL(ticket.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = ticket.filename
      document.body.append(link)
      link.click()
      link.remove()
      // Safari is still reading the blob when the click returns; revoked on the next tick
      // this hands the customer a zero-byte file.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setSaved(true)
    } catch {
      setProblem("Your browser wouldn't take the file — check its download settings and try again.")
    } finally {
      setBusy(false)
    }
  }

  const message = busy ? 'Making the PDF…' : problem ?? (saved ? 'Saved to your downloads.' : null)

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        aria-label="Download booking ticket"
        title="Download booking ticket"
        className={cn(
          'inline-grid h-11 w-11 shrink-0 place-items-center rounded-full border-2',
          'transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember',
          'disabled:opacity-55',
          problem
            ? 'border-ember-700 text-ember-700'
            : saved
              ? 'border-spinach text-spinach'
              : 'border-ink/22 text-ink hover:border-ink hover:bg-ink hover:text-cream',
        )}
      >
        {saved && !problem ? <Check className="h-5 w-5" /> : <Download className="h-5 w-5" />}
      </button>

      <p
        role={problem ? 'alert' : 'status'}
        className={cn('text-sm', problem ? 'font-semibold text-ember-700' : 'text-ink-600')}
      >
        {message ?? 'Keep this ticket as a PDF.'}
      </p>
    </div>
  )
}

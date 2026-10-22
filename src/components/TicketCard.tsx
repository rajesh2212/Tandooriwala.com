import { Link } from 'react-router-dom'
import type { Booking } from '../lib/bookings'
import { describeSeats } from '../lib/bookings'
import { cn } from '../lib/cn'
import { restaurant } from '../data/restaurant'
import { formatDay } from '../lib/format'
import { TicketDownload } from './TicketDownload'

/**
 * The ticket a customer keeps.
 *
 * Every field is read back from the row the server wrote, so a ticket only exists
 * after a booking is really saved — there is no optimistic version of this card.
 */

const statusCopy = {
  active: { label: 'Confirmed', note: 'held for this seating', cls: 'border-spinach/45 bg-spinach/12 text-spinach' },
  cancelled: { label: 'Cancelled', note: 'the chairs are free again', cls: 'border-ember-700/45 bg-ember/10 text-ember-700' },
} as const

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow text-ink-400">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  )
}

export function TicketCard({ booking, className }: { booking: Booking; className?: string }) {
  const status = statusCopy[booking.status] ?? statusCopy.active
  return (
    <article
      className={cn(
        'relative isolate overflow-hidden rounded-[1.25rem] border border-ink/12 bg-cream p-5 sm:p-6',
        'shadow-[0_14px_30px_-24px_rgba(28,22,19,0.6)]',
        className,
      )}
    >
      {/* Perforated edge: the two halves of a ticket, drawn not photographed. */}
      <span aria-hidden="true" className="absolute inset-y-0 left-[3.25rem] hidden w-0 border-l-2 border-dashed border-ink/15 sm:block" />
      <span aria-hidden="true" className="absolute -left-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-cream-200 ring-1 ring-ink/10 sm:block" />

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:pl-[4.25rem]">
        <div>
          <p className="eyebrow text-ink-400">Booking reference</p>
          <p className="display mt-1 text-[clamp(1.5rem,5.5vw,2.15rem)] leading-none text-ink">{booking.ref}</p>
        </div>
        <p
          className={cn(
            'inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-[0.72rem] font-bold tracking-[0.08em] uppercase',
            status.cls,
          )}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.label}
        </p>
      </header>

      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:pl-[4.25rem] sm:grid-cols-2">
        <Row label="Date and time" value={`${formatDay(booking.booked_for)}, ${booking.slot}`} />
        <Row label="Guests" value={`${booking.party_size} guest${booking.party_size === 1 ? '' : 's'}`} />
        <Row label="Name" value={booking.name} />
        <Row label="Phone" value={booking.phone} />
        <div className="sm:col-span-2">
          <dt className="eyebrow text-ink-400">Table and chairs</dt>
          <dd className="mt-1 font-semibold text-ink">{describeSeats(booking.chairs)}</dd>
        </div>
        {booking.note.trim() && (
          <div className="sm:col-span-2">
            <dt className="eyebrow text-ink-400">Note for the floor</dt>
            <dd className="mt-1 text-ink-600">{booking.note}</dd>
          </div>
        )}
      </dl>

      <p className="mt-5 sm:pl-[4.25rem] text-sm text-ink-600">
        {status.note}. Quote {booking.ref} at the door — the kitchen still phones{' '}
        <a
          href={restaurant.phone.href}
          className="font-semibold text-ink underline decoration-2 underline-offset-4"
        >
          {restaurant.phone.display}
        </a>{' '}
        to confirm the table.
      </p>

      <Link
        to={`/ticket/${booking.ref}`}
        className="mt-4 inline-flex items-center gap-2 sm:pl-[4.25rem] text-sm font-bold text-ember-700 no-underline hover:text-ink"
      >
        Open this ticket
        <span aria-hidden="true">→</span>
      </Link>

      {/* Only a confirmed table gets a file to keep; a cancelled one is not offered as a ticket. */}
      {booking.status === 'active' && <TicketDownload booking={booking} className="mt-5 sm:pl-[4.25rem]" />}
    </article>
  )
}

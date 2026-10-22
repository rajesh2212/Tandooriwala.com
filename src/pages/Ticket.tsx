import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, PageIntro } from '../components/ui'
import { TicketCard } from '../components/TicketCard'
import { ArrowRight } from '../components/Icons'
import { fetchTicket, useAccount } from '../lib/account'
import type { Booking } from '../lib/bookings'
import { restaurant } from '../data/restaurant'

/**
 * One ticket, full size.
 *
 * The server answers this only when the session matches the booking, so a reference
 * typed in from somebody else's message comes back as "not on this account" — the same
 * answer as a reference that does not exist, which keeps other people's tables private.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'found'; booking: Booking }
  | { kind: 'anonymous' }
  | { kind: 'missing' }
  | { kind: 'offline' }

export function Ticket() {
  const { ref = '' } = useParams()
  const { user, known } = useAccount()
  const [state, setState] = useState<State>({ kind: 'loading' })

  const wanted = ref.trim().toUpperCase()

  useEffect(() => {
    if (!known) return
    if (!user) {
      setState({ kind: 'anonymous' })
      return
    }
    let cancelled = false
    setState({ kind: 'loading' })
    void fetchTicket(wanted).then((result) => {
      if (cancelled) return
      if (result.status === 0) setState({ kind: 'offline' })
      else if (result.status === 200 && result.booking) setState({ kind: 'found', booking: result.booking })
      else setState({ kind: 'missing' })
    })
    return () => {
      cancelled = true
    }
  }, [known, user, wanted])

  if (state.kind === 'found') {
    return (
      <>
        <Seo
          title={`Ticket ${state.booking.ref} — Tandooriwala Bhadrak`}
          description="Your table booking, with the reference to quote at the door."
          noindex
        />
        <PageIntro
          eyebrow="Your table"
          title={state.booking.ref}
          slug="ticket"
          back="/profile"
          lead={`${state.booking.name} — ${state.booking.slot} on ${state.booking.booked_for}. Quote this reference at the door.`}
          aside={
            <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
              <p className="eyebrow text-saffron">Something changed?</p>
              <a
                href={restaurant.phone.href}
                className="mt-2 inline-flex items-center gap-2 text-xl font-bold text-cream no-underline hover:text-saffron"
              >
                {restaurant.phone.display}
              </a>
              <p className="mt-2 text-sm text-cream/70">
                A held table is not a guaranteed one until the floor has phoned — call them to move or drop it.
              </p>
            </div>
          }
        />
        <section className="pad-x py-[clamp(2.5rem,6vw,4.5rem)]">
          <div className="mx-auto max-w-2xl">
            <TicketCard booking={state.booking} />
            <div className="mt-7 flex flex-wrap gap-3">
              <Pill to="/profile" variant="ink" tilt="left">
                All my bookings
                <ArrowRight className="h-4 w-4" />
              </Pill>
              <Pill to="/book" variant="outline">
                Book another table
              </Pill>
            </div>
            <HandNote className="mt-6">keep the number — the floor reads it out at the door</HandNote>
          </div>
        </section>
      </>
    )
  }

  const blocked =
    state.kind === 'anonymous'
      ? {
          heading: 'Sign in to open this ticket',
          body: 'A ticket is only readable by the account that made it. Sign in and come back to this page, or use the reference at the door.',
        }
      : state.kind === 'offline'
        ? {
            heading: 'The booking service is not reachable',
            body: 'Nothing is wrong with your ticket — this browser could not reach the restaurant server to read it. Try again shortly, or call the kitchen.',
          }
        : {
            heading: 'That ticket is not on this account',
            body: `Nothing here matches ${wanted || 'that reference'} for the signed-in account. It may be a booking made without signing in, in which case it belongs to the phone number on it — the kitchen can find it on a call.`,
          }

  return (
    <>
      <Seo
        title={`${blocked.heading} — Tandooriwala Bhadrak`}
        description="Table bookings are only readable by the account that made them."
        noindex
      />
      <PageIntro
        eyebrow="Your table"
        title="Ticket"
        slug="ticket"
        back="/profile"
        lead={`Looking up ${wanted || 'a booking'} in the restaurant's booking list.`}
      />
      <section className="pad-x py-[clamp(2.5rem,6vw,4.5rem)]">
        {state.kind === 'loading' ? (
          <p role="status" className="mx-auto max-w-xl rounded-[1.5rem] border border-ink/12 bg-cream-200 p-7 text-ink-600">
            Fetching the ticket…
          </p>
        ) : (
          <Reveal className="mx-auto max-w-xl rounded-[1.5rem] border-2 border-ember-700/40 bg-cream p-7 sm:p-9">
            <p role="alert" className="display text-[clamp(1.4rem,4.5vw,2.1rem)] text-ink">
              {blocked.heading}
            </p>
            <p className="mt-3 text-ink-600">{blocked.body}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {state.kind === 'anonymous' ? (
                <>
                  <Link
                    to="/account"
                    state={{ from: `/ticket/${wanted}` }}
                    className="pill -rotate-[1.6deg] bg-ember text-cream no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0"
                  >
                    Sign in
                  </Link>
                  <Pill to="/book" variant="outline">
                    Book a table
                  </Pill>
                </>
              ) : (
                <>
                  <Pill to="/profile" variant="ink">
                    My profile
                  </Pill>
                  <Pill href={restaurant.phone.href} variant="saffron">
                    Call the kitchen
                  </Pill>
                </>
              )}
            </div>
          </Reveal>
        )}
      </section>
    </>
  )
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MapLegend, PrivateRoomMap, TableMap } from '../components/TableMap'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { TicketCard } from '../components/TicketCard'
import { HandNote, PageIntro, Pending } from '../components/ui'
import { ArrowRight, Phone } from '../components/Icons'
import { restaurant } from '../data/restaurant'
import { cn } from '../lib/cn'
import { useAccount } from '../lib/account'
import {
  createBooking,
  describeSeats,
  fetchAvailability,
  type Availability,
  type Booking,
  type Room,
  type TicketErrors,
} from '../lib/bookings'
import { addDays, elsewhereOnTheClock, formatDay, localDay } from '../lib/format'
import { tabArrowKeys } from '../lib/tabKeys'

const stepNames = ['Seating', 'Chairs', 'Details', 'Confirm'] as const

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null
}

const labelClass = 'block font-semibold text-ink'
const hintClass = 'mt-1 text-sm text-ink-600'
const errorClass = 'mt-1.5 text-sm font-semibold text-ember-700'
const inputClass =
  'mt-2 w-full rounded-2xl border-2 border-ink/15 bg-white/80 px-4 py-3 text-ink transition-colors placeholder:text-ink-400 focus:border-ember'

export function Book() {
  const { user } = useAccount()
  const [date, setDate] = useState(() => localDay())
  /** Once the customer picks a date it is theirs; the server's day stops overriding it. */
  const dateTouched = useRef(false)
  const [slot, setSlot] = useState<string | null>(null)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [room, setRoom] = useState<Room>('hall')
  const [seats, setSeats] = useState<string[]>([])
  const [partyTouched, setPartyTouched] = useState(false)
  const [party, setParty] = useState('2')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [step, setStep] = useState(0)
  const [fields, setFields] = useState<TicketErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState<Booking | null>(null)
  const [reload, setReload] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)

  // A signed-in customer's details are already on file; fill the ticket from them,
  // but never over something the customer has typed here.
  useEffect(() => {
    if (!user) return
    setName((current) => (current ? current : user.name))
    setPhone((current) => (current ? current : user.phone))
  }, [user])

  // Availability comes from the server for whatever date+slot is in the state, so
  // the map can never show a chair the database has already handed out.
  useEffect(() => {
    if (confirmed) return
    let ignored = false
    setLoading(true)
    void fetchAvailability(date, slot).then((result) => {
      if (ignored) return
      if (!result) {
        setOffline(true)
        setLoading(false)
        return
      }
      setOffline(false)
      setAvailability(result)
      // The form opened on the phone's date. The restaurant's own date is the one the room
      // is being held for, so follow it — unless the customer has already chosen a day.
      if (!dateTouched.current && result.today && result.today !== date) setDate(result.today)
      const usable = slot !== null && result.slots.includes(slot) && !result.passed.includes(slot)
      if (!usable) {
        // Jump to the first seating still open on this date; if there is none the
        // map stays empty and the copy tells the customer to pick another day.
        setSlot(result.slots.find((time) => !result.passed.includes(time)) ?? null)
        setLoading(false)
        return
      }
      const hallHeld = new Set(result.taken)
      const coupleHeld = new Set(result.takenCouples)
      setSeats((current) => current.filter((seat) => !(hallHeld.has(seat) || coupleHeld.has(seat))))
      setLoading(false)
    })
    return () => {
      ignored = true
    }
  }, [date, slot, reload, confirmed])

  useEffect(() => {
    if (confirmed) doneRef.current?.focus()
    else headingRef.current?.focus()
  }, [confirmed, step])

  const fresh = availability && availability.slot === slot ? availability : null
  const hallTaken = fresh?.taken ?? []
  const coupleTaken = fresh?.takenCouples ?? []
  const slots = availability?.slots ?? []
  const passed = availability?.passed ?? []
  /** The first date the restaurant will accept, from its own clock rather than this phone's. */
  const dayFloor = availability?.today ?? localDay()
  const onAnotherClock = availability ? elsewhereOnTheClock(availability.timezone) : false
  const plan = availability?.floorPlan ?? null
  const diningRoom = availability?.diningRoom ?? null
  const couples = diningRoom?.couples ?? []
  const guestsPerCouple = couples[0]?.guests ?? 2
  const coupleLimit = diningRoom?.limit.couples ?? 2
  const noTimingsLeft = !loading && slots.length > 0 && passed.length === slots.length

  /** A couple table holds two guests; every hall chair holds one. */
  const capacity = room === 'private' ? seats.length * guestsPerCouple : seats.length
  const chosenParty = room === 'private' ? String(capacity) : partyTouched ? party : String(capacity || 1)
  const maxParty = Math.max(capacity, 1)

  function switchRoom(next: Room) {
    if (next === room) return
    setRoom(next)
    // One booking lives in one room, so the other room's picks have to go.
    setSeats([])
    setPartyTouched(false)
    setNotice(null)
    setFields({})
  }

  const roomTabs: { key: Room; label: string; note: string }[] = [
    { key: 'hall', label: 'Main hall', note: `${plan?.tables.length ?? 0} tables` },
    { key: 'private', label: 'Private dining room', note: `${coupleLimit} couples` },
  ]

  const roomTabKeys = tabArrowKeys({
    order: roomTabs.map((tab) => tab.key),
    current: room,
    onPick: switchRoom,
    focus: (next) => document.getElementById(`room-tab-${next}`)?.focus(),
  })

  function toggleSeat(seat: string) {
    setNotice(null)
    setFields((current) => ({ ...current, seats: undefined, partySize: undefined }))
    if (room === 'private') {
      setSeats((current) => {
        if (current.includes(seat)) return current.filter((item) => item !== seat)
        if (current.length >= coupleLimit) {
          setNotice(
            `The private dining room holds ${coupleLimit} couples in a seating — one at each table. Free a table first.`,
          )
          return current
        }
        return [...current, seat].sort()
      })
      return
    }
    setSeats((current) =>
      current.includes(seat) ? current.filter((item) => item !== seat) : [...current, seat].sort(),
    )
  }

  function goStep(next: number) {
    setFields({})
    setNotice(null)
    setStep(next)
  }

  function continueToChairs() {
    if (!slot) {
      setFields({ slot: 'Pick a seating time that has not already gone.' })
      return
    }
    // Refetch on arrival: the map is only honest if it is read at this moment.
    setReload((n) => n + 1)
    goStep(1)
  }

  function continueToDetails() {
    if (!seats.length) {
      setFields({ seats: room === 'private' ? 'Pick a table for your couple.' : 'Tap at least one free chair in the room.' })
      return
    }
    goStep(2)
  }

  function reviewDetails(event: FormEvent) {
    event.preventDefault()
    const found: TicketErrors = {}
    if (name.trim().length < 2) found.name = 'Tell us who the table is for.'
    if (!phoneDigits(phone)) found.phone = 'A 10-digit Indian mobile number, so the floor can call back.'
    const size = Number(chosenParty)
    if (!Number.isInteger(size) || size < 1) found.partySize = 'How many guests?'
    else if (size > capacity)
      found.partySize = `That is ${capacity} guest${capacity === 1 ? '' : 's'} at most — one per chair you picked.`
    setFields(found)
    if (Object.keys(found).length) return
    goStep(3)
  }

  async function confirmBooking() {
    setSending(true)
    setNotice(null)
    const result = await createBooking({
      date,
      slot: slot ?? '',
      seats,
      name,
      phone,
      partySize: Number(chosenParty),
      note,
      company: honeypot,
    })
    setSending(false)

    if (result.ok) {
      // The reference only appears once the row exists, because this is the row.
      setConfirmed(result.booking)
      return
    }
    if (result.reason === 'conflict') {
      goStep(1)
      setReload((n) => n + 1)
      // After goStep, which clears the panel's messages.
      setNotice(
        `${describeSeats(result.seats)} went to another customer while you were choosing. ` +
          'The map has been refreshed — pick again and confirm.',
      )
      return
    }
    if (result.reason === 'rejected') {
      goStep(result.fields.seats ? 1 : result.fields.slot ? 0 : 2)
      setFields(result.fields)
      return
    }
    setNotice(
      result.reason === 'rate-limited'
        ? 'Too many attempts from this connection. Please call the kitchen instead.'
        : 'The booking service is not reachable. Nothing was saved — please call the kitchen.',
    )
  }

  if (confirmed) {
    return (
      <>
        <Seo
          title="Table requested — Tandooriwala Bhadrak"
          description="Your chairs are held in the restaurant's booking list. The kitchen will phone to confirm."
        />
        <PageIntro
          eyebrow="Held in the booking list"
          title="Booked"
          slug="table"
          back="/"
          lead={`${formatDay(confirmed.booked_for)} at ${confirmed.slot}. ${describeSeats(confirmed.chairs)}.`}
          aside={
            <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
              <p className="eyebrow text-saffron">Your reference</p>
              <p className="display mt-2 text-[clamp(2rem,7vw,3rem)] text-cream">{confirmed.ref}</p>
              <p className="mt-2 text-sm text-cream/70">Quote this at the door, or when you phone.</p>
            </div>
          }
        />
        <section className="pad-x py-[clamp(3rem,7vw,5rem)]">
          <div ref={doneRef} tabIndex={-1} role="status" className="max-w-2xl">
            <TicketCard booking={confirmed} />
            <p className="mt-6 text-ink-600">
              Those seats are now blocked for everyone else at {confirmed.slot} on{' '}
              {formatDay(confirmed.booked_for)}. The floor still phones{' '}
              <a
                href={restaurant.phone.href}
                className="font-semibold text-ink underline decoration-2 underline-offset-4"
              >
                {restaurant.phone.display}
              </a>{' '}
              to confirm — this is not a payment and not a guarantee until somebody answers.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {user && (
                <Pill to="/profile" variant="saffron" tilt="left">
                  See it under My Bookings
                  <ArrowRight className="h-4 w-4" />
                </Pill>
              )}
              <Pill to="/menu" variant="outline">
                Look at the menu
              </Pill>
              <Pill to="/" variant="outline">
                Back to the front page
              </Pill>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <Seo
        title="Book a table — Tandooriwala Bhadrak"
        description="Pick a seating time, choose the exact chairs you want on the floor plan, and leave the kitchen a number to call back."
        image="/images/dish-biryani-800.jpg"
      />

      <PageIntro
        eyebrow="Reservations"
        title="Book a table"
        slug="table"
        back="/"
        lead="Choose a seating, then the chairs themselves. Red ones are already held by another customer, so what you see free is what the kitchen has recorded as free."
        aside={
          <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
            <p className="eyebrow text-saffron">In a hurry?</p>
            <a
              href={restaurant.phone.href}
              className="mt-2 inline-flex items-center gap-2 text-xl font-bold text-cream no-underline hover:text-saffron"
            >
              <Phone className="h-5 w-5 text-saffron" />
              {restaurant.phone.display}
            </a>
            <p className="mt-2 text-sm text-cream/70">
              {user
                ? `Booking as ${user.name}. The ticket goes under My Bookings on your account.`
                : 'No card details, no account needed. Just a name, a number and the chairs you want.'}
            </p>
          </div>
        }
      />

      <section className="pad-x py-[clamp(2.5rem,6vw,4.5rem)]">
        <ol className="flex flex-wrap gap-x-2 gap-y-2 text-sm">
          {stepNames.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => index < step && goStep(index)}
                disabled={index > step}
                aria-current={index === step ? 'step' : undefined}
                className={cn(
                  'pill border-2 text-[0.85rem] no-underline',
                  index === step
                    ? 'border-ink bg-ink text-cream'
                    : index < step
                      ? 'cursor-pointer border-ink/25 bg-white/70 text-ink hover:border-ink'
                      : 'cursor-default border-ink/12 bg-transparent text-ink-400',
                )}
              >
                <span aria-hidden="true" className="font-bold">
                  {index + 1}
                </span>
                {label}
              </button>
              {index < stepNames.length - 1 && (
                <span aria-hidden="true" className="text-ink-400">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <Reveal className="mt-7 rounded-[1.5rem] border border-ink/12 bg-cream-200 p-6 sm:p-8 lg:p-10">
          <div aria-live="polite" className="sr-only">
            {loading ? 'Checking which chairs are free.' : ''}
          </div>

          {offline && (
            <p role="alert" className="mb-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
              The booking service is not reachable right now, so no chairs are shown and nothing can be
              held. Please call{' '}
              <a href={restaurant.phone.href} className="font-semibold underline decoration-2 underline-offset-4">
                {restaurant.phone.display}
              </a>{' '}
              instead.
            </p>
          )}

          <h2
            ref={headingRef}
            tabIndex={-1}
            className="display text-[clamp(1.5rem,4.5vw,2.2rem)] text-ink"
          >
            {step === 0 && 'When are you eating?'}
            {step === 1 && 'Pick your seats'}
            {step === 2 && 'Who is the table for?'}
            {step === 3 && 'Check it, then we hold it'}
          </h2>

          {step === 0 && (
            <div className="mt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="book-date" className={labelClass}>
                    Date<span className="text-ember-700"> *</span>
                  </label>
                  <input
                    id="book-date"
                    name="date"
                    type="date"
                    min={dayFloor}
                    max={addDays(dayFloor, 366)}
                    required
                    aria-required="true"
                    aria-invalid={fields.date ? true : undefined}
                    aria-describedby={fields.date ? 'book-date-error' : undefined}
                    value={date}
                    onChange={(event) => {
                      dateTouched.current = true
                      setDate(event.target.value)
                      setSeats([])
                      setFields({})
                    }}
                    className={cn(inputClass, fields.date && 'border-ember-700')}
                  />
                  {fields.date && (
                    <p id="book-date-error" className={errorClass}>
                      {fields.date}
                    </p>
                  )}
                </div>
                <div>
                  <span className={labelClass} id="book-slot-label">
                    Seating time<span className="text-ember-700"> *</span>
                  </span>
                  <div role="radiogroup" aria-labelledby="book-slot-label" className="mt-3 flex flex-wrap gap-2">
                    {slots.map((time) => {
                      const gone = passed.includes(time)
                      const active = slot === time
                      return (
                        <label
                          key={time}
                          className={cn(
                            'chip-focus rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                            gone
                              ? 'cursor-not-allowed border-ink/12 bg-transparent text-ink-400 line-through'
                              : active
                                ? 'cursor-pointer border-ink bg-ink text-cream'
                                : 'cursor-pointer border-ink/15 bg-white/70 text-ink hover:border-ink/40',
                          )}
                        >
                          <input
                            type="radio"
                            name="slot"
                            value={time}
                            checked={active}
                            disabled={gone}
                            onChange={() => {
                              setSlot(time)
                              setSeats([])
                              setFields({})
                              setNotice(null)
                            }}
                            className="sr-only"
                          />
                          {time}
                          {gone && <span className="sr-only"> — this seating has already gone</span>}
                        </label>
                      )
                    })}
                    {!slots.length && (
                      <span className="text-sm text-ink-600">
                        {loading ? 'Loading seatings…' : 'No seating times yet.'}
                      </span>
                    )}
                  </div>
                  {fields.slot && <p className={errorClass}>{fields.slot}</p>}
                </div>
              </div>

              {noTimingsLeft ? (
                <p className="mt-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
                  Every seating on {formatDay(date)} has already gone. Pick another day.
                </p>
              ) : (
                <p className={hintClass}>
                  These times are setup values in the booking config, not published opening hours —{' '}
                  <Pending>Confirm with the restaurant</Pending>
                </p>
              )}

              {onAnotherClock && (
                <p className={hintClass}>
                  Every hour here is on the restaurant's clock — {availability?.timezone}, where the
                  kitchen is — not this device's. A seating at 20:00 opens at 20:00 in Bhadrak.
                </p>
              )}

              <div className="mt-7">
                <button
                  type="button"
                  onClick={continueToChairs}
                  disabled={!slot || loading || offline}
                  className="pill -rotate-[1.6deg] bg-saffron px-[1.75rem] py-[0.95rem] text-[1.05rem] text-ink no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? 'Checking the room…' : 'Choose seats'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 1 && plan && (
            <div className="mt-5">
              <div
                role="tablist"
                aria-label="Which part of the restaurant"
                className="mt-6 flex flex-wrap gap-2"
                onKeyDown={roomTabKeys}
              >
                {roomTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={`room-tab-${tab.key}`}
                    aria-selected={room === tab.key}
                    aria-controls={room === tab.key ? `room-panel-${tab.key}` : undefined}
                    onClick={() => switchRoom(tab.key)}
                    className={cn(
                      'min-h-[2.9rem] rounded-full border-2 px-4 py-2 text-left text-sm font-bold transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
                      room === tab.key
                        ? 'border-ink bg-ink text-cream'
                        : 'cursor-pointer border-ink/20 bg-white/70 text-ink hover:border-ink',
                    )}
                  >
                    {tab.label}{' '}
                    <span className={cn('font-normal', room === tab.key ? 'text-cream/70' : 'text-ink-400')}>
                      {tab.note}
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-5 text-ink-600">
                {formatDay(date)} at {slot}.{' '}
                {room === 'private'
                  ? `Pick a table — each one holds one couple, ${coupleLimit} tables in the room.`
                  : 'Tap the chairs you want — one chair is one guest.'}{' '}
                {seats.length
                  ? `${seats.length} selected (${capacity} guest${capacity === 1 ? '' : 's'}).`
                  : 'Nothing picked yet.'}
              </p>
              <p className="sr-only" aria-live="polite">
                {seats.length ? `Selected: ${describeSeats(seats)}` : 'No seats selected.'}
              </p>

              {notice && (
                <p role="alert" className="mt-4 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
                  {notice}
                </p>
              )}
              {fields.seats && (
                <p role="alert" className="mt-4 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
                  {fields.seats}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <MapLegend />
                <button
                  type="button"
                  onClick={() => setReload((n) => n + 1)}
                  className="text-sm font-semibold text-ink underline decoration-2 underline-offset-4 hover:text-ember-700"
                >
                  Refresh availability
                </button>
              </div>

              {loading ? (
                <p className="mt-6 text-ink-600">Loading the room…</p>
              ) : (
                <div
                  role="tabpanel"
                  id={`room-panel-${room}`}
                  aria-labelledby={`room-tab-${room}`}
                  tabIndex={-1}
                  className="mt-6"
                >
                  {room === 'hall' ? (
                    <TableMap
                      floorPlan={plan}
                      taken={hallTaken}
                      selected={seats}
                      onToggle={toggleSeat}
                      onOpenPrivate={() => switchRoom('private')}
                    />
                  ) : (
                    diningRoom && (
                      <PrivateRoomMap
                        diningRoom={diningRoom}
                        taken={coupleTaken}
                        selected={seats}
                        onToggle={toggleSeat}
                      />
                    )
                  )}
                  <p className={cn(hintClass, 'mt-2')}>
                    {room === 'private'
                      ? 'The two chairs facing each other are one couple. The side chairs are drawn for scale and cannot be booked, so they never add to the room’s limit.'
                      : 'The layout is the setup floor plan in the booking config. Swipe sideways on a phone to see the whole room.'}
                  </p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={continueToDetails}
                  disabled={!seats.length || loading}
                  className="pill -rotate-[1.6deg] bg-saffron px-[1.75rem] py-[0.95rem] text-[1.05rem] text-ink no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {seats.length
                    ? `Next — ${describeSeats(seats)}`
                    : room === 'private'
                      ? 'Pick a table first'
                      : 'Pick a chair first'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goStep(0)}
                  className="pill border-2 border-ink bg-transparent text-ink no-underline hover:bg-ink hover:text-cream"
                >
                  Change date or time
                </button>
              </div>
            </div>
          )}

          {step === 1 && !plan && <p className="mt-4 text-ink-600">The room could not be loaded.</p>}

          {step === 2 && (
            <form onSubmit={reviewDetails} noValidate className="mt-6">
              <div className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="book-company">Leave this field empty</label>
                <input
                  id="book-company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>

              {Object.keys(fields).length > 0 && (
                <div role="alert" className="mb-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4">
                  <p className="font-bold text-ink">Check these before confirming</p>
                  <ul className="mt-2 space-y-1 text-sm text-ember-700">
                    {Object.values(fields)
                      .filter(Boolean)
                      .map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                  </ul>
                </div>
              )}

              {user && (
                <p className="mb-6 rounded-2xl border-2 border-ink/12 bg-white/60 p-4 text-sm text-ink-600">
                  Signed in as <span className="font-semibold text-ink">{user.email}</span>. This booking will
                  appear under{' '}
                  <Link to="/profile" className="font-semibold text-ink underline decoration-2 underline-offset-4">
                    My Bookings
                  </Link>
                  .
                </p>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="book-name" className={labelClass}>
                    Name<span className="text-ember-700"> *</span>
                  </label>
                  <input
                    id="book-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    aria-required="true"
                    aria-invalid={fields.name ? true : undefined}
                    aria-describedby={fields.name ? 'book-name-error' : undefined}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={cn(inputClass, fields.name && 'border-ember-700')}
                  />
                  {fields.name && (
                    <p id="book-name-error" className={errorClass}>
                      {fields.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="book-phone" className={labelClass}>
                    Mobile number<span className="text-ember-700"> *</span>
                  </label>
                  <input
                    id="book-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    aria-required="true"
                    placeholder="98765 43210"
                    aria-invalid={fields.phone ? true : undefined}
                    aria-describedby={fields.phone ? 'book-phone-hint book-phone-error' : 'book-phone-hint'}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={cn(inputClass, fields.phone && 'border-ember-700')}
                  />
                  <p id="book-phone-hint" className={hintClass}>
                    Only used to confirm this table. Nothing is sent to a third party.
                  </p>
                  {fields.phone && (
                    <p id="book-phone-error" className={errorClass}>
                      {fields.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="book-party" className={labelClass}>
                    Guests<span className="text-ember-700"> *</span>
                  </label>
                  <input
                    id="book-party"
                    name="partySize"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxParty}
                    step={1}
                    required
                    aria-required="true"
                    readOnly={room === 'private'}
                    aria-invalid={fields.partySize ? true : undefined}
                    aria-describedby={fields.partySize ? 'book-party-hint book-party-error' : 'book-party-hint'}
                    value={chosenParty}
                    onChange={(event) => {
                      setPartyTouched(true)
                      setParty(event.target.value)
                    }}
                    className={cn(inputClass, fields.partySize && 'border-ember-700', room === 'private' && 'bg-cream-400/40')}
                  />
                  <p id="book-party-hint" className={hintClass}>
                    {room === 'private'
                      ? `${seats.length} couple table${seats.length === 1 ? '' : 's'} at ${guestsPerCouple} guests each.`
                      : `${seats.length} chair${seats.length === 1 ? '' : 's'} picked. Up to ${maxParty} guests.`}
                  </p>
                  {fields.partySize && (
                    <p id="book-party-error" className={errorClass}>
                      {fields.partySize}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <span className={labelClass}>Seats</span>
                  <p className="mt-2 text-ink">{describeSeats(seats)}</p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="book-note" className={labelClass}>
                    Anything the floor should know
                  </label>
                  <textarea
                    id="book-note"
                    name="note"
                    rows={3}
                    maxLength={300}
                    placeholder="A high chair, an allergy, a birthday plate."
                    aria-describedby="book-note-hint"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={cn(inputClass, 'resize-y')}
                  />
                  <p id="book-note-hint" className={hintClass}>
                    Optional. {300 - note.length} characters left.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="pill -rotate-[1.6deg] bg-saffron px-[1.75rem] py-[0.95rem] text-[1.05rem] text-ink no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0"
                >
                  Review booking
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goStep(1)}
                  className="pill border-2 border-ink bg-transparent text-ink no-underline hover:bg-ink hover:text-cream"
                >
                  Change seats
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="mt-6">
              {notice && (
                <p role="alert" className="mb-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
                  {notice}
                </p>
              )}
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="eyebrow text-ink-400">When</dt>
                  <dd className="mt-1 text-lg font-semibold text-ink">
                    {formatDay(date)}, {slot}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink-400">Seats</dt>
                  <dd className="mt-1 text-lg font-semibold text-ink">{describeSeats(seats)}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink-400">Name</dt>
                  <dd className="mt-1 text-lg font-semibold text-ink">{name}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink-400">Number</dt>
                  <dd className="mt-1 text-lg font-semibold text-ink">{phone}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-ink-400">Guests</dt>
                  <dd className="mt-1 text-lg font-semibold text-ink">{chosenParty}</dd>
                </div>
                {note.trim() && (
                  <div className="sm:col-span-2">
                    <dt className="eyebrow text-ink-400">Note</dt>
                    <dd className="mt-1 text-ink-600">{note}</dd>
                  </div>
                )}
              </dl>

              <p className={cn(hintClass, 'mt-6 max-w-prose')}>
                Confirming writes this booking to the restaurant&apos;s own database and blocks those seats for
                everyone else at this seating.{' '}
                {user
                  ? 'It is saved to your account, so you can read it again under My Bookings.'
                  : 'There is no payment and no deposit. An account is optional — book without one, or sign in to keep the ticket.'}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={confirmBooking}
                  disabled={sending}
                  className="pill -rotate-[1.6deg] bg-ember px-[1.75rem] py-[0.95rem] text-[1.05rem] text-cream no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0 disabled:cursor-wait disabled:opacity-70"
                >
                  {sending ? 'Holding your seats…' : 'Confirm booking'}
                </button>
                <button
                  type="button"
                  onClick={() => goStep(2)}
                  disabled={sending}
                  className="pill border-2 border-ink bg-transparent text-ink no-underline hover:bg-ink hover:text-cream disabled:opacity-60"
                >
                  Go back
                </button>
              </div>
            </div>
          )}
        </Reveal>

        <HandNote className="mt-8">the kitchen phones before it trusts a booking — as it always has</HandNote>

        <p className="mt-6 max-w-xl text-sm text-ink-600">
          Prefer to ask a person, or need a bigger table than the room shows?{' '}
          <Link
            to="/contact"
            className="font-semibold text-ink underline decoration-2 underline-offset-4 hover:text-ember-700"
          >
            Use the contact page
          </Link>{' '}
          or call {restaurant.phone.display}.
        </p>
      </section>
    </>
  )
}

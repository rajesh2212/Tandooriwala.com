import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Phone } from './Icons'
import { restaurant } from '../data/restaurant'
import { submitEnquiry, type EnquiryFieldErrors, type EnquiryKind } from '../lib/enquiry'
import { addDays, localDay } from '../lib/format'
import { cn } from '../lib/cn'

type Values = {
  kind: EnquiryKind
  name: string
  phone: string
  date: string
  time: string
  party: string
  message: string
}

const empty: Values = { kind: 'table', name: '', phone: '', date: '', time: '', party: '', message: '' }

const kinds: { value: EnquiryKind; label: string; hint: string }[] = [
  { value: 'table', label: 'Table', hint: 'Hold seats for a visit' },
  { value: 'preorder', label: 'Pre-order', hint: 'Biryani, whole birds, big plates' },
  { value: 'other', label: 'Something else', hint: 'Feedback, catering, a question' },
]

// The device's own calendar day, not the UTC one: an evening message from a phone west of
// Greenwich would otherwise be told that today is tomorrow.
const minDate = localDay()
const maxDate = addDays(minDate, 366)

function validate(values: Values): EnquiryFieldErrors {
  const errors: EnquiryFieldErrors = {}
  if (values.name.trim().length < 2) errors.name = 'Tell us who to ask for.'
  const digits = values.phone.replace(/\D/g, '')
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  if (!/^[6-9]\d{9}$/.test(ten)) errors.phone = 'A 10-digit Indian mobile number, so the kitchen can call back.'
  if (values.kind === 'table' && !values.date) errors.date = 'Pick the date you want to eat.'
  if (values.date && values.date < minDate) errors.date = 'Choose today or a future date.'
  if (values.date && values.date > maxDate) errors.date = 'That is too far ahead for us to hold.'
  if (values.kind === 'table' && !values.party) errors.party = 'How many seats?'
  if (values.party) {
    const size = Number(values.party)
    if (!Number.isInteger(size) || size < 1 || size > 60) errors.party = 'Between 1 and 60 guests.'
  }
  return errors
}

const labelClass = 'block font-semibold text-ink'
const hintClass = 'mt-1 text-sm text-ink-600'
const errorClass = 'mt-1.5 text-sm font-semibold text-ember-700'
const inputClass =
  'mt-2 w-full rounded-2xl border-2 border-ink/15 bg-white/80 px-4 py-3 text-ink transition-colors placeholder:text-ink-400 focus:border-ember'

export function EnquiryForm() {
  const [values, setValues] = useState<Values>(empty)
  const [errors, setErrors] = useState<EnquiryFieldErrors>({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const [attempt, setAttempt] = useState(0)
  const summaryRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)

  // The summary only exists after the failed submit re-renders, so focus moves
  // in an effect rather than inside the handler. Same for the confirmation.
  useEffect(() => {
    if (attempt > 0) summaryRef.current?.focus()
  }, [attempt])

  useEffect(() => {
    if (done) doneRef.current?.focus()
  }, [done])

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key as keyof EnquiryFieldErrors] ? { ...current, [key]: undefined } : current))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFailure(null)
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      setAttempt((n) => n + 1)
      return
    }
    setSending(true)
    const result = await submitEnquiry({
      kind: values.kind,
      name: values.name,
      phone: values.phone,
      date: values.date || undefined,
      time: values.time || undefined,
      party: values.party ? Number(values.party) : undefined,
      message: values.message,
      company: honeypot,
    })
    setSending(false)
    if (result.ok) {
      setDone(true)
      return
    }
    if (result.reason === 'rejected') {
      setErrors(result.fields)
      setAttempt((n) => n + 1)
      return
    }
    setFailure(
      result.reason === 'rate-limited'
        ? 'Too many messages from this connection just now. Please call the kitchen instead.'
        : 'The enquiry service is not reachable from here. Nothing was saved — please call instead.',
    )
  }

  if (done) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="rounded-[1.5rem] border border-spinach/35 bg-cream p-7 sm:p-9"
      >
        <h3 className="display text-[clamp(1.5rem,4vw,2.1rem)] text-ink">Message received</h3>
        <p className="mt-3 max-w-prose text-ink-600">
          It is sitting in the restaurant&apos;s own enquiry list, along with the number you gave us.
          Nobody is holding a table or a handi until the kitchen calls back, so if it is urgent, dial{' '}
          <a href={restaurant.phone.href} className="font-semibold text-ink underline decoration-2 underline-offset-4">
            {restaurant.phone.display}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            setValues(empty)
            setDone(false)
          }}
          className="pill mt-6 border-2 border-ink bg-transparent text-ink no-underline hover:bg-ink hover:text-cream"
        >
          Send another
        </button>
      </div>
    )
  }

  const describedBy = (id: keyof EnquiryFieldErrors) => (errors[id] ? `${id}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="relative">
      <div className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="enq-company">Leave this field empty</label>
        <input
          id="enq-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <p className="eyebrow text-ember-700">Or leave a message</p>
      <h3 className="display mt-3 text-[clamp(1.6rem,4.5vw,2.4rem)] text-ink">Send it to the kitchen</h3>
      <p className="mt-3 max-w-prose text-ink-600">
        This writes straight into the restaurant&apos;s own enquiry list — no third-party form service, no
        account, no payment. It is not online ordering: the kitchen phones you back to confirm. For seats at
        a set time,{' '}
        <Link
          to="/book"
          className="font-semibold text-ink underline decoration-2 underline-offset-4 hover:text-ember-700"
        >
          book a table
        </Link>{' '}
        instead — that one holds the chairs.
      </p>

      {Object.keys(errors).length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4"
        >
          <p className="font-bold text-ink">Check these before sending</p>
          <ul className="mt-2 space-y-1 text-sm text-ember-700">
            {Object.entries(errors).map(([field, message]) =>
              message ? (
                <li key={field}>
                  <a href={`#enq-${field}`} className="underline decoration-2 underline-offset-2">
                    {message}
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      )}

      <fieldset className="mt-7 border-0 p-0">
        <legend className={labelClass}>
          What is this about<span className="text-ember-700"> *</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {kinds.map((kind) => (
            <label
              key={kind.value}
              className={cn(
                'chip-focus cursor-pointer rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                values.kind === kind.value
                  ? 'border-ink bg-ink text-cream'
                  : 'border-ink/15 bg-white/70 text-ink hover:border-ink/40',
              )}
            >
              <input
                type="radio"
                name="kind"
                value={kind.value}
                checked={values.kind === kind.value}
                onChange={() => set('kind', kind.value)}
                className="sr-only"
              />
              {kind.label}
              <span className="sr-only"> — {kind.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="enq-name" className={labelClass}>
            Your name<span className="text-ember-700"> *</span>
          </label>
          <input
            id="enq-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy('name')}
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            className={cn(inputClass, errors.name && 'border-ember-700')}
          />
          {errors.name && (
            <p id="enq-name-error" className={errorClass}>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="enq-phone" className={labelClass}>
            Mobile number<span className="text-ember-700"> *</span>
          </label>
          <input
            id="enq-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            aria-required="true"
            placeholder="98765 43210"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={cn('enq-phone-hint', describedBy('phone')) || undefined}
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
            className={cn(inputClass, errors.phone && 'border-ember-700')}
          />
          <p id="enq-phone-hint" className={hintClass}>
            Only used to call you back.
          </p>
          {errors.phone && (
            <p id="enq-phone-error" className={errorClass}>
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="enq-date" className={labelClass}>
            Date{' '}
            {values.kind === 'table' && <span className="text-ember-700">*</span>}
          </label>
          <input
            id="enq-date"
            name="date"
            type="date"
            min={minDate}
            max={maxDate}
            aria-required={values.kind === 'table' || undefined}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy('date')}
            value={values.date}
            onChange={(event) => set('date', event.target.value)}
            className={cn(inputClass, errors.date && 'border-ember-700')}
          />
          {errors.date && (
            <p id="enq-date-error" className={errorClass}>
              {errors.date}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="enq-time" className={labelClass}>
            Time
          </label>
          <input
            id="enq-time"
            name="time"
            type="time"
            aria-invalid={errors.time ? true : undefined}
            aria-describedby={describedBy('time')}
            value={values.time}
            onChange={(event) => set('time', event.target.value)}
            className={cn(inputClass, errors.time && 'border-ember-700')}
          />
          {errors.time && (
            <p id="enq-time-error" className={errorClass}>
              {errors.time}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="enq-party" className={labelClass}>
            Guests{' '}
            {values.kind === 'table' && <span className="text-ember-700">*</span>}
          </label>
          <input
            id="enq-party"
            name="party"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            step={1}
            aria-required={values.kind === 'table' || undefined}
            aria-invalid={errors.party ? true : undefined}
            aria-describedby={describedBy('party')}
            value={values.party}
            onChange={(event) => set('party', event.target.value)}
            className={cn(inputClass, errors.party && 'border-ember-700')}
          />
          {errors.party && (
            <p id="enq-party-error" className={errorClass}>
              {errors.party}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="enq-message" className={labelClass}>
            Anything else
          </label>
          <textarea
            id="enq-message"
            name="message"
            rows={4}
            maxLength={600}
            placeholder="Allergies, a corner table, how many plates you are thinking of."
            aria-describedby="enq-message-hint"
            value={values.message}
            onChange={(event) => set('message', event.target.value)}
            className={cn(inputClass, 'resize-y')}
          />
          <p id="enq-message-hint" className={hintClass}>
            Optional. {600 - values.message.length} characters left.
          </p>
        </div>
      </div>

      {failure && (
        <p role="alert" className="mt-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
          {failure}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          className="pill -rotate-[1.6deg] bg-saffron px-[1.75rem] py-[0.95rem] text-[1.05rem] text-ink no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0 disabled:cursor-wait disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send enquiry'}
        </button>
        <a
          href={restaurant.phone.href}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-2 underline-offset-4 hover:text-ember-700"
        >
          <Phone className="h-4 w-4" />
          or call {restaurant.phone.display}
        </a>
      </div>

      <p className="mt-4 text-sm text-ink-600">
        Fields marked <span className="font-semibold text-ember-700">*</span> are required. Nothing is sent
        to a third party.
      </p>
    </form>
  )
}

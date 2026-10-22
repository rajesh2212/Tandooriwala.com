import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, PageIntro } from '../components/ui'
import { User } from '../components/Icons'
import { cn } from '../lib/cn'
import { useAccount } from '../lib/account'
import { tabArrowKeys } from '../lib/tabKeys'

/**
 * Sign in and sign up, in one place.
 *
 * An account exists for one reason here: to keep a customer's own tickets readable
 * later. No payment details, no address, no marketing list — and the password never
 * leaves this form as anything the server can read back.
 */

type Mode = 'in' | 'up'

const labelClass = 'block font-semibold text-ink'
const hintClass = 'mt-1 text-sm text-ink-600'
const errorClass = 'mt-1.5 text-sm font-semibold text-ember-700'
const inputClass =
  'mt-2 w-full rounded-2xl border-2 border-ink/15 bg-white/80 px-4 py-3 text-ink transition-colors placeholder:text-ink-400 focus:border-ember'

export function Account() {
  const { user, known, signIn, signUp } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Where the customer was headed before the sign-in wall, if we sent them there.
  const from = (location.state as { from?: string } | null)?.from ?? '/profile'

  // Already signed in? There is nothing to do on this page.
  useEffect(() => {
    if (known && user) navigate(from, { replace: true })
  }, [known, user, from, navigate])

  useEffect(() => {
    if (Object.keys(fields).length) summaryRef.current?.focus()
    else headingRef.current?.focus()
  }, [fields, mode])

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setFields({})
    setFailure(null)
  }

  const modeTabs: { key: Mode; label: string }[] = [
    { key: 'in', label: 'Sign in' },
    { key: 'up', label: 'Create an account' },
  ]

  const modeTabKeys = tabArrowKeys({
    order: modeTabs.map((tab) => tab.key),
    current: mode,
    onPick: switchMode,
    focus: (next) => document.getElementById(`account-tab-${next}`)?.focus(),
  })

  function localCheck(): boolean {
    const found: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) found.email = 'That does not look like an email address.'
    if (mode === 'up') {
      if (name.trim().length < 2) found.name = 'Tell us who the account is for.'
      if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')))
        found.phone = 'A 10-digit Indian mobile number, or leave it empty.'
    }
    if (mode === 'up' && password.length < 8) found.password = 'Use at least 8 characters.'
    else if (mode === 'up' && !/[a-z]/i.test(password)) found.password = 'Include at least one letter.'
    else if (mode === 'up' && !/\d/.test(password)) found.password = 'Include at least one number.'
    else if (mode === 'in' && !password) found.password = 'Enter your password.'
    setFields(found)
    return Object.keys(found).length === 0
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFailure(null)
    if (!localCheck()) return
    setBusy(true)
    const reply = mode === 'in' ? await signIn(email.trim(), password) : await signUp({ email: email.trim(), name, phone, password })
    setBusy(false)

    if (reply.ok && reply.user) {
      navigate(from, { replace: true })
      return
    }
    if (reply.fields) setFields(reply.fields)
    if (reply.status === 401) setFailure('Email or password is not right. Try again, or create an account below.')
    else if (reply.status === 429) setFailure(reply.hint ?? 'Too many attempts from this connection. Wait a few minutes.')
    else if (!reply.fields) setFailure(reply.hint ?? 'That did not go through. Nothing was saved.')
  }

  return (
    <>
      <Seo
        title={mode === 'in' ? 'Sign in — Tandooriwala Bhadrak' : 'Create an account — Tandooriwala Bhadrak'}
        description="Keep your table tickets in one place. An account holds your name, your number and the bookings you made."
        noindex
      />

      <PageIntro
        eyebrow="Your table tickets"
        title={mode === 'in' ? 'Sign in' : 'Create an account'}
        slug="account"
        back="/book"
        lead="An account here does one job: it keeps the tickets you have booked readable later. No card details, no delivery address, no newsletters."
        aside={
          <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
            <p className="eyebrow text-saffron">Booking without an account</p>
            <p className="mt-2 text-sm text-cream/75">
              /book works for anybody. Sign in only if you want the ticket back on a different phone.
            </p>
            <Link
              to="/book"
              className="mt-3 inline-flex items-center gap-2 font-bold text-saffron no-underline hover:text-cream"
            >
              <User className="h-5 w-5" />
              Book a table
            </Link>
          </div>
        }
      />

      <section className="pad-x py-[clamp(2.5rem,6vw,4.5rem)]">
        <Reveal className="mx-auto max-w-2xl rounded-[1.5rem] border border-ink/12 bg-cream-200 p-6 sm:p-8 lg:p-10">
          <div role="tablist" aria-label="Account" className="flex flex-wrap gap-2" onKeyDown={modeTabKeys}>
            {modeTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`account-tab-${tab.key}`}
                aria-selected={mode === tab.key}
                aria-controls="account-panel"
                onClick={() => switchMode(tab.key)}
                className={cn(
                  'min-h-[2.75rem] rounded-full border-2 px-5 text-sm font-bold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
                  mode === tab.key
                    ? 'border-ink bg-ink text-cream'
                    : 'cursor-pointer border-ink/20 bg-white/70 text-ink hover:border-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate role="tabpanel" id="account-panel" aria-labelledby={`account-tab-${mode}`} className="mt-7">
            <h2 ref={headingRef} tabIndex={-1} className="sr-only">
              {mode === 'in' ? 'Sign in to Tandooriwala Bhadrak' : 'Create a Tandooriwala Bhadrak account'}
            </h2>

            {Object.keys(fields).length > 0 && (
              <div
                ref={summaryRef}
                tabIndex={-1}
                role="alert"
                className="mb-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4"
              >
                <p className="font-bold text-ink">Check these first</p>
                <ul className="mt-2 space-y-1 text-sm text-ember-700">
                  {Object.values(fields).map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {failure && (
              <p role="alert" className="mb-6 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
                {failure}
              </p>
            )}

            <div className="grid gap-5">
              <div>
                <label htmlFor="account-email" className={labelClass}>
                  Email<span className="text-ember-700"> *</span>
                </label>
                <input
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={fields.email ? true : undefined}
                  aria-describedby={fields.email ? 'account-email-error' : undefined}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={cn(inputClass, fields.email && 'border-ember-700')}
                />
                {fields.email && (
                  <p id="account-email-error" className={errorClass}>
                    {fields.email}
                  </p>
                )}
              </div>

              {mode === 'up' && (
                <>
                  <div>
                    <label htmlFor="account-name" className={labelClass}>
                      Name on the table<span className="text-ember-700"> *</span>
                    </label>
                    <input
                      id="account-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      aria-required="true"
                      aria-invalid={fields.name ? true : undefined}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={cn(inputClass, fields.name && 'border-ember-700')}
                    />
                    {fields.name && <p className={errorClass}>{fields.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="account-phone" className={labelClass}>
                      Mobile number
                    </label>
                    <input
                      id="account-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="98765 43210"
                      aria-describedby={fields.phone ? 'account-phone-error' : 'account-phone-hint'}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className={cn(inputClass, fields.phone && 'border-ember-700')}
                    />
                    <p id="account-phone-hint" className={hintClass}>
                      Optional. It only prefills the booking form — the floor still phones whatever number is on
                      the ticket.
                    </p>
                    {fields.phone && <p id="account-phone-error" className={errorClass}>{fields.phone}</p>}
                  </div>
                </>
              )}

              <div>
                <label htmlFor="account-password" className={labelClass}>
                  Password<span className="text-ember-700"> *</span>
                </label>
                <input
                  id="account-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  required
                  aria-required="true"
                  aria-invalid={fields.password ? true : undefined}
                  aria-describedby={fields.password ? 'account-password-hint account-password-error' : 'account-password-hint'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={cn(inputClass, fields.password && 'border-ember-700')}
                />
                <p id="account-password-hint" className={hintClass}>
                  {mode === 'in'
                    ? 'Stored as a salted hash the restaurant cannot read back.'
                    : 'At least 8 characters, with one letter and one number. Stored as a salted hash, never as plain text.'}
                </p>
                {fields.password && (
                  <p id="account-password-error" className={errorClass}>
                    {fields.password}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={busy}
                className="pill -rotate-[1.6deg] bg-ember px-[1.75rem] py-[0.95rem] text-[1.05rem] text-cream no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0 disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? (mode === 'in' ? 'Checking…' : 'Creating…') : mode === 'in' ? 'Sign in' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => switchMode(mode === 'in' ? 'up' : 'in')}
                className="text-sm font-semibold text-ink underline decoration-2 underline-offset-4 hover:text-ember-700"
              >
                {mode === 'in' ? 'No account yet? Create one' : 'Already have one? Sign in'}
              </button>
            </div>
          </form>
        </Reveal>

        <HandNote className="mx-auto mt-8 max-w-2xl">an account is a folder for your tickets, nothing more</HandNote>
      </section>
    </>
  )
}

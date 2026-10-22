import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, PageIntro, Pending } from '../components/ui'
import { TicketCard } from '../components/TicketCard'
import { ArrowRight, Camera, Check, Phone, User } from '../components/Icons'
import { photoUrl, useAccount } from '../lib/account'
import { restaurant } from '../data/restaurant'
import { cn } from '../lib/cn'

/**
 * My Profile — the customer's own details and their own tickets.
 *
 * Nothing here is read from local storage: the name, the number, the picture and the
 * booking list all come from the restaurant's server for the session in this browser's
 * cookie. Another customer's tickets are not reachable from this page, and the API will
 * not hand them over either.
 */

/** Mirrors server/uploads.js, so an obvious miss is caught before it is uploaded. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 3 * 1024 * 1024

const labelClass = 'block font-semibold text-ink'
const hintClass = 'mt-1 text-sm text-ink-600'
const errorClass = 'mt-1.5 text-sm font-semibold text-ember-700'
const inputClass =
  'mt-2 w-full rounded-2xl border-2 border-ink/15 bg-white/80 px-4 py-3 text-ink transition-colors placeholder:text-ink-400 focus:border-ember'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Profile() {
  const { user, known, history, loadHistory, saveProfile, uploadPhoto, removePhoto, signOut } = useAccount()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [storing, setStoring] = useState(false)
  const [profileFailure, setProfileFailure] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoDone, setPhotoDone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLImageElement>(null)

  const picture = photoUrl(user)

  // The form is filled from the server's copy, not from what the customer typed last
  // time and abandoned, so two devices never show different pictures of the account.
  // Keyed on the two fields themselves, because a new photo changes the user object and
  // must not wipe something being typed.
  useEffect(() => {
    if (!user) return
    setName(user.name)
    setPhone(user.phone)
  }, [user?.name, user?.phone])

  useEffect(() => {
    if (user) void loadHistory()
  }, [user, loadHistory])

  if (!known) {
    return (
      <PageIntro
        eyebrow="Your account"
        title="My profile"
        slug="profile"
        back="/"
        lead="Checking who is signed in."
      />
    )
  }

  if (!user) {
    return (
      <>
        <Seo
          title="Sign in — Tandooriwala Bhadrak"
          description="Sign in to see your profile and the table tickets on your account."
          noindex
        />
        <PageIntro
          eyebrow="Your account"
          title="My profile"
          slug="profile"
          back="/"
          lead="Your profile and your tickets are only readable by the account they belong to, so this page needs a session."
        />
        <section className="pad-x py-[clamp(2.5rem,6vw,4.5rem)]">
          <Reveal className="mx-auto max-w-xl rounded-[1.5rem] border border-ink/12 bg-cream-200 p-7 text-center sm:p-10">
            <p className="display text-[clamp(1.4rem,4vw,2rem)] text-ink">Nobody is signed in</p>
            <p className="mt-3 text-ink-600">
              You can still book a table without an account — a ticket then belongs to the phone number on it
              rather than to a login.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Pill to="/account" variant="ember" tilt="left">
                <User className="h-4 w-4" />
                Sign in or create an account
              </Pill>
              <Pill to="/book" variant="outline">
                Book a table
              </Pill>
            </div>
          </Reveal>
        </section>
      </>
    )
  }

  async function submitDetails(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    setProfileFailure(null)
    const found: Record<string, string> = {}
    if (name.trim().length < 2) found.name = 'A name of at least two characters.'
    const digits = phone.replace(/\D/g, '')
    const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
    if (ten && !/^[6-9]\d{9}$/.test(ten)) found.phone = 'A 10-digit Indian mobile number, or leave it empty.'
    setFields(found)
    if (Object.keys(found).length) return

    setStoring(true)
    const reply = await saveProfile({ name: name.trim(), phone: ten ? `+91${ten}` : '' })
    setStoring(false)
    if (reply.ok) {
      setSaved(true)
      return
    }
    if (reply.fields) setFields(reply.fields)
    setProfileFailure(reply.hint ?? 'The change was not saved. Nothing was written.')
  }

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoDone(false)
    if (!ACCEPTED.includes(file.type)) {
      setPhotoError('A JPEG, PNG or WebP picture, please. Nothing was uploaded.')
      return
    }
    if (file.size > MAX_BYTES) {
      setPhotoError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 3 MB. Nothing was uploaded.`)
      return
    }
    setPhotoError(null)
    setPhotoBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read'))
        reader.readAsDataURL(file)
      })
      const reply = await uploadPhoto(dataUrl)
      if (reply.ok) {
        setPhotoDone(true)
        photoRef.current?.focus()
      } else {
        setPhotoError(reply.fields?.photo ?? reply.hint ?? 'The photo was not saved. Nothing was replaced.')
      }
    } catch {
      setPhotoError('The picture could not be read. Try choosing the file again.')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function dropPhoto() {
    setPhotoBusy(true)
    setPhotoError(null)
    setPhotoDone(false)
    const reply = await removePhoto()
    setPhotoBusy(false)
    if (!reply.ok) setPhotoError(reply.hint ?? 'The photo is still there — the server did not remove it.')
  }

  async function leave() {
    setLeaving(true)
    await signOut()
    setLeaving(false)
  }

  const dirty = name.trim() !== user.name.trim() || phone.trim() !== user.phone.trim()

  return (
    <>
      <Seo
        title="My profile — Tandooriwala Bhadrak"
        description="Your details and the table tickets on your account."
        noindex
      />

      <PageIntro
        eyebrow="Your account"
        title="My profile"
        slug="profile"
        back="/"
        lead="Change how the floor should address you, add a picture, and read back every table this account has held."
        aside={
          <div className="flex items-center gap-4 rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
            <span className="display grid h-14 w-14 shrink-0 place-items-center rounded-full bg-saffron text-xl text-ink">
              {picture ? (
                <img
                  ref={photoRef}
                  src={picture}
                  alt={`Photo on ${user.name}'s account`}
                  tabIndex={-1}
                  className="h-14 w-14 rounded-full object-cover focus:outline-none"
                />
              ) : (
                <span aria-hidden="true">{initials(user.name)}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-cream">{user.name}</p>
              <p className="truncate text-sm text-cream/70">{user.email}</p>
            </div>
          </div>
        }
      />

      <section className="pad-x py-[clamp(2.5rem,6vw,4.5rem)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <Reveal className="rounded-[1.5rem] border border-ink/12 bg-cream-200 p-6 sm:p-8">
            <h2 className="display text-[clamp(1.4rem,4vw,2rem)] text-ink">Your details</h2>
            <p className="mt-2 text-sm text-ink-600">
              The name here prefills the booking form. The floor still phones the number printed on each
              ticket, so a booking you already made keeps its own contact details.
            </p>

            <form onSubmit={submitDetails} noValidate className="mt-6 grid gap-5">
              <div>
                <label htmlFor="profile-name" className={labelClass}>
                  Name<span className="text-ember-700"> *</span>
                </label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  aria-required="true"
                  aria-invalid={fields.name ? true : undefined}
                  aria-describedby={fields.name ? 'profile-name-error' : undefined}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setSaved(false)
                  }}
                  className={cn(inputClass, fields.name && 'border-ember-700')}
                />
                {fields.name && (
                  <p id="profile-name-error" className={errorClass}>
                    {fields.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="profile-phone" className={labelClass}>
                  Mobile number
                </label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  aria-describedby={fields.phone ? 'profile-phone-hint profile-phone-error' : 'profile-phone-hint'}
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setSaved(false)
                  }}
                  className={cn(inputClass, fields.phone && 'border-ember-700')}
                />
                <p id="profile-phone-hint" className={hintClass}>
                  Optional — clear the field to remove it. Only a 10-digit Indian mobile number is kept.
                </p>
                {fields.phone && (
                  <p id="profile-phone-error" className={errorClass}>
                    {fields.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="profile-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={user.email}
                  readOnly
                  aria-describedby="profile-email-hint"
                  className={cn(inputClass, 'cursor-not-allowed bg-ink/5 text-ink-600')}
                />
                <p id="profile-email-hint" className={hintClass}>
                  Your email is the sign-in name, so this page will not change it.{' '}
                  <Pending>No self-service email change</Pending>
                </p>
              </div>

              {profileFailure && (
                <p role="alert" className="rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-ink">
                  {profileFailure}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={storing || !dirty}
                  className="pill -rotate-[1.6deg] bg-ink px-[1.5rem] py-[0.85rem] text-[0.95rem] text-cream no-underline transition-transform hover:-translate-y-0.5 hover:rotate-0 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {storing ? 'Saving…' : 'Save changes'}
                </button>
                {saved && (
                  <p role="status" className="inline-flex items-center gap-2 font-semibold text-spinach">
                    <Check className="h-5 w-5" />
                    Saved on the restaurant&apos;s server
                  </p>
                )}
                {!saved && !storing && !dirty && (
                  <p className="text-sm text-ink-400">Nothing to save — the details match the server.</p>
                )}
              </div>
            </form>
          </Reveal>

          <Reveal
            delay={90}
            className="rounded-[1.5rem] border border-ink/12 bg-cream p-6 sm:p-8"
          >
            <h2 className="display text-[clamp(1.4rem,4vw,2rem)] text-ink">Profile photo</h2>
            <p className="mt-2 text-sm text-ink-600">
              It sits next to your name on this page only — the floor does not use it to decide who to seat.
              JPEG, PNG or WebP, up to 3 MB.
            </p>

            <div className="mt-5 flex items-center gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-cream-200 text-ink-400 ring-1 ring-ink/12">
                {picture ? (
                  <img src={picture} alt={`Photo on ${user.name}'s account`} className="h-20 w-20 object-cover" />
                ) : (
                  <User className="h-9 w-9" />
                )}
              </span>
              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileRef}
                  id="profile-photo"
                  name="photo"
                  type="file"
                  accept={ACCEPTED.join(',')}
                  onChange={pickPhoto}
                  className="sr-only"
                />
                <label
                  htmlFor="profile-photo"
                  className={cn(
                    'pill cursor-pointer bg-ember text-cream hover:bg-ember-700',
                    photoBusy && 'pointer-events-none opacity-70',
                  )}
                >
                  <Camera className="h-4 w-4" />
                  {photoBusy ? 'Working…' : picture ? 'Replace photo' : 'Choose a photo'}
                </label>
                {picture && (
                  <button
                    type="button"
                    onClick={dropPhoto}
                    disabled={photoBusy}
                    className="pill border-2 border-ink/20 bg-transparent text-ink hover:bg-ink hover:text-cream disabled:cursor-wait disabled:opacity-55"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {photoError && (
              <p role="alert" className="mt-4 rounded-2xl border-2 border-ember-700/40 bg-shell p-4 text-sm text-ink">
                {photoError}
              </p>
            )}
            {photoDone && !photoError && (
              <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-spinach">
                <Check className="h-5 w-5" />
                Photo stored. It is resized to 512 px on the server and kept out of the public folder.
              </p>
            )}
            {!picture && !photoError && !photoDone && (
              <p className="mt-4 text-sm text-ink-400">No photo on this account yet.</p>
            )}
          </Reveal>
        </div>
      </section>

      <section className="pad-x pb-[clamp(2.5rem,6vw,4.5rem)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[clamp(1.7rem,5vw,2.6rem)] text-ink">My bookings</h2>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 text-sm font-bold text-ember-700 no-underline hover:text-ink"
          >
            Book another table
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {(history.state === 'idle' || history.state === 'loading') && (
          <p role="status" className="mt-6 rounded-[1.25rem] border border-ink/12 bg-cream-200 p-6 text-ink-600">
            Reading your tickets from the booking list…
          </p>
        )}

        {history.state === 'error' && (
          <div
            role="alert"
            className="mt-6 rounded-[1.25rem] border-2 border-ember-700/40 bg-shell p-6 text-ink"
          >
            <p className="font-semibold">The booking list is not reachable right now.</p>
            <p className="mt-2 text-sm text-ink-600">
              Nothing is lost — the tickets are still in the restaurant&apos;s database. Try again in a moment,
              or call{' '}
              <a
                href={restaurant.phone.href}
                className="inline-flex items-center gap-1.5 font-semibold underline decoration-2 underline-offset-4"
              >
                <Phone className="h-4 w-4" />
                {restaurant.phone.display}
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="pill mt-4 border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-cream"
            >
              Try again
            </button>
          </div>
        )}

        {history.state === 'ready' && history.bookings.length === 0 && (
          <Reveal className="mt-6 rounded-[1.5rem] border border-dashed border-ink/25 bg-cream-200 p-7 text-center sm:p-10">
            <p className="display text-[clamp(1.3rem,4vw,1.9rem)] text-ink">No tickets on this account yet</p>
            <p className="mx-auto mt-3 max-w-md text-ink-600">
              Bookings appear here when they are made while signed in. A table booked as a guest stays on the
              phone number it was made with, not here.
            </p>
            <div className="mt-6 flex justify-center">
              <Pill to="/book" variant="saffron" tilt="left">
                Book a table
                <ArrowRight className="h-4 w-4" />
              </Pill>
            </div>
            <HandNote className="mt-6">the kitchen phones every table before the chairs are yours</HandNote>
          </Reveal>
        )}

        {history.state === 'ready' && history.bookings.length > 0 && (
          <>
            <p className="mt-4 text-sm text-ink-600">
              {history.bookings.length} ticket{history.bookings.length === 1 ? '' : 's'} on this account. Only
              you can read them — the server checks the session before it answers.
            </p>
            <ul className="mt-6 grid gap-5 xl:grid-cols-2">
              {history.bookings.map((booking) => (
                <Reveal as="li" key={booking.ref} className="h-full">
                  <TicketCard booking={booking} className="h-full" />
                </Reveal>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="pad-x pb-[clamp(3rem,7vw,5rem)]">
        <Reveal className="rounded-[1.5rem] border border-ink/12 bg-cream p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="display text-[clamp(1.25rem,3.5vw,1.7rem)] text-ink">Signed in as {user.email}</h2>
              <p className="mt-2 text-sm text-ink-600">
                Logging out clears the session cookie on this browser. The tickets stay in the booking list and
                come back when you sign in again.
              </p>
            </div>
            {leaving ? (
              <p role="status" className="pill bg-ink/10 text-ink">
                Signing out…
              </p>
            ) : (
              <button
                type="button"
                onClick={leave}
                className="pill border-2 border-ember bg-transparent text-ember-700 hover:bg-ember hover:text-cream"
              >
                Log out
              </button>
            )}
          </div>
        </Reveal>
      </section>
    </>
  )
}

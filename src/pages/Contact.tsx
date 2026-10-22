import { Link } from 'react-router-dom'
import { EnquiryForm } from '../components/EnquiryForm'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, PageIntro, Pending } from '../components/ui'
import { ArrowUpRight, Phone, Pin } from '../components/Icons'
import { restaurant } from '../data/restaurant'

const reasons = [
  {
    title: 'Pre-order a biryani',
    body: 'Dum rice, whole tandoori birds and mutton plates need lead time, especially at weekends.',
  },
  {
    title: 'Check what is cooking',
    body: 'Seafood and seasonal sweets come and go — the kitchen can confirm the day before you travel.',
  },
  {
    title: 'Book for a group',
    body: 'Family dinners and larger tables are easier to seat when the kitchen knows how many are coming.',
  },
  {
    title: 'Say something went wrong',
    body: 'If a plate or a visit missed the mark, call and speak to whoever is running the floor.',
  },
]

export function Contact() {
  return (
    <>
      <Seo
        title="Contact — Tandooriwala Bhadrak"
        description={`Call Tandooriwala Bhadrak on ${restaurant.phone.display} for pre-orders, group tables and today's availability. Mathasahi, Bhadrak.`}
        image="/images/dish-drinks-800.jpg"
      />

      <PageIntro
        eyebrow="Talk to the kitchen"
        title="Contact"
        slug="contact"
        back="/"
        lead="One phone line, answered by the people cooking. Call for anything urgent, or send a table request and the kitchen calls back."
        aside={
          <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
            <p className="eyebrow text-saffron">Fastest route</p>
            <a
              href={restaurant.phone.href}
              className="mt-2 inline-flex items-center gap-2 text-xl font-bold text-cream no-underline hover:text-saffron"
            >
              <Phone className="h-5 w-5 text-saffron" />
              {restaurant.phone.display}
            </a>
            <p className="mt-2 text-sm text-cream/70">Tap the number to dial from your phone.</p>
          </div>
        }
      />

      <section className="pad-x py-[clamp(3rem,7vw,5.5rem)]">
        <Reveal className="relative overflow-hidden rounded-[1.75rem] on-dark bg-ink p-7 text-cream sm:p-10 lg:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                'radial-gradient(55% 60% at 12% 10%, rgba(224,138,30,0.3) 0%, transparent 65%), radial-gradient(45% 55% at 92% 88%, rgba(194,65,12,0.35) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <p className="eyebrow text-saffron">Call us</p>
            <a
              href={restaurant.phone.href}
              className="display mt-4 block w-fit text-[clamp(2.1rem,10vw,6.5rem)] text-cream no-underline transition-colors duration-300 hover:text-saffron"
            >
              {restaurant.phone.display}
            </a>
            <p className="mt-4 max-w-xl text-cream/75">
              Tap-to-call on mobile, click-to-dial on desktop. If nobody picks up, the line is busy with
              the pass — try once more in a few minutes.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Pill href={restaurant.phone.href} variant="saffron" size="lg" tilt="left">
                <Phone className="h-5 w-5" />
                Call now
              </Pill>
              <Pill
                href={restaurant.mapUrl}
                variant="outline-cream"
                size="lg"
              >
                <Pin className="h-5 w-5" />
                Get directions
              </Pill>
              {restaurant.whatsappConfirmed ? (
                <Pill
                  href={`https://wa.me/${restaurant.phone.href.replace(/\D/g, '').slice(2)}`}
                  variant="cream"
                  size="lg"
                >
                  Message on WhatsApp
                </Pill>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-cream/35 px-4 py-2.5 text-sm text-cream/70">
                  WhatsApp <Pending>Unconfirmed</Pending>
                </span>
              )}
            </div>
            <p className="mt-4 text-sm text-cream/55">
              WhatsApp is not listed until the number is confirmed active there — no guessed links.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="pad-x pb-[clamp(3rem,7vw,5rem)]">
        <h2 className="display display-mid text-ink">What to call about</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {reasons.map((reason, index) => (
            <Reveal
              as="li"
              key={reason.title}
              delay={index * 60}
              className="h-full rounded-[1.25rem] bg-cream-200 p-6 ring-1 ring-ink/8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_44px_-28px_rgba(28,22,19,0.5)]"
            >
              <span aria-hidden="true" className="hand text-[1.3rem] text-ember-700">
                0{index + 1}
              </span>
              <h3 className="display mt-1 text-[1.3rem] text-ink">{reason.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{reason.body}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="pad-x pb-[clamp(3rem,7vw,5rem)]">
        <Reveal className="rounded-[1.75rem] border border-ink/12 bg-cream-200 p-7 sm:p-10 lg:p-12">
          <EnquiryForm />
        </Reveal>
      </section>

      <section className="pad-x pb-[clamp(3rem,7vw,5.5rem)]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="rounded-[1.5rem] border border-ink/12 bg-cream p-7 sm:p-9">
            <h2 className="display text-[clamp(1.5rem,4vw,2.1rem)] text-ink">Walk in instead</h2>
            <address className="mt-4 not-italic text-lg text-ink-600">
              {restaurant.address.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <div className="mt-6 flex flex-wrap gap-3">
              <Pill href={restaurant.mapUrl} variant="ink">
                <Pin className="h-4 w-4" />
                Get Directions
                <ArrowUpRight className="h-4 w-4" />
              </Pill>
              <Pill to="/visit" variant="outline">
                Visiting details
              </Pill>
            </div>
          </Reveal>

          <Reveal
            delay={90}
            className="rounded-[1.5rem] border border-dashed border-ember/45 bg-shell p-7 sm:p-9"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="display text-[clamp(1.5rem,4vw,2.1rem)] text-ink">Other channels</h2>
              <Pending>To be confirmed</Pending>
            </div>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="eyebrow text-ink-400">Email</dt>
                <dd className="mt-1 text-ink-600">Not published yet.</dd>
              </div>
              <div>
                <dt className="eyebrow text-ink-400">Social media</dt>
                <dd className="mt-1 text-ink-600">No official handle has been confirmed.</dd>
              </div>
              <div>
                <dt className="eyebrow text-ink-400">Online ordering</dt>
                <dd className="mt-1 text-ink-600">
                  No cart, no payment page. Use the enquiry form above to request a pre-order and the
                  kitchen phones you back. To hold seats,{' '}
                  <Link
                    to="/book"
                    className="font-semibold text-ink underline decoration-2 underline-offset-4 hover:text-ember-700"
                  >
                    book a table
                  </Link>{' '}
                  instead.
                </dd>
              </div>
            </dl>
            <HandNote className="mt-6">the phone is still the fastest inbox</HandNote>
          </Reveal>
        </div>
      </section>
    </>
  )
}

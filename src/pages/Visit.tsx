import { Link } from 'react-router-dom'
import { DishImage } from '../components/DishImage'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, PageIntro, Pending } from '../components/ui'
import { ArrowUpRight, Phone, Pin } from '../components/Icons'
import { restaurant } from '../data/restaurant'

const embedSrc = `https://maps.google.com/maps?q=${restaurant.coordinates.lat},${restaurant.coordinates.lng}&z=17&output=embed`

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function Visit() {
  return (
    <>
      <Seo
        title="Visit Us — Tandooriwala Bhadrak"
        description="Tandooriwala Bhadrak is at Khata 776/4131, Plot 1795/2671, Mathasahi, Bhadrak. Get directions on Google Maps or call ahead."
        image="/images/spread-table-800.jpg"
      />

      <PageIntro
        eyebrow="Find the table"
        title="Visit us"
        slug="visit"
        back="/"
        lead="We are in Mathasahi, Bhadrak. Tap the address into maps, or call the kitchen if you want to check what is on before you travel."
        aside={
          <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
            <p className="eyebrow text-saffron">Address</p>
            <address className="mt-2 not-italic text-cream/85">
              {restaurant.address.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={restaurant.mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron no-underline hover:text-cream"
            >
              Open in Google Maps
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        }
      />

      <section className="pad-x py-[clamp(3rem,7vw,5.5rem)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-stretch">
          <Reveal className="flex flex-col justify-between rounded-[1.5rem] on-dark bg-ink p-7 text-cream sm:p-9">
            <div>
              <p className="eyebrow text-saffron">The address</p>
              <h2 className="display mt-3 text-[clamp(1.9rem,5.5vw,3.1rem)] text-cream">
                Khata 776/4131,
                <br />
                Plot 1795/2671
              </h2>
              <address className="mt-4 not-italic text-lg text-cream/80">
                Mathasahi, Bhadrak, Odisha
              </address>
              <p className="mt-4 text-sm text-cream/60">
                Pin the plot and khata numbers straight into Google Maps — they are the reference the
                locality uses.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Pill
                href={restaurant.mapUrl}
                variant="saffron"
                size="lg"
                tilt="left"
                className="no-underline"
              >
                <Pin className="h-5 w-5" />
                Get Directions
              </Pill>
              <Pill
                href={restaurant.phone.href}
                variant="outline-cream"
                size="lg"
              >
                <Phone className="h-4 w-4" />
                {restaurant.phone.display}
              </Pill>
            </div>
          </Reveal>

          <Reveal delay={100} className="overflow-hidden rounded-[1.5rem] ring-1 ring-ink/12">
            <iframe
              title="Map showing Tandooriwala Bhadrak in Mathasahi, Bhadrak"
              src={embedSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[22rem] w-full border-0 lg:h-full lg:min-h-[24rem]"
            />
          </Reveal>
        </div>
      </section>

      <section className="pad-x pb-[clamp(3rem,7vw,5.5rem)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <Reveal className="rounded-[1.5rem] border border-dashed border-ember/45 bg-shell p-7 sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="display text-[clamp(1.6rem,4.5vw,2.4rem)] text-ink">Opening hours</h2>
              <Pending>Not published</Pending>
            </div>
            <p className="mt-3 text-ink-600">
              The restaurant has not confirmed its service hours, so none are listed here rather than
              guessed. Call ahead to check today&apos;s timing.
            </p>
            <ul className="mt-6 divide-y divide-ink/10 border-t border-ink/10">
              {weekDays.map((day) => (
                <li key={day} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="font-semibold text-ink">{day}</span>
                  <span className="text-ink-400 line-through decoration-ink/25">—</span>
                </li>
              ))}
            </ul>
            <Pill href={restaurant.phone.href} variant="ink" className="mt-6">
              <Phone className="h-4 w-4" />
              Call to check
            </Pill>
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={80} className="overflow-hidden rounded-[1.5rem] ring-1 ring-ink/10">
              <div className="aspect-[16/9]">
                <DishImage
                  slug="spread-table"
                  sizes="(min-width: 48rem) 48vw, 92vw"
                  alt="Illustrative photo: a wide North Indian feast spread across a dark table with tandoori dishes, curry, biryani and breads"
                />
              </div>
            </Reveal>

            <Reveal delay={140} className="rounded-[1.5rem] bg-cream-200 p-7 ring-1 ring-ink/8 sm:p-9">
              <h2 className="display text-[clamp(1.5rem,4vw,2.1rem)] text-ink">Good to know</h2>
              <ul className="mt-5 space-y-4 text-ink-600">
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                  <span>
                    Biryani, whole tandoori birds and mutton plates cook on time — for a group, ring first
                    so the kitchen can start early.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                  <span>
                    A table can be held on this site: <Link to="/book">pick a seating and the exact
                    chairs</Link> and the booking goes into the restaurant&apos;s own list. Ordering and
                    delivery are still not online — for those, the phone line is the only confirmed route.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                  <span>
                    Seafood availability moves with the season and the day&apos;s catch, so ask before you
                    plan around a fish plate.
                  </span>
                </li>
              </ul>
              <HandNote className="mt-6">ask for the day&apos;s catch — it is worth it</HandNote>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}

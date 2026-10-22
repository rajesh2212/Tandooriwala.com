import { Link } from 'react-router-dom'
import { navItems, restaurant } from '../data/restaurant'
import { ArrowUpRight, Phone, Pin } from './Icons'
import { Reveal } from './Reveal'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-24 overflow-hidden on-dark bg-ink text-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-ember/25 blur-[90px]"
      />

      <div className="pad-x relative pt-16 pb-8">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <Reveal className="xl:col-span-1">
            <p className="eyebrow text-saffron">{restaurant.cuisines.join(' · ')}</p>
            <p className="mt-4 max-w-xs text-cream/75">
              Clay-oven cooking in Mathasahi, Bhadrak. Come for the tandoor, stay for the biryani.
            </p>
            <p className="hand mt-4 text-[1.35rem] text-saffron">See you at the table.</p>
          </Reveal>

          <Reveal delay={60}>
            <h2 className="eyebrow text-cream/50">Navigate</h2>
            <ul className="mt-4 space-y-2.5">
              {navItems.map((nav) => (
                <li key={nav.to}>
                  <Link
                    to={nav.to}
                    className="inline-flex items-center gap-1.5 text-cream/85 no-underline transition-colors hover:text-saffron"
                  >
                    {nav.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <h2 className="eyebrow text-cream/50">Find us</h2>
            <address className="mt-4 not-italic text-cream/85">
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
              className="mt-3 inline-flex items-center gap-1.5 font-semibold text-saffron no-underline transition-colors hover:text-cream"
            >
              <Pin className="h-4 w-4" />
              Get directions
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <p className="mt-4 text-sm text-cream/55">
              Opening hours are not published yet — call ahead to check today&apos;s service.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <h2 className="eyebrow text-cream/50">Talk to us</h2>
            <a
              href={restaurant.phone.href}
              className="mt-4 inline-flex items-center gap-2 text-lg font-semibold text-cream no-underline transition-colors hover:text-saffron"
            >
              <Phone className="h-5 w-5 text-saffron" />
              {restaurant.phone.display}
            </a>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/contact"
                className="pill border-2 border-cream/25 bg-transparent text-cream no-underline hover:bg-cream hover:text-ink"
              >
                Contact page
              </Link>
              <Link to="/menu" className="pill bg-saffron text-ink no-underline hover:bg-cream">
                Browse menu
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-cream/12 pt-6 text-sm text-cream/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {restaurant.legalName}. All rights reserved.
          </p>
          <p>Food photography on this site is illustrative, not shots of this kitchen.</p>
        </div>
      </div>

      {/* Shrikhand "Tandooriwala" measures 7.92em wide at its 0.03em tracking, so
          dividing the available content width by a padded 8.25 keeps the wordmark
          inside the page padding at every viewport. text-center splits the leftover
          slack evenly instead of leaving a gap on the right. */}
      <div className="pad-x select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <span
          aria-hidden="true"
          className="wordmark block text-center leading-[0.78] whitespace-nowrap text-cream/10"
          style={{ fontSize: 'clamp(2.2rem, calc((100vw - 2 * var(--page-pad)) / 8.25), 17rem)' }}
        >
          Tandooriwala
        </span>
      </div>
    </footer>
  )
}

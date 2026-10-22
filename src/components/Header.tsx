import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { navItems, restaurant } from '../data/restaurant'
import { photoUrl, useAccount } from '../lib/account'
import { cn } from '../lib/cn'
import { ArrowUpRight, Close, Flame, MenuIcon, Phone, User } from './Icons'

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

export function Brand({ tone = 'ink' }: { tone?: 'ink' | 'cream' }) {
  return (
    <Link
      to="/"
      className={cn(
        'group flex items-center gap-2.5 no-underline',
        tone === 'cream' ? 'text-cream' : 'text-ink',
      )}
      aria-label={`${restaurant.name} — home`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-saffron text-ink transition-transform duration-300 group-hover:rotate-12">
        <Flame className="h-5 w-5" />
      </span>
      <span className="leading-none">
        <span className="wordmark block text-[1.15rem] sm:text-[1.3rem]">Tandooriwala</span>
        <span className="eyebrow mt-1 block text-[0.6rem] opacity-70">Bhadrak</span>
      </span>
    </Link>
  )
}

/**
 * The account entry. It reserves its own width before `/auth/me` answers, so the
 * header does not jump when the session is read.
 */
function AccountChip({ tone }: { tone: 'ink' | 'cream' }) {
  const { user, known } = useAccount()
  const picture = photoUrl(user)

  if (!known) {
    return <span aria-hidden="true" className="hidden h-9 w-9 lg:block" />
  }

  if (!user) {
    return (
      <Link
        to="/account"
        className={cn(
          'pill border-2 text-[0.85rem] no-underline',
          tone === 'cream'
            ? 'border-cream/45 bg-transparent text-cream hover:bg-cream hover:text-ink'
            : 'border-ink/20 bg-transparent text-ink hover:bg-ink hover:text-cream',
        )}
      >
        <User className="h-4 w-4" />
        <span className="hidden xl:inline">Sign in</span>
        <span className="sr-only xl:hidden">Sign in</span>
      </Link>
    )
  }

  return (
    <Link
      to="/profile"
      aria-label={`My profile — signed in as ${user.name}`}
      className={cn(
        'flex min-h-[2.75rem] items-center gap-2 rounded-full border-2 px-2 no-underline transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
        tone === 'cream'
          ? 'border-cream/45 text-cream hover:bg-cream hover:text-ink'
          : 'border-ink/20 text-ink hover:bg-ink hover:text-cream',
      )}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-saffron text-[0.7rem] font-bold text-ink">
        {picture ? <img src={picture} alt="" className="h-7 w-7 object-cover" /> : user.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="hidden max-w-[8ch] truncate text-[0.85rem] font-bold xl:inline">{user.name}</span>
    </Link>
  )
}

export function Header() {
  const location = useLocation()
  const scrolled = useScrolled()
  const { user, known } = useAccount()
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const overHero = location.pathname === '/' && !scrolled
  const tone = overHero ? 'cream' : 'ink'

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-nav transition-[background-color,box-shadow,padding] duration-300',
        overHero
          ? 'bg-transparent py-4'
          : 'bg-cream/92 py-3 shadow-[0_1px_0_rgba(28,22,19,0.12)] backdrop-blur-md',
      )}
    >
      <div className="pad-x flex items-center justify-between gap-4">
        <Brand tone={tone} />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navItems.map((nav) => (
            <NavLink
              key={nav.to}
              to={nav.to}
              className={({ isActive }) =>
                cn(
                  'relative px-3 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.14em] no-underline transition-colors duration-200',
                  tone === 'cream' ? 'text-cream/85 hover:text-cream' : 'text-ink-600 hover:text-ink',
                  isActive && (tone === 'cream' ? 'text-cream' : 'text-ink'),
                )
              }
            >
              {({ isActive }) => (
                <>
                  {nav.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-3 -bottom-0.5 h-[3px] origin-left rounded-full bg-saffron transition-transform duration-300',
                      isActive ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AccountChip tone={tone} />
          <a
            href={restaurant.phone.href}
            className={cn(
              'pill hidden border-2 bg-transparent sm:inline-flex',
              tone === 'cream'
                ? 'border-cream/45 text-cream hover:bg-cream hover:text-ink'
                : 'border-ink/20 text-ink hover:bg-ink hover:text-cream',
            )}
          >
            <Phone className="h-4 w-4" />
            <span className="text-[0.85rem]">{restaurant.phone.display}</span>
          </a>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            className={cn(
              'pill border-2 lg:hidden',
              tone === 'cream'
                ? 'border-cream/45 bg-transparent text-cream hover:bg-cream hover:text-ink'
                : 'border-ink/20 bg-transparent text-ink hover:bg-ink hover:text-cream',
            )}
          >
            <MenuIcon className="h-5 w-5" />
            <span className="text-[0.85rem] font-bold uppercase tracking-[0.12em]">Menu</span>
          </button>
        </div>
      </div>

      {open && (
        <div
          ref={sheetRef}
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-0 z-overlay flex flex-col on-dark bg-ink text-cream"
        >
          <div className="pad-x flex items-center justify-between py-4">
            <Brand tone="cream" />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                toggleRef.current?.focus()
              }}
              className="pill border-2 border-cream/30 bg-transparent text-cream hover:bg-cream hover:text-ink"
            >
              <Close className="h-5 w-5" />
              <span className="sr-only">Close navigation</span>
            </button>
          </div>

          <nav aria-label="Mobile" className="pad-x mt-4 flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-y-auto">
            {navItems.map((nav, index) => (
              <NavLink
                key={nav.to}
                to={nav.to}
                className={({ isActive }) =>
                  cn(
                    'display flex items-baseline gap-3 border-b border-cream/12 py-3 text-[clamp(2.1rem,11vw,3.4rem)] transition-colors duration-200',
                    isActive ? 'text-saffron' : 'text-cream hover:text-saffron',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span aria-hidden="true" className="hand text-base text-cream/45">
                      0{index + 1}
                    </span>
                    {nav.label}
                    {isActive && (
                      <span className="ml-auto self-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-saffron">
                        Current
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="pad-x flex flex-wrap gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
            {known && user ? (
              <Link to="/profile" className="pill border-2 border-saffron bg-transparent text-saffron no-underline">
                <User className="h-4 w-4" />
                My profile
              </Link>
            ) : known ? (
              <Link to="/account" className="pill border-2 border-saffron bg-transparent text-saffron no-underline">
                <User className="h-4 w-4" />
                Sign in
              </Link>
            ) : null}
            <a href={restaurant.phone.href} className="pill bg-saffron text-ink no-underline">
              <Phone className="h-4 w-4" />
              {restaurant.phone.display}
            </a>
            <a
              href={restaurant.mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="pill border-2 border-cream/30 text-cream no-underline"
            >
              Get directions
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DishImage } from '../components/DishImage'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, PageIntro, Pending } from '../components/ui'
import { ArrowRight, Phone, VegMark } from '../components/Icons'
import { menuCategories, menuIsPlaceholder, type MenuCategory } from '../data/menu'
import { restaurant } from '../data/restaurant'
import { cn } from '../lib/cn'

type Diet = 'all' | 'veg' | 'nonveg'

const dietOptions: { id: Diet; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'veg', label: 'Vegetarian' },
  { id: 'nonveg', label: 'Non-veg' },
]

function filterCategory(category: MenuCategory, diet: Diet, query: string): MenuCategory {
  const needle = query.trim().toLowerCase()
  const items = category.items.filter((item) => {
    const dietOk = diet === 'all' || (diet === 'veg' ? item.veg : !item.veg)
    if (!dietOk) return false
    if (!needle) return true
    return `${item.name} ${item.note ?? ''}`.toLowerCase().includes(needle)
  })
  return { ...category, items }
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '')
  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))
    if (!sections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: [0.01, 0.25, 0.5] },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [ids.join('|')])
  return active
}

function PriceCell({ price }: { price: number | null }) {
  if (price === null) {
    return (
      <span className="font-semibold text-ink-400 tabular-nums" title="Price not confirmed yet">
        <span aria-hidden="true">₹</span> —
        <span className="sr-only">Price to be confirmed</span>
      </span>
    )
  }
  return <span className="font-semibold tabular-nums">₹ {price}</span>
}

export function Menu() {
  const location = useLocation()
  const [diet, setDiet] = useState<Diet>('all')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const visible = useMemo(
    () => menuCategories.map((category) => filterCategory(category, diet, query)).filter((category) => category.items.length),
    [diet, query],
  )
  const active = useActiveSection(useMemo(() => visible.map((category) => category.id), [visible]))
  const total = visible.reduce((sum, category) => sum + category.items.length, 0)
  const filtering = diet !== 'all' || query.trim().length > 0

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }))
  }, [location.hash, visible.length])

  return (
    <>
      <Seo
        title="Menu — Tandooriwala Bhadrak"
        description="Tandoori starters, kebabs, curries, dum biryani, Indo-Chinese plates, seafood, breads, desserts and drinks at Tandooriwala Bhadrak."
        image="/images/dish-tandoori-chicken-800.jpg"
      />

      <PageIntro
        eyebrow="The full list"
        title="Menu"
        slug="menu"
        back="/"
        lead="Nine sections, from the clay oven to the wok. Browse by category, filter for what you eat, or search for a dish."
        aside={
          <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
            <p className="eyebrow text-saffron">{menuCategories.length} sections</p>
            <p className="mt-2 text-cream/80">
              {menuCategories.reduce((sum, category) => sum + category.items.length, 0)} dish lines
              listed. Filter and search work across every section.
            </p>
          </div>
        }
      />

      {menuIsPlaceholder && (
        <div className="pad-x">
          <Reveal className="-mt-[clamp(1.5rem,4vw,2.5rem)] rounded-[1.25rem] border border-dashed border-ember/50 bg-shell p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="display text-[1.35rem] text-ink">Dish names and prices are placeholders</h2>
              <Pending>Not verified</Pending>
            </div>
            <p className="mt-3 text-ink-600">
              The restaurant has not supplied its printed list yet, so the lines below show the structure
              of the menu — every section, every slot — with prices marked <strong>₹ —</strong>. Nothing
              here should be read as a confirmed order-and-pay list. Call{' '}
              <a href={restaurant.phone.href} className="font-semibold text-ember-700 no-underline underline-offset-4 hover:underline">
                {restaurant.phone.display}
              </a>{' '}
              for what is actually cooking today.
            </p>
          </Reveal>
        </div>
      )}

      {/* Sticky browse rail: chips + filters, pinned under the header */}
      <div className="sticky top-[4.25rem] z-content border-b border-ink/10 bg-cream/95 backdrop-blur-md">
        <div className="pad-x py-3">
          <div className="flex items-center gap-3">
            <label htmlFor="menu-search" className="sr-only">
              Search dishes
            </label>
            <div className="relative flex-1 sm:max-w-xs">
              <input
                id="menu-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a dish…"
                className="w-full rounded-full border-2 border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink-400 focus:border-ember focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5" role="group" aria-label="Filter by diet">
              {dietOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDiet(option.id)}
                  aria-pressed={diet === option.id}
                  className={cn(
                    'rounded-full border-2 px-3 py-2 text-[0.8rem] font-semibold whitespace-nowrap transition-colors duration-200',
                    diet === option.id
                      ? 'border-ink bg-ink text-cream'
                      : 'border-ink/15 bg-transparent text-ink-600 hover:border-ink hover:text-ink',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <nav aria-label="Menu sections" className="mt-3 -mx-[var(--page-pad)] overflow-x-auto px-[var(--page-pad)]">
            <ul className="flex w-max items-center gap-2 pb-1">
              {visible.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    className={cn(
                      'block rounded-full px-3.5 py-2 text-[0.8rem] font-semibold whitespace-nowrap no-underline transition-colors duration-200',
                      active === category.id
                        ? 'bg-saffron text-ink'
                        : 'bg-cream-200 text-ink-600 hover:bg-cream-400 hover:text-ink',
                    )}
                    {...(active === category.id ? { 'aria-current': 'true' as const } : {})}
                  >
                    {category.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <p aria-live="polite" className="pad-x pt-6 text-sm text-ink-400">
        {filtering ? (
          <>
            {`${total} ${total === 1 ? 'dish matches' : 'dishes match'} your filters.`}{' '}
            <button
              type="button"
              onClick={() => {
                setDiet('all')
                setQuery('')
                searchRef.current?.focus()
              }}
              className="font-semibold text-ember-700 underline decoration-2 underline-offset-2 hover:no-underline"
            >
              Reset
            </button>
          </>
        ) : (
          `${total} dish lines across ${visible.length} sections.`
        )}
      </p>

      {visible.length === 0 && (
        <div className="pad-x py-20 text-center">
          <h2 className="display text-[clamp(1.8rem,6vw,3rem)] text-ink">Nothing matches that</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-600">
            Try a shorter word, or clear the filters to see all {menuCategories.length} sections again.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Pill
              onClick={() => {
                setQuery('')
                setDiet('all')
                searchRef.current?.focus()
              }}
              variant="ink"
            >
              Clear filters
            </Pill>
            <Pill href={restaurant.phone.href} variant="outline">
              <Phone className="h-4 w-4" />
              Ask the kitchen
            </Pill>
          </div>
        </div>
      )}

      <div className="pad-x space-y-[clamp(3rem,7vw,5.5rem)] py-10">
        {visible.map((category) => {
          const unverified = category.items.some((item) => !item.verified)
          return (
            <section key={category.id} id={category.id} className="scroll-mt-[9.5rem]" aria-labelledby={`${category.id}-h`}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
                <Reveal>
                  <p className="eyebrow text-ember-700">{category.kicker}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 id={`${category.id}-h`} className="display display-mid text-ink">
                      {category.heading}
                    </h2>
                    {unverified && <Pending>Confirm</Pending>}
                  </div>
                  <p className="mt-3 max-w-lg text-ink-600">{category.blurb}</p>
                </Reveal>

                <Reveal delay={90} className="order-first lg:order-none">
                  <div className="aspect-[16/10] overflow-hidden rounded-[1.25rem] rounded-tr-[5rem] ring-1 ring-ink/10 lg:aspect-[16/9]">
                    <DishImage slug={category.image} sizes="(min-width: 48rem) 40vw, 92vw" alt={category.imageAlt} />
                  </div>
                </Reveal>
              </div>

              <ul className="mt-8 grid gap-x-10 gap-y-1 md:grid-cols-2">
                {category.items.map((item, index) => (
                  <Reveal
                    as="li"
                    key={item.name}
                    delay={Math.min(index, 8) * 40}
                    className="group flex items-baseline justify-between gap-4 border-b border-dashed border-ink/15 py-3.5 transition-colors duration-200 hover:border-saffron"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <VegMark veg={item.veg} className="h-3.5 w-3.5 shrink-0" />
                        <h3 className="display text-[1.15rem] tracking-[-0.01em] text-ink transition-colors duration-200 group-hover:text-ember-700">
                          {item.name}
                        </h3>
                        {item.hot && (
                          <span className="rounded-full bg-ember/12 px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.08em] text-ember-700 uppercase">
                            Hot
                          </span>
                        )}
                      </div>
                      {item.note && <p className="mt-1 pl-[1.35rem] text-sm text-ink-400">{item.note}</p>}
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2 pl-2">
                      <span aria-hidden="true" className="hidden h-px w-8 self-center bg-ink/15 sm:block" />
                      <PriceCell price={item.price} />
                    </div>
                  </Reveal>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <section className="pad-x pb-[clamp(3rem,8vw,6rem)]">
        <div className="relative overflow-hidden rounded-[1.5rem] on-dark bg-ink p-7 text-cream sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-saffron/25 blur-[80px]"
          />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <HandNote className="text-saffron">hungry already?</HandNote>
              <h2 className="display mt-2 text-[clamp(1.8rem,5.5vw,3.2rem)] text-cream">
                Call ahead, eat sooner
              </h2>
              <p className="mt-3 max-w-lg text-cream/75">
                Biryani and whole birds take time. Ring the kitchen before you set out — there is no online
                ordering on this site. Chairs for a table, though, can be held on the booking page.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Pill href={restaurant.phone.href} variant="saffron" size="lg" tilt="left">
                <Phone className="h-4 w-4" />
                {restaurant.phone.display}
              </Pill>
              <Pill to="/visit" variant="outline-cream" size="lg">
                Getting here
                <ArrowRight className="h-4 w-4" />
              </Pill>
              <Pill to="/book" variant="ember" size="lg">
                Book a table
                <ArrowRight className="h-4 w-4" />
              </Pill>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

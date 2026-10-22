import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { DishImage } from '../components/DishImage'
import { Marquee } from '../components/Marquee'
import { Pill } from '../components/Pill'
import { Reveal, usePrefersReducedMotion } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, SectionHeading } from '../components/ui'
import { ArrowRight, ArrowUpRight, Phone, Pin } from '../components/Icons'
import { featuredCategories } from '../data/menu'
import { restaurant } from '../data/restaurant'
import { cn } from '../lib/cn'

function Embers() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
  const sparks = [
    { left: '12%', bottom: '18%', delay: '0s', duration: '6.5s' },
    { left: '26%', bottom: '8%', delay: '1.4s', duration: '8s' },
    { left: '68%', bottom: '14%', delay: '2.6s', duration: '7.2s' },
    { left: '82%', bottom: '26%', delay: '0.8s', duration: '9s' },
    { left: '47%', bottom: '6%', delay: '3.4s', duration: '7.8s' },
  ]
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {sparks.map((spark, index) => (
        <span
          key={index}
          className="ember"
          style={
            {
              left: spark.left,
              bottom: spark.bottom,
              '--ember-delay': spark.delay,
              '--ember-duration': spark.duration,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden on-dark bg-ink pt-24 pb-[clamp(1.5rem,5vw,4.5rem)] text-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[70%] opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(75% 60% at 50% 0%, rgba(224,138,30,0.28) 0%, transparent 65%), radial-gradient(50% 45% at 85% 70%, rgba(194,65,12,0.35) 0%, transparent 70%)',
        }}
      />
      <Embers />

      <div className="pad-x relative z-30">
        <Reveal>
          <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1 text-saffron">
            <span>Mathasahi · Bhadrak</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-cream/40" />
            <span className="text-cream/70">North Indian · Mughlai · Punjabi · Indo-Chinese</span>
          </p>
        </Reveal>

        <h1 className="display display-hero mt-4">
          <Reveal as="span" className="block">
            <span className="hero-faint">Smoke.</span>
          </Reveal>
          <Reveal as="span" delay={90} className="block">
            <span className="hero-faint">Spice.</span>
          </Reveal>
          <Reveal as="span" delay={180} className="block text-saffron">
            Slow F<span className="hero-dissolve">ire.</span>
          </Reveal>
        </h1>
      </div>

      {/* The tandoor print holds the right half of the hero. It is a still image
          with no border, ring or shadow: the .hero-fade mask dissolves its edges
          into the charcoal, so it reads as smoke behind the words rather than a
          card sitting on top of them. */}
      <figure className="relative z-20 order-2 mt-8 lg:absolute lg:inset-[20%_-4%_13%_auto] lg:mt-0 lg:w-[46%] lg:flex lg:flex-col lg:gap-2">
        <div className="hero-fade relative mx-auto aspect-[4/3] w-[min(100%,26rem)] lg:aspect-auto lg:min-h-0 lg:w-full lg:flex-1">
          <DishImage
            slug="hero-tandoori"
            eager
            sizes="(min-width: 64rem) 46vw, 92vw"
            alt="Two charred tandoori chicken halves on skewers, lifted from a glowing clay oven with smoke and embers rising (illustrative photo)"
          />
        </div>
        <figcaption className="hand mt-3 text-center text-[1.2rem] text-cream/55 lg:mr-[9%] lg:mt-0 lg:text-right lg:text-[1.3rem]">
          straight off the coals
        </figcaption>
      </figure>

      <div className="pad-x relative z-30 order-3">
        <Reveal delay={240} className="mt-6 max-w-xl">
          <p className="text-[1.05rem] leading-relaxed text-cream/85 sm:text-[1.2rem]">
            A clay oven, a hand-pat of seekh, a sealed handi of biryani. Tandooriwala is Bhadrak&apos;s
            table for North Indian, Mughlai, Punjabi and Indo-Chinese plates.
          </p>
        </Reveal>

        <Reveal delay={300} className="mt-6 flex flex-wrap items-center gap-3">
          <Pill to="/menu" variant="saffron" size="lg" tilt="left" className="no-underline">
            Explore Menu
            <ArrowRight className="h-4 w-4" />
          </Pill>
          <Pill
            href={restaurant.mapUrl}
            variant="outline-cream"
            size="lg"
            tilt="right"
          >
            <Pin className="h-4 w-4" />
            Visit us
          </Pill>
          <Pill to="/book" variant="ember" size="lg">
            Book a Table
            <ArrowRight className="h-4 w-4" />
          </Pill>
        </Reveal>
      </div>

      <div aria-hidden="true" className="pad-x relative z-10 order-4 mt-8 flex items-center gap-3 text-cream/45 lg:mt-6">
        <span className="h-px flex-1 bg-cream/20" />
        <span className="eyebrow text-[0.65rem]">Scroll</span>
      </div>
    </section>
  )
}

const ticker = [
  'Tandoori starters',
  'Seekh kebabs',
  'Mughlai curries',
  'Dum biryani',
  'Indo-Chinese wok',
  'Coastal seafood',
]

function Ticker() {
  return (
    <div className="border-y-2 border-ink/12 bg-saffron py-3.5 text-ink">
      <Marquee
        duration={40}
        items={ticker.map((word) => (
          <span key={word} className="display text-[clamp(1.1rem,3.4vw,1.9rem)] font-black">
            {word}
          </span>
        ))}
      />
    </div>
  )
}

function Story() {
  return (
    <section className="pad-x relative py-[clamp(3.5rem,9vw,7rem)]">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
        <Reveal>
          <p className="eyebrow text-ember-700">What this kitchen does</p>
          <h2 className="display display-mid mt-3 text-ink">
            Four cooking traditions, one fire.
          </h2>
          <p className="mt-5 max-w-lg text-ink-600">
            The tandoor runs through the service, the wok section turns out Indo-Chinese plates, and the
            gravies are built the Punjabi-Mughlai way — onion, tomato, yogurt, patience.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {restaurant.cuisines.map((cuisine) => (
              <span key={cuisine} className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ember" />
                {cuisine}
              </span>
            ))}
          </div>
          <Pill to="/about" variant="outline" className="mt-8">
            Read the full story
            <ArrowRight className="h-4 w-4" />
          </Pill>
        </Reveal>

        <Reveal delay={100} className="relative">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="aspect-[4/5] overflow-hidden rounded-[1.25rem] rounded-tr-[6rem]">
              <DishImage
                slug="dish-curry"
                sizes="(min-width: 48rem) 24vw, 45vw"
                alt="Illustrative photo: rich orange North Indian curry in an iron karahi with a cream swirl"
              />
            </div>
            <div className="mt-8 aspect-[4/5] overflow-hidden rounded-[1.25rem] rounded-tl-[6rem]">
              <DishImage
                slug="dish-biryani"
                sizes="(min-width: 48rem) 24vw, 45vw"
                alt="Illustrative photo: saffron biryani in a copper handi topped with fried onions and mint"
              />
            </div>
          </div>
          <span className="hand absolute -top-4 left-2 -rotate-6 text-[1.4rem] text-ember-700 sm:left-auto sm:-right-2">
            no shortcuts here
          </span>
        </Reveal>
      </div>
    </section>
  )
}

function Featured() {
  return (
    <section className="pad-x relative pb-[clamp(3.5rem,9vw,7rem)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading heading="From the tandoor" kicker="A preview" className="max-w-xl" />
        <Pill to="/menu" variant="ink" className="mb-2 shrink-0">
          Full menu
          <ArrowUpRight className="h-4 w-4" />
        </Pill>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {featuredCategories.map((category, index) => (
          <Reveal as="li" key={category.id} delay={index * 60}>
            <Link
              to={`/menu#${category.id}`}
              className="group block h-full overflow-hidden rounded-[1.35rem] bg-cream-200 no-underline ring-1 ring-ink/10 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-28px_rgba(28,22,19,0.6)]"
            >
              <div className="aspect-[5/4] overflow-hidden">
                <DishImage
                  slug={category.image}
                  sizes="(min-width: 80rem) 22vw, (min-width: 48rem) 45vw, 92vw"
                  className="transition-transform duration-[900ms] group-hover:scale-[1.06]"
                  alt={category.imageAlt}
                />
              </div>
              <div className="p-5">
                <p className="eyebrow text-ember-700">{category.kicker}</p>
                <h3 className="display mt-2 text-[1.6rem] text-ink">{category.heading}</h3>
                <p className="mt-2 text-sm text-ink-600">{category.items.length} dishes listed</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors group-hover:text-ember-700">
                  Browse section
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

function Teasers() {
  return (
    <section className="pad-x pb-[clamp(3.5rem,9vw,7rem)]">
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal className="relative flex flex-col overflow-hidden rounded-[1.5rem] on-dark bg-ink p-7 text-cream sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -bottom-14 h-48 w-48 rounded-full bg-ember/30 blur-3xl"
          />
          <p className="eyebrow text-saffron">Visit us</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,5vw,2.9rem)] text-cream">
            Mathasahi, Bhadrak
          </h2>
          <address className="mt-5 not-italic text-cream/80">
            {restaurant.address.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <div className="mt-7 flex flex-wrap gap-3">
            <Pill href={restaurant.mapUrl} variant="saffron" tilt="left">
              <Pin className="h-4 w-4" />
              Get directions
            </Pill>
            <Link
              to="/visit"
              className="pill border-2 border-cream/30 text-cream no-underline hover:bg-cream hover:text-ink"
            >
              Visiting details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={90} className="relative flex flex-col overflow-hidden rounded-[1.5rem] bg-cream-200 p-7 ring-1 ring-ink/10 sm:p-9">
          <p className="eyebrow text-ember-700">Contact us</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,5vw,2.9rem)] text-ink">Call the kitchen</h2>
          <a
            href={restaurant.phone.href}
            className={cn(
              'mt-5 inline-flex w-fit items-center gap-3 text-[clamp(1.6rem,5vw,2.4rem)] font-bold tracking-tight text-ink no-underline',
              'transition-colors hover:text-ember-700',
            )}
          >
            <Phone className="h-7 w-7 shrink-0 text-ember-700" />
            {restaurant.phone.display}
          </a>
          <HandNote className="mt-4">advance orders for groups — give us a ring</HandNote>
          <div className="mt-7 flex flex-wrap gap-3">
            <Pill to="/contact" variant="ink">
              Contact page
              <ArrowRight className="h-4 w-4" />
            </Pill>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function Home() {
  return (
    <>
      <Seo
        title="Tandooriwala Bhadrak — Tandoori, Kebabs, Curries & Biryani"
        description="North Indian, Mughlai, Punjabi and Indo-Chinese cooking from a clay tandoor in Mathasahi, Bhadrak. Browse the menu, get directions or call ahead."
      />
      <Hero />
      <Ticker />
      <Story />
      <Featured />
      <Teasers />
    </>
  )
}

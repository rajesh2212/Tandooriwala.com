import { DishImage } from '../components/DishImage'
import { Marquee } from '../components/Marquee'
import { Pill } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Seo } from '../components/Seo'
import { HandNote, PageIntro, Pending, SectionHeading } from '../components/ui'
import { ArrowRight, Pin } from '../components/Icons'
import { menuIsPlaceholder } from '../data/menu'
import { restaurant } from '../data/restaurant'

const traditions = [
  {
    title: 'North Indian',
    slug: 'dish-curry',
    alt: 'Illustrative photo: creamy tomato-based curry in an iron karahi garnished with cream and fenugreek',
    body: 'Onion-tomato gravies, yogurt balance, ghee finish. The everyday backbone of the menu — paneer, chicken and dal plates that come with bread.',
  },
  {
    title: 'Mughlai',
    slug: 'dish-kebabs',
    alt: 'Illustrative photo: char-grilled seekh kebabs on iron skewers with grilled onion and green chutney',
    body: 'Kebabs on iron skewers, kormas thickened with cashew and cream, biryani layered and sealed. Rich, aromatic, unhurried.',
  },
  {
    title: 'Punjabi',
    slug: 'dish-tandoori-chicken',
    alt: 'Illustrative photo: tandoori chicken with a red-orange marinade and char marks on a cream plate',
    body: 'The tandoor house style — high heat, short cook, heavy char. Starters straight off the oven wall, breads blistered to order.',
  },
  {
    title: 'Indo-Chinese',
    slug: 'dish-chinese',
    alt: 'Illustrative photo: Indo-Chinese chilli chicken with capsicum and onion on a sizzling cast-iron plate',
    body: 'Wok-fired and soy-led: chilli chicken, fried rice, hakka noodles, schezwan. The section that keeps the table noisy.',
  },
]

const methods = [
  { label: 'Clay tandoor', detail: 'Marinated cuts cooked against the oven wall over live coals.' },
  { label: 'Dum', detail: 'Sealed-pot rice and meat that steam in their own trapped air.' },
  { label: 'Karahi', detail: 'Gravies built slowly in a wide iron pan, reduced to order.' },
  { label: 'Wok', detail: 'Indo-Chinese plates tossed hard and fast on a high flame.' },
]

export function About() {
  return (
    <>
      <Seo
        title="About — Tandooriwala Bhadrak"
        description="How Tandooriwala Bhadrak cooks North Indian, Mughlai, Punjabi and Indo-Chinese food: clay tandoor, dum biryani, karahi gravies and a live wok."
        image="/images/og-cover.jpg"
      />

      <PageIntro
        eyebrow="About the kitchen"
        title="One fire, four traditions."
        slug="tandooriwala"
        back="/"
        lead="Tandooriwala Bhadrak is a family-dining kitchen in Mathasahi that cooks across four North Indian and Indo-Chinese traditions from the same line of fire."
        aside={
          <div className="rounded-[1.25rem] bg-ink-800/70 p-5 ring-1 ring-cream/15">
            <p className="eyebrow text-saffron">On this page</p>
            <ul className="mt-3 space-y-2 text-cream/80">
              <li>The four cooking traditions</li>
              <li>How each section is actually cooked</li>
              <li>What is still being confirmed</li>
            </ul>
          </div>
        }
      />

      <section className="pad-x py-[clamp(3.5rem,8vw,6rem)]">
        <SectionHeading
          kicker="The food"
          heading="What we cook"
          note="Each tradition brings its own technique to the same table. Tap through the sections on the menu page to see how they are listed."
        />

        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-14">
          {/* Sticky image column while the tradition copy scrolls past — the reference site's story-scroll rhythm */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[1.5rem] ring-1 ring-ink/10">
                <DishImage
                  slug="atmosphere-tandoor"
                  sizes="42vw"
                  alt="Illustrative photo: a cook's hands sliding marinated chicken onto a skewer inside a glowing clay tandoor"
                />
              </div>
              <HandNote className="mt-4">the oven runs the whole service</HandNote>
            </div>
          </div>

          <div className="space-y-4 lg:space-y-6">
            {traditions.map((tradition, index) => (
              <Reveal
                key={tradition.title}
                delay={index * 60}
                className="rounded-[1.35rem] bg-cream-200 p-6 ring-1 ring-ink/8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-28px_rgba(28,22,19,0.5)] sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="display text-[clamp(1.7rem,4.5vw,2.5rem)] text-ink">
                    {tradition.title}
                  </h3>
                  <span aria-hidden="true" className="hand pt-1 text-[1.2rem] text-ember-700">
                    0{index + 1}
                  </span>
                </div>
                <div className="mt-4 aspect-[16/10] overflow-hidden rounded-[1rem] lg:hidden">
                  <DishImage slug={tradition.slug} sizes="92vw" alt={tradition.alt} />
                </div>
                <p className="mt-4 text-ink-600">{tradition.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="border-y-2 border-ink/12 bg-ink py-3.5 text-cream">
        <Marquee
          duration={30}
          reverse
          items={methods.map((method) => (
            <span key={method.label} className="display text-[clamp(1rem,3vw,1.6rem)] font-black">
              {method.label}
            </span>
          ))}
        />
      </div>

      <section className="pad-x py-[clamp(3.5rem,8vw,6rem)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <Reveal>
            <SectionHeading
              kicker="The method"
              heading="How it's cooked"
              className="[&_h2]:max-w-[12ch]"
            />
            <dl className="mt-8 space-y-5">
              {methods.map((method) => (
                <div key={method.label} className="border-l-4 border-saffron pl-4">
                  <dt className="display text-[1.35rem] text-ink">{method.label}</dt>
                  <dd className="mt-1 text-ink-600">{method.detail}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={120} className="relative">
            <div className="aspect-[5/4] overflow-hidden rounded-[1.5rem] rounded-bl-[7rem] ring-1 ring-ink/10">
              <DishImage
                slug="dish-seafood"
                sizes="(min-width: 48rem) 45vw, 92vw"
                alt="Illustrative photo: coastal-style fish curry with turmeric and mustard beside a bowl of spicy prawn masala"
              />
            </div>
            <div className="absolute -bottom-6 left-4 right-8 rounded-[1.1rem] bg-cream p-5 shadow-[0_20px_40px_-24px_rgba(28,22,19,0.55)] ring-1 ring-ink/10 sm:left-8 sm:right-auto sm:max-w-xs">
              <p className="eyebrow text-ember-700">Coastal note</p>
              <p className="mt-2 text-sm text-ink-600">
                Bhadrak sits close to the coast, so fish and prawn plates sit alongside the tandoor
                section rather than hiding behind it.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pad-x pb-[clamp(3.5rem,8vw,6rem)]">
        <div className="rounded-[1.5rem] border border-dashed border-ember/45 bg-shell p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="display text-[clamp(1.5rem,4vw,2.2rem)] text-ink">
              What is still being confirmed
            </h2>
            <Pending>Placeholder data</Pending>
          </div>
          <p className="mt-4 max-w-2xl text-ink-600">
            This page deliberately avoids claims the restaurant has not supplied. There is no published
            founding year, no chef biography, no awards, no sourcing story and no opening hours yet — and
            {' '}
            {menuIsPlaceholder
              ? 'the menu itself is still a structure of placeholders awaiting real dish names and prices.'
              : 'the menu is being filled in section by section.'}
          </p>
          <p className="mt-3 max-w-2xl text-ink-600">
            If you own or work at Tandooriwala, send the details and they will replace every marked
            placeholder without a redesign.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Pill to="/menu" variant="ink">
              See the menu structure
              <ArrowRight className="h-4 w-4" />
            </Pill>
            <Pill href={restaurant.phone.href} variant="outline">
              <Pin className="h-4 w-4" />
              Call {restaurant.phone.display}
            </Pill>
          </div>
        </div>
      </section>
    </>
  )
}

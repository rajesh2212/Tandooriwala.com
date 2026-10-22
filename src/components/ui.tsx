import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'
import { BackLink } from './Back'
import { Reveal } from './Reveal'

export function SectionHeading({
  kicker,
  heading,
  note,
  tone = 'ink',
  className,
  id,
}: {
  kicker?: string
  heading: ReactNode
  note?: string
  tone?: 'ink' | 'cream'
  className?: string
  id?: string
}) {
  return (
    <Reveal className={cn('relative', className)}>
      {kicker && (
        <p className={cn('eyebrow mb-3', tone === 'cream' ? 'text-saffron' : 'text-ember-700')}>{kicker}</p>
      )}
      <h2
        id={id}
        className={cn(
          'display display-section max-w-[16ch]',
          tone === 'cream' ? 'text-cream' : 'text-ink',
        )}
      >
        {heading}
      </h2>
      {note && (
        <p className={cn('mt-4 max-w-lg text-[1.05rem]', tone === 'cream' ? 'text-cream/70' : 'text-ink-600')}>
          {note}
        </p>
      )}
    </Reveal>
  )
}

/** Oversized dark band that opens every inner page and carries the page h1. */
export function PageIntro({
  eyebrow,
  title,
  lead,
  slug,
  aside,
  back,
  children,
}: {
  eyebrow: string
  title: string
  lead: ReactNode
  slug: string
  aside?: ReactNode
  /** Route to fall back to when the customer arrived here directly. */
  back?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden on-dark bg-ink pt-[clamp(6.5rem,14vw,9.5rem)] pb-[clamp(3rem,8vw,6rem)] text-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-screen"
        style={{
          backgroundImage: 'radial-gradient(60% 55% at 85% 15%, var(--color-ember) 0%, transparent 70%)',
        }}
      />
      <div className="pad-x relative">
        {back && (
          <div className="-mt-10 mb-6 lg:-mt-14">
            <BackLink to={back} tone="cream" label="Back" />
          </div>
        )}
        <p className="eyebrow text-saffron">{eyebrow}</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <h1 className="display max-w-[13ch] text-[clamp(2.6rem,11vw,8.5rem)] font-extrabold text-cream">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-[1.05rem] text-cream/80 sm:text-[1.15rem]">{lead}</p>
          </div>
          <div className="lg:pb-2">
            <Reveal delay={120}>{aside}</Reveal>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="wordmark pointer-events-none absolute -bottom-[7vw] left-1/2 -translate-x-1/2 text-[24vw] leading-none whitespace-nowrap text-cream/[0.028] lg:text-[14vw]"
        >
          {slug}
        </span>
        {children}
      </div>
    </section>
  )
}

export function HandNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('hand text-[1.3rem] leading-tight text-ember-700', className)}>{children}</p>
  )
}

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-400">
      <Link to="/" className="no-underline hover:text-ember-700">
        Home
      </Link>
      <span aria-hidden="true" className="mx-2">
        /
      </span>
      <span aria-current="page" className="text-ink">
        {current}
      </span>
    </nav>
  )
}

/** Dashed marker used wherever a fact still has to be confirmed by the restaurant. */
export function Pending({ children = 'To be confirmed' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ember/55 bg-ember/8 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.08em] text-ember-700 uppercase align-middle">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ember" />
      {children}
    </span>
  )
}

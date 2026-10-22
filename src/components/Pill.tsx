import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

type Variant = 'ink' | 'saffron' | 'cream' | 'outline' | 'outline-cream' | 'ember'

const variants: Record<Variant, string> = {
  ink: 'bg-ink text-cream hover:bg-ink-800',
  saffron: 'bg-saffron text-ink hover:bg-saffron-600',
  cream: 'bg-cream text-ink hover:bg-cream-200',
  outline: 'border-2 border-ink text-ink hover:bg-ink hover:text-cream',
  /** For use on the dark charcoal sections, where the ink outline would vanish. */
  'outline-cream': 'border-2 border-cream/45 text-cream hover:bg-cream hover:text-ink',
  ember: 'bg-ember text-cream hover:bg-ember-700',
}

type CommonProps = {
  children: ReactNode
  variant?: Variant
  className?: string
  /** Slight sticker tilt, playful detail from the reference site. */
  tilt?: 'left' | 'right' | null
  size?: 'md' | 'lg'
  icon?: ReactNode
  type?: 'button' | 'submit'
}

type PillProps = CommonProps &
  (
    | { to: string; href?: never; onClick?: never }
    | { href: string; to?: never; onClick?: never }
    | { to?: never; href?: never; onClick: () => void; type?: 'button' | 'submit' }
  )

const base = cn(
  'pill justify-center no-underline select-none',
  'hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(28,22,19,0.55)]',
  'active:translate-y-0 active:scale-[0.985]',
)

export function Pill({
  children,
  variant = 'ink',
  className,
  tilt = null,
  size = 'md',
  icon,
  to,
  href,
  onClick,
  type = 'button',
}: PillProps) {
  const classes = cn(
    base,
    variants[variant],
    size === 'lg' && 'px-[1.75rem] py-[0.95rem] text-[1.05rem]',
    tilt === 'left' && '-rotate-[1.6deg] hover:rotate-0',
    tilt === 'right' && 'rotate-[1.6deg] hover:rotate-0',
    className,
  )
  const inner = (
    <>
      {icon}
      {children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {inner}
      </Link>
    )
  }
  if (href) {
    const external = href.startsWith('http')
    return (
      <a
        href={href}
        className={classes}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {inner}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {inner}
    </button>
  )
}

type IconProps = { className?: string }

export function Flame({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 2.5c.6 3.2-1.2 4.4-2.7 5.8C7.4 10.1 6 11.7 6 14.2 6 17.9 8.7 21 12 21s6-3.1 6-6.8c0-2.2-1-3.7-2.2-5-.5 1-1.2 1.6-2 1.9.6-2.6-.3-6.2-1.8-8.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Phone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4.5 5.5c0-.8.7-1.5 1.5-1.5h2.2c.7 0 1.3.5 1.4 1.2l.5 2.6c.1.6-.1 1.2-.6 1.6l-1.3 1c.9 2 2.5 3.6 4.5 4.5l1-1.3c.4-.5 1-.7 1.6-.6l2.6.5c.7.1 1.2.7 1.2 1.4V19c0 .8-.7 1.5-1.5 1.5h-.6C10.4 20.5 4.5 14.6 4.5 6.1v-.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Pin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 21s6.5-6.1 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4.9 6.5 11 6.5 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.8" r="2.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function ArrowUpRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowLeft({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M20 12H5m0 0 5.5-5.5M5 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 8h16M4 16h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Close({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Indian veg / non-veg mark — a dot inside a square, drawn rather than typed. */
export function VegMark({ veg, className }: IconProps & { veg: boolean }) {
  const color = veg ? 'var(--color-spinach)' : 'var(--color-ember)'
  return (
    <svg viewBox="0 0 16 16" className={className} role="img" aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      <rect x="1.2" y="1.2" width="13.6" height="13.6" rx="1.5" fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx="8" cy="8" r="3.4" fill={color} />
    </svg>
  )
}

export function User({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="8.2" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.8 20c.7-3.6 3.5-5.6 7.2-5.6s6.5 2 7.2 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function Camera({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.6 8.6c0-1.2 1-2.2 2.2-2.2h1.7c.7 0 1.3-.4 1.7-1l.7-1.1c.3-.5.8-.8 1.4-.8h2.4c.6 0 1.1.3 1.4.8l.7 1.1c.4.6 1 1 1.7 1h1.7c1.2 0 2.2 1 2.2 2.2v9c0 1.2-1 2.2-2.2 2.2H5.8c-1.2 0-2.2-1-2.2-2.2v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="13" r="3.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function Check({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4.5 12.6 9.4 17.5 19.5 7.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Download({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3.6v10.6m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.6 15.2v2.4c0 1.1.9 2 2 2h10.8c1.1 0 2-.9 2-2v-2.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}


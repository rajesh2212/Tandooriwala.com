import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

type MarqueeProps = {
  items: ReactNode[]
  /** Seconds for one full loop; scale with content length. */
  duration?: number
  reverse?: boolean
  className?: string
  separator?: ReactNode
}

/**
 * Infinite ticker. The second copy is aria-hidden so screen readers and find-in-page
 * see each phrase once. CSS pauses it on hover/focus and stops it under reduced motion.
 */
export function Marquee({
  items,
  duration = 34,
  reverse = false,
  className,
  separator = <span aria-hidden="true" className="mx-5 text-saffron">&#10022;</span>,
}: MarqueeProps) {
  const track = (
    <div className="flex shrink-0 items-center">
      {items.map((item, index) => (
        <span key={index} className="flex items-center whitespace-nowrap">
          {item}
          {separator}
        </span>
      ))}
    </div>
  )

  return (
    <div className={cn('marquee-host flex w-full overflow-hidden', className)}>
      <div
        className="marquee-track flex w-max min-w-full"
        style={{
          animationDuration: `${duration}s`,
          ...(reverse ? { animationDirection: 'reverse' } : {}),
        }}
      >
        {track}
        <div aria-hidden="true" className="flex shrink-0 items-center">
          {items.map((item, index) => (
            <span key={index} className="flex items-center whitespace-nowrap">
              {item}
              {separator}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

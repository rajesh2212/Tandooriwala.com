import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

type RevealProps = {
  children: ReactNode
  as?: ElementType
  /** Stagger step in ms; keep small so long lists do not feel laggy. */
  delay?: number
  className?: string
  id?: string
}

/** Fade-and-lift on enter. Under reduced motion the content renders visible outright. */
export function Reveal({ children, as: tag = 'div', delay = 0, className, id }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (reduced) {
      setShown(true)
      return
    }
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [reduced])

  const Component = tag as ElementType
  return (
    <Component
      id={id}
      ref={ref}
      className={cn(className, shown ? 'reveal-shown' : 'reveal-hidden')}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Component>
  )
}

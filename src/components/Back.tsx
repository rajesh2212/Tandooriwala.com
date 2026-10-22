import { ArrowLeft } from './Icons'
import { cn } from '../lib/cn'
import { useBackTo } from '../lib/navDepth'

/**
 * The site's own back control.
 *
 * It goes to the page the customer actually came from when there is one, and to the
 * fallback when they arrived straight on this URL — a copy of what the browser's Back
 * button does, without the browser's habit of leaving the site. The browser's own
 * history is untouched, so hardware and gesture back still behave normally.
 */
export function BackLink({
  to,
  label = 'Back',
  tone = 'ink',
  className,
  onBack,
}: {
  /** Where to go when there is no in-app page behind this one. */
  to: string
  label?: string
  tone?: 'ink' | 'cream'
  className?: string
  /** For multi-step flows, where "back" means the previous step rather than the previous page. */
  onBack?: () => void
}) {
  const go = useBackTo(to)
  return (
    <button
      type="button"
      onClick={onBack ?? go}
      className={cn(
        'group inline-flex min-h-[2.75rem] items-center gap-2 rounded-full px-1 text-sm font-bold no-underline',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember',
        tone === 'cream' ? 'text-cream/75 hover:text-cream' : 'text-ink-600 hover:text-ember-700',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  )
}

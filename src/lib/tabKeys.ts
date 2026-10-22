import type { KeyboardEvent } from 'react'

/**
 * Arrow-key movement inside a `role="tablist"`.
 *
 * The ARIA pattern says Left/Right (Up/Down too) move between tabs and the selection
 * follows focus. A tablist that ignores them is two ordinary buttons claiming to be
 * something they are not, so every tablist here uses this.
 */
export function tabArrowKeys<T extends string>({
  order,
  current,
  onPick,
  focus,
}: {
  order: readonly T[]
  current: T
  onPick: (next: T) => void
  /** Move the visible ring onto the tab that just became the selected one. */
  focus: (next: T) => void
}) {
  return (event: KeyboardEvent) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
    if (!forward && !backward && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const index = order.indexOf(current)
    const next =
      event.key === 'Home'
        ? order[0]
        : event.key === 'End'
          ? order[order.length - 1]
          : order[(index + (forward ? 1 : order.length - 1)) % order.length]
    onPick(next)
    focus(next)
  }
}

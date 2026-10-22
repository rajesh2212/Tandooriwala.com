import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

/**
 * How deep into the site the current tab has walked.
 *
 * A "Back" control has to answer one question honestly: is there an in-app page
 * behind this one? The browser's own history length cannot tell us — it counts pages
 * from other sites too — so the app keeps its own counter, in sessionStorage, which
 * survives a reload but dies with the tab.
 *
 * Nothing here replaces the browser's Back button; it still works exactly as before.
 * This only decides where our own control should go.
 */

const KEY = 'tw-nav-depth'

function read(): number {
  try {
    return Number(sessionStorage.getItem(KEY) ?? '0') || 0
  } catch {
    return 0
  }
}

function write(value: number) {
  try {
    sessionStorage.setItem(KEY, String(Math.max(0, value)))
  } catch {
    /* private mode with storage disabled: the fallback link is still a fine answer */
  }
}

/** Mount once, from the layout, so every route keeps the count current. */
export function useTrackDepth() {
  const type = useNavigationType()
  const { key } = useLocation()
  useEffect(() => {
    if (type === 'PUSH') write(read() + 1)
    else if (type === 'POP') write(read() - 1)
  }, [key, type])
}

/**
 * @param fallback where to go when the customer arrived directly — a parent page, or Home.
 */
export function useBackTo(fallback: string) {
  const navigate = useNavigate()
  return useCallback(() => {
    if (read() > 0) navigate(-1)
    else navigate(fallback)
  }, [navigate, fallback])
}

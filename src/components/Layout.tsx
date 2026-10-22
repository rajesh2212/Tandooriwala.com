import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTrackDepth } from '../lib/navDepth'
import { Footer } from './Footer'
import { Header } from './Header'
import { StructuredData } from './Seo'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ block: 'start' })
      return
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

export function Layout() {
  // Keeps the in-app page counter current, so every back control can answer honestly.
  useTrackDepth()
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-cream focus:no-underline"
      >
        Skip to content
      </a>
      <ScrollManager />
      <StructuredData />
      <Header />
      <main id="main" tabIndex={-1} className="relative z-content focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

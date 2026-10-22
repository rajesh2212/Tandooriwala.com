import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { restaurant } from '../data/restaurant'

type SeoProps = {
  title: string
  description: string
  /** Absolute-ish asset path used for og:image; falls back to the cover shot. */
  image?: string
  /** For the pages behind a session — nothing here is worth indexing. */
  noindex?: boolean
}

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

/**
 * Client-side head manager: the site is a SPA, so each route owns its own
 * title, description, Open Graph tags and canonical URL.
 */
export function Seo({ title, description, image = '/images/og-cover.jpg', noindex = false }: SeoProps) {
  useEffect(() => {
    const origin = restaurant.siteUrl || window.location.origin
    const absolute = image.startsWith('http') ? image : `${origin}${image}`
    const canonical = `${origin}${window.location.pathname.replace(/index\.html$/, '')}`

    document.title = title
    upsertMeta('meta[name="description"]', 'name', 'description', description)
    upsertMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description)
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', absolute)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absolute)

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonical
  }, [title, description, image, noindex])

  return null
}

/** Restaurant structured data, limited to details confirmed by the business. */
export function StructuredData() {
  const location = useLocation()
  useEffect(() => {
    const origin = restaurant.siteUrl || window.location.origin
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: restaurant.legalName,
      description: restaurant.description,
      url: `${origin}/`,
      telephone: restaurant.phone.display,
      servesCuisine: [...restaurant.cuisines, 'Tandoori', 'Seafood'],
      address: {
        '@type': 'PostalAddress',
        streetAddress: restaurant.address.full,
        addressLocality: restaurant.address.city,
        addressRegion: 'Odisha',
        addressCountry: 'IN',
      },
      geo: { '@type': 'GeoCoordinates', ...restaurant.coordinates },
      hasMap: restaurant.mapUrl,
      image: `${origin}/images/og-cover.jpg`,
    }
    const id = 'restaurant-structured-data'
    document.getElementById(id)?.remove()
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = id
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)
  }, [location.pathname])

  return null
}

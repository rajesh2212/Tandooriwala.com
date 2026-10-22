import { images } from '../data/imageManifest'
import { cn } from '../lib/cn'

type DishImageProps = {
  /** Slug from src/data/imageManifest.ts */
  slug: string
  alt: string
  sizes?: string
  /** Cover the box (default) or letter the natural ratio in. */
  fit?: 'cover' | 'contain'
  className?: string
  eager?: boolean
}

/**
 * Responsive, layout-shift-free image. Widths come from the generated manifest
 * so srcset can never point at a file that does not exist.
 */
export function DishImage({
  slug,
  alt,
  sizes = '(min-width: 48rem) 45vw, 92vw',
  fit = 'cover',
  className,
  eager = false,
}: DishImageProps) {
  const entry = images[slug]
  if (!entry) {
    return (
      <div
        className={cn('grid place-items-center bg-cream-200 text-ink-400 text-sm p-4 text-center', className)}
        role="img"
        aria-label={alt}
      >
        Missing image: {slug}
      </div>
    )
  }
  const srcSet = entry.widths.map((width) => `/images/${slug}-${width}.jpg ${width}w`).join(', ')
  const fallback = `/images/${slug}-${entry.widths[entry.widths.length - 1]}.jpg`

  return (
    <img
      src={fallback}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={entry.widths[entry.widths.length - 1]}
      height={Math.round(entry.widths[entry.widths.length - 1] / entry.ratio)}
      loading={eager ? 'eager' : 'lazy'}
      {...(eager ? { fetchPriority: 'high' as const } : { decoding: 'async' as const })}
      className={cn('h-full w-full object-cover block', fit === 'contain' && 'object-contain', className)}
    />
  )
}

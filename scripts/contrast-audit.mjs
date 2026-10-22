const hex = (h) => {
  const s = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
}
const blend = (fg, alpha, bg) => {
  const f = hex(fg)
  const b = hex(bg)
  return f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)))
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')
const ratio = (a, b) => {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p)
  return +((x + 0.05) / (y + 0.05)).toFixed(2)
}
const check = (label, fg, bg, min) => {
  const r = ratio(fg, bg)
  console.log(`${r >= min ? 'PASS' : 'FAIL'}  ${String(r).padStart(6)}  (min ${min})  ${label}`)
}

const INK = '#1c1613'
const CREAM = '#f7efe0'
const CREAM2 = '#efe3cd'
const SAFFRON = '#e08a1e'
const SAFFRON6 = '#c1730f'
const EMBER = '#c2410c'
const EMBER7 = '#93300a'

console.log('--- body text (needs 4.5) ---')
check('ink on cream', INK, CREAM, 4.5)
check('ink-600 on cream', '#4a3a30', CREAM, 4.5)
check('ink-400 on cream', '#6f5b4d', CREAM, 4.5)
check('ink-400 on cream-200', '#6f5b4d', CREAM2, 4.5)
check('ink-600 on cream-200', '#4a3a30', CREAM2, 4.5)
check('ember on cream', EMBER, CREAM, 4.5)
check('ember on cream-200 (pair avoided in code)', EMBER, CREAM2, 0)
check('ember-700 on cream-200', EMBER7, CREAM2, 4.5)
check('ember-700 on cream', EMBER7, CREAM, 4.5)
check('ember-700 on ember/6 tint', EMBER7, toHex(blend(EMBER, 0.06, CREAM)), 4.5)
check('ink on ember/6 tint', INK, toHex(blend(EMBER, 0.06, CREAM)), 4.5)

console.log('--- text on dark (needs 4.5) ---')
check('cream on ink', CREAM, INK, 4.5)
check('cream/85 on ink', toHex(blend(CREAM, 0.85, INK)), INK, 4.5)
check('cream/80 on ink', toHex(blend(CREAM, 0.8, INK)), INK, 4.5)
check('cream/75 on ink', toHex(blend(CREAM, 0.75, INK)), INK, 4.5)
check('cream/70 on ink', toHex(blend(CREAM, 0.7, INK)), INK, 4.5)
check('cream/60 on ink', toHex(blend(CREAM, 0.6, INK)), INK, 4.5)
check('cream/55 on ink', toHex(blend(CREAM, 0.55, INK)), INK, 4.5)
check('cream/50 on ink', toHex(blend(CREAM, 0.5, INK)), INK, 4.5)
check('cream/45 on ink', toHex(blend(CREAM, 0.45, INK)), INK, 3)
check('hero SMOKE./SPICE. cream/52 on ink', toHex(blend(CREAM, 0.52, INK)), INK, 3)
check('hero SLOW saffron on ink', SAFFRON, INK, 4.5)
check('hero dissolve tail saffron/34 on ink (intentional fade over the print)', toHex(blend(SAFFRON, 0.34, INK)), INK, 0)
check('saffron on ink', SAFFRON, INK, 4.5)
check('saffron/30 on ink (decorative)', toHex(blend(SAFFRON, 0.3, INK)), INK, 1)

console.log('--- buttons ---')
check('ink on saffron', INK, SAFFRON, 4.5)
check('ink on saffron-600 (hover)', INK, SAFFRON6, 4.5)
check('cream on ember', CREAM, EMBER, 4.5)
check('cream on ember-700 (hover)', CREAM, EMBER7, 4.5)
check('cream on ink (ink pill)', CREAM, INK, 4.5)
check('ink on cream (cream pill)', INK, CREAM, 4.5)

const CREAM4 = '#e2d2b6'
console.log('--- floor-plan chair glyphs (numbers are ~10px, so they need 4.5) ---')
const WHITE = '#ffffff'
/** Tables sit on the map surface: cream-200 at 70% over the cream card. */
const MAP = toHex(blend(CREAM2, 0.7, CREAM))
check('ink on white chair (free)', INK, WHITE, 4.5)
check('ink on saffron chair (yours)', INK, SAFFRON, 4.5)
check('cream on ember chair (booked)', CREAM, EMBER, 4.5)
check('ink-400 table label on cream', '#6f5b4d', CREAM, 4.5)
check('ink-600 area label on a room block (ink/8 over the map)', '#4a3a30', toHex(blend(INK, 0.08, MAP)), 4.5)
check('ember-700 "Open map" on a room block', EMBER7, toHex(blend(INK, 0.08, MAP)), 4.5)
check('ink-600 legend text on cream', '#4a3a30', CREAM, 4.5)
check('ink legend heading on cream', INK, CREAM, 4.5)
check('ink-400 legend note on cream', '#6f5b4d', CREAM, 4.5)
console.log('--- chair states must be told apart without colour (needs 3) ---')
check('free white chair fill against the map surface (the ink/55 outline below carries the edge)', WHITE, MAP, 1)
check('free white chair vs cream-400 side-chair fill', WHITE, CREAM4, 1.2)
check('ink/40 side-chair outline against its own cream-400 fill', toHex(blend(INK, 0.4, CREAM4)), CREAM4, 1)
check('ink/55 free-chair outline on the map surface', toHex(blend(INK, 0.55, MAP)), MAP, 3)
check('ink picked-chair outline on the map surface', INK, MAP, 3)
check('ember-700 booked-chair outline on the map surface', EMBER7, MAP, 3)
check('ink/40 side-chair outline on the map surface (decorative)', toHex(blend(INK, 0.4, MAP)), MAP, 1)
check('ink slash across a booked chair', INK, EMBER, 3)
check('saffron fill vs ember fill', SAFFRON, EMBER, 1)
check('saffron fill vs cream-400 side-chair fill', SAFFRON, CREAM4, 1)
check('ember fill vs cream-400 side-chair fill', EMBER, CREAM4, 1)
check('ember focus ring on the map surface', EMBER, MAP, 3)

console.log('--- non-text (needs 3) ---')
check('saffron ring/border on ink', SAFFRON, INK, 3)
check('ember focus ring on cream', EMBER, CREAM, 3)
check('ember focus ring on cream-200 (enquiry card)', EMBER, CREAM2, 3)
const FIELD = toHex(blend('#ffffff', 0.8, CREAM2))
check('ink/15 field border on white/80 over cream-200', toHex(blend(INK, 0.15, FIELD)), FIELD, 1)
check('spinach veg mark on cream', '#2f6b45', CREAM, 3)
check('ember veg mark on cream', EMBER, CREAM, 3)
check('ink/15 hairline on cream', toHex(blend(INK, 0.15, CREAM)), CREAM, 1)
check('wordmark cream/10 on ink', toHex(blend(CREAM, 0.1, INK)), INK, 1)
check('wordmark cream/4.5 on ink', toHex(blend(CREAM, 0.045, INK)), INK, 1)

// The downloaded ticket PDF: same palette, but on a printed page, so the lightest stop of
// its gradient is what every tone has to clear. See src/lib/ticketPdf.ts.
const PDF_TOP = '#2a211c'
const PDF_MUTED = toHex(blend(CREAM, 0.62, INK))
const SPINACH = '#2f6b45'
console.log('--- ticket PDF (printed, small point sizes, so all of it needs 4.5) ---')
check('cream values on the lightest gradient stop', CREAM, PDF_TOP, 4.5)
check('cream values on ink', CREAM, INK, 4.5)
check('muted labels on the lightest gradient stop', PDF_MUTED, PDF_TOP, 4.5)
check('muted labels on ink', PDF_MUTED, INK, 4.5)
check('saffron eyebrow on the lightest gradient stop', SAFFRON, PDF_TOP, 4.5)
check('cream CONFIRMED on the spinach pill', CREAM, SPINACH, 4.5)
check('saffron phone on the logo plate', SAFFRON, INK, 4.5)
console.log('--- ticket PDF, non-text ---')
check('saffron keyline on the lightest gradient stop', SAFFRON, PDF_TOP, 3)
check('muted tear line on the plate', PDF_MUTED, INK, 1.5)
check('logo flame saffron on the plate', SAFFRON, INK, 3)
check('logo inner flame ember on the plate', EMBER, INK, 3)

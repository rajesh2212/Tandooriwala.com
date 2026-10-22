/**
 * The ticket a customer keeps as a file.
 *
 * Drawn from the booking row the restaurant's server already handed to this account, so
 * the PDF can only ever carry the customer's own confirmed table. Text is real PDF text
 * rather than a picture of it: it stays selectable, searches in a PDF reader, and prints
 * sharp at any size. The only bitmap is the restaurant's own logo mark.
 *
 * The page is A5 portrait (148 x 210mm) — a ticket, not a letter — with a 14mm text
 * margin inside a 6.5mm keyline, so nothing falls off on a printer's unprintable edge.
 */

import { restaurant } from '../data/restaurant'
import logoMarkSvg from '../../public/favicon.svg?raw'
import type { Booking } from './bookings'
import { describeSeats } from './bookings'
import { formatDay, formatStamp } from './format'

export type TicketPdfResult =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; message: string }

const PAGE = { width: 148, height: 210 }
const X = 14
const RIGHT = 134
const CENTRE = PAGE.width / 2
/** Where the details stop and the logo plate begins. */
const PLATE_TOP = 118

type Rgb = readonly [number, number, number]

const rgb = (value: string): Rgb => {
  const byte = (at: number) => Number.parseInt(value.slice(at, at + 2), 16)
  return [byte(1), byte(3), byte(5)]
}

const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * amount),
  Math.round(from[1] + (to[1] - from[1]) * amount),
  Math.round(from[2] + (to[2] - from[2]) * amount),
]

/** The site's own palette: warm ink under cream and saffron. */
const INK = rgb('#1c1613')
const INK_WARM = rgb('#2a211c')
const CREAM = rgb('#f7efe0')
const SAFFRON = rgb('#e08a1e')
const SPINACH = rgb('#2f6b45')
/** Cream pulled towards the page, for the labels so the values stay the loudest thing on it. */
const MUTED = mix(CREAM, INK, 0.38)

const LOGO_PIXELS = 320

/**
 * `public/favicon.svg` is the restaurant's logo, and a PDF wants a bitmap, so the mark is
 * rasterised through a canvas onto the plate's exact colour — the tile in the favicon then
 * disappears into the page and only the flame shows. JPEG rather than PNG: jsPDF stores an
 * RGB PNG as raw pixels, which was 300kb of a 320kb file, and filling the canvas with the
 * plate's own ink left no transparency worth keeping. Replace the favicon (or point this
 * import at your own artwork) and the ticket logo changes with it.
 */
async function logoMark(): Promise<string | null> {
  try {
    const svg = logoMarkSvg.replace('<svg', `<svg width="${LOGO_PIXELS}" height="${LOGO_PIXELS}"`)
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('the logo did not draw'))
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
    const canvas = document.createElement('canvas')
    canvas.width = LOGO_PIXELS
    canvas.height = LOGO_PIXELS
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = `rgb(${INK[0]}, ${INK[1]}, ${INK[2]})`
    context.fillRect(0, 0, LOGO_PIXELS, LOGO_PIXELS)
    context.drawImage(image, 0, 0, LOGO_PIXELS, LOGO_PIXELS)
    return canvas.toDataURL('image/jpeg', 0.95)
  } catch {
    return null
  }
}

type TextOptions = {
  size: number
  tone: Rgb
  bold?: boolean
  align?: 'left' | 'center'
  /** Extra tracking, in mm — the small caps eyebrows are set wide, like the site's. */
  space?: number
  /** Wraps to this width, so a long address or note can never run off the page. */
  width?: number
  baseline?: 'top' | 'middle'
}

export async function buildTicketPdf(booking: Booking): Promise<TicketPdfResult> {
  // A cancelled table has no ticket to hand out, and nothing here should be able to make
  // one look confirmed. The interface only offers this button for active bookings; the
  // generator refuses the rest whatever the caller passes it.
  if (booking.status !== 'active') {
    return { ok: false, message: 'This booking is no longer confirmed, so there is no ticket to save.' }
  }

  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })

    const put = (value: string, x: number, y: number, options: TextOptions) => {
      doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
      doc.setFontSize(options.size)
      doc.setTextColor(options.tone[0], options.tone[1], options.tone[2])
      doc.setCharSpace(options.space ?? 0)
      const lines = options.width ? doc.splitTextToSize(value, options.width) : [value]
      doc.text(lines, x, y, { align: options.align ?? 'left', baseline: options.baseline ?? 'top' })
      doc.setCharSpace(0)
    }

    /** A label above a value, the way the ticket card on screen reads. */
    const field = (label: string, value: string, x: number, y: number, width: number) => {
      put(label.toUpperCase(), x, y, { size: 7.2, tone: MUTED, space: 0.55 })
      put(value, x, y + 4, { size: 10.5, tone: CREAM, bold: true, width })
    }

    // --- the gradient: banded rectangles, top to bottom, warm ink into the site's ink ---
    const bands = 44
    for (let band = 0; band < bands; band += 1) {
      const tone = mix(INK_WARM, INK, band / (bands - 1))
      doc.setFillColor(tone[0], tone[1], tone[2])
      doc.rect(0, (PAGE.height / bands) * band, PAGE.width, PAGE.height / bands + 0.6, 'F')
    }

    // --- the plate under the logo: one flat colour, so a transparent PNG is never needed ---
    doc.setFillColor(INK[0], INK[1], INK[2])
    doc.rect(6.9, PLATE_TOP, PAGE.width - 13.8, PAGE.height - 6.9 - PLATE_TOP, 'F')

    // --- keyline ---
    doc.setDrawColor(SAFFRON[0], SAFFRON[1], SAFFRON[2])
    doc.setLineWidth(0.7)
    doc.rect(6.5, 6.5, PAGE.width - 13, PAGE.height - 13)

    // --- the tear line, drawn as a dash rather than a solid rule ---
    doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setLineWidth(0.4)
    doc.setLineDashPattern([1.7, 1.7], 0)
    doc.line(X, PLATE_TOP, RIGHT, PLATE_TOP)
    doc.setLineDashPattern([], 0)

    // --- header ---
    put(restaurant.name.toUpperCase(), X, 15, { size: 8.4, tone: SAFFRON, bold: true, space: 1.3 })
    const pill = { width: 34, height: 8, y: 25.5 }
    doc.setFillColor(SPINACH[0], SPINACH[1], SPINACH[2])
    doc.roundedRect(RIGHT - pill.width, pill.y, pill.width, pill.height, pill.height / 2, pill.height / 2, 'F')
    put('CONFIRMED', RIGHT - pill.width / 2, pill.y + pill.height / 2, {
      size: 8,
      tone: CREAM,
      bold: true,
      align: 'center',
      space: 0.9,
      baseline: 'middle',
    })

    put('Booking reference', X, 25.5, { size: 7.2, tone: MUTED, space: 0.55 })
    put(booking.ref, X, 30, { size: 21, tone: CREAM, bold: true })

    // --- the details, read back from the saved row ---
    const columnB = 78
    const half = 56
    field('Date and time', `${formatDay(booking.booked_for)}, ${booking.slot}`, X, 48, half)
    field('Guests', `${booking.party_size} ${booking.party_size === 1 ? 'guest' : 'guests'}`, columnB, 48, half)
    field('Name', booking.name, X, 61, half)
    field('Phone', booking.phone, columnB, 61, half)
    field('Table and chairs', describeSeats(booking.chairs), X, 74, RIGHT - X)

    if (booking.note.trim()) {
      put('NOTE FOR THE FLOOR', X, 87, { size: 7.2, tone: MUTED, space: 0.55 })
      put(booking.note.trim(), X, 91, { size: 10, tone: CREAM, width: RIGHT - X })
    }

    // --- the logo, beneath the ticket details ---
    const mark = 26
    const logo = await logoMark()
    if (logo) doc.addImage(logo, 'JPEG', CENTRE - mark / 2, 126, mark, mark)
    put(restaurant.name, CENTRE, 156, { size: 14, tone: CREAM, bold: true, align: 'center', space: 0.2 })
    put(restaurant.address.full, CENTRE, 166, { size: 8.2, tone: MUTED, align: 'center', width: 116 })
    put(restaurant.phone.display, CENTRE, 172, { size: 9.6, tone: SAFFRON, bold: true, align: 'center' })

    put(
      `Quote ${booking.ref} at the door. The floor still phones ${restaurant.phone.display} to change the table.`,
      CENTRE,
      181,
      { size: 7.6, tone: MUTED, align: 'center', width: 112 },
    )
    put(`Ticket issued ${formatStamp(new Date().toISOString())} from the restaurant's booking system.`, CENTRE, 191, {
      size: 7,
      tone: MUTED,
      align: 'center',
      width: 112,
    })

    doc.setProperties({
      title: `${restaurant.name} booking ${booking.ref}`,
      subject: `Table for ${booking.party_size} on ${booking.booked_for} at ${booking.slot}`,
      creator: restaurant.shortName,
    })

    return { ok: true, blob: doc.output('blob'), filename: `tandooriwala-ticket-${booking.ref}.pdf` }
  } catch {
    return { ok: false, message: "We couldn't create the PDF. Try again in a moment." }
  }
}

/** Dates the booking flow shows, in the format the restaurant's customers read. */

/**
 * Today, or a day offset from it, as the `YYYY-MM-DD` the API expects.
 *
 * Only the starting guess: the restaurant's own day comes from the server, because a
 * customer two timezones away is otherwise shown a different evening from the one the
 * kitchen is cooking. See `Availability.today`.
 */
export const localDay = (offsetDays = 0) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

/** Whole calendar days from a `YYYY-MM-DD`, counted in days rather than hours. */
export const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/**
 * True when this browser does not live on the restaurant's clock, so the page can name the
 * timezone its seating times belong to instead of letting a visitor assume their own.
 */
export const elsewhereOnTheClock = (restaurantZone: string) => {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone !== restaurantZone
  } catch {
    return false
  }
}

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${iso}T00:00:00`),
  )

/** '1502' -> '15/02/2026' — how the floor writes a table note by hand. */
export const formatStamp = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

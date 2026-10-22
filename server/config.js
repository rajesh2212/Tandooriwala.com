/**
 * Booking setup values — EDIT THESE BEFORE LAUNCH.
 *
 * Nothing in this file is a verified fact about the restaurant:
 *
 *   1. `bookingSlots` — Tandooriwala has not confirmed its opening hours, so these
 *      four times are placeholders the owner should replace with real seatings.
 *      The /book page labels them as setup values rather than published hours.
 *   2. `floorPlan` / `diningRoom` — an editable approximation of the room, drawn to
 *      scale from the owner's description of the areas (balcony, toilet, cash
 *      counter, party area, private dining room). Move the blocks and tables to
 *      match reality; the map, the chair ids and the API all follow this file.
 *
 * Units are arbitrary: the client scales `room.width`/`room.height` into the map, so
 * only proportions matter. x/y are the CENTRE of a table or the top-left of an area.
 *
 * Chair geometry lives in src/components/TableMap.tsx (CHAIR, GAP) and the two maps
 * were laid out against it, so keep table footprints clear of the area blocks.
 */

export const bookingSlots = ['12:30', '13:30', '20:00', '21:00']

/** Non-bookable parts of the room, drawn and labelled so the map reads as a plan. */
export const floorPlan = {
  room: { width: 100, height: 88 },
  areas: [
    { id: 'balcony', label: 'Balcony', kind: 'open', x: 2, y: 2, w: 74, h: 7 },
    { id: 'cash', label: 'Cash counter', kind: 'service', x: 80, y: 2, w: 18, h: 7 },
    { id: 'private', label: 'Private dining room', kind: 'room', x: 80, y: 14, w: 18, h: 30 },
    { id: 'toilet', label: 'Toilet', kind: 'service', x: 80, y: 48, w: 18, h: 11 },
    { id: 'party', label: 'Party area', kind: 'open', x: 2, y: 72, w: 96, h: 14 },
  ],
  // A chair box reaches table edge + GAP + half a chair beyond the centre, so these
  // centres are spaced for that: no two chair boxes overlap anywhere in the room.
  tables: [
    { id: 'A1', shape: 'round', seats: 4, x: 18, y: 26, r: 6 },
    { id: 'A2', shape: 'round', seats: 4, x: 48, y: 26, r: 6 },
    { id: 'B1', shape: 'rect', seats: 2, x: 14, y: 52, w: 10, h: 6 },
    { id: 'B2', shape: 'rect', seats: 2, x: 38, y: 52, w: 10, h: 6 },
    { id: 'C1', shape: 'rect', seats: 6, x: 64, y: 52, w: 14, h: 7 },
  ],
}

/**
 * The private dining room, shown as its own map.
 *
 * Each table seats ONE COUPLE — the two chairs facing each other across the table
 * (`bookable`). The chairs on either side (`extra`) are drawn so the plan matches
 * the room, but they are deliberately not bookable: they cannot raise the room's
 * limit, which is two couples in total.
 */
export const diningRoom = {
  room: { width: 64, height: 42 },
  areas: [{ id: 'door', label: 'Doorway', kind: 'service', x: 26, y: 36, w: 12, h: 5 }],
  tables: [
    { id: 'P1', shape: 'round', seats: 4, x: 16, y: 21, r: 6 },
    { id: 'P2', shape: 'round', seats: 4, x: 48, y: 21, r: 6 },
  ],
  couples: [
    // Chair 1 is the top of the ring and 3 the bottom: the pair facing each other.
    { id: 'P1', table: 'P1', guests: 2, bookable: ['P1-1', 'P1-3'], extra: ['P1-2', 'P1-4'] },
    { id: 'P2', table: 'P2', guests: 2, bookable: ['P2-1', 'P2-3'], extra: ['P2-2', 'P2-4'] },
  ],
  /** Two couples in the room, one per table. Never raise this by adding chairs. */
  limit: { couples: 2, perTable: 1 },
}

/** Every chair the main hall has, e.g. 'A1-2'. Chairs are named per table, never re-used. */
export const chairIds = floorPlan.tables.flatMap((table) =>
  Array.from({ length: table.seats }, (_, index) => `${table.id}-${index + 1}`),
)

/** Bookable units of the private room: one id per table, each holding exactly one couple. */
export const coupleIds = diningRoom.couples.map((couple) => couple.id)

/** What a customer may actually reserve, in either room. The extra chairs are absent. */
export const bookableIds = new Set([...chairIds, ...coupleIds])

const hall = new Set(chairIds)
const couples = new Set(coupleIds)

export function isKnownSeat(seat) {
  return typeof seat === 'string' && bookableIds.has(seat)
}

export function isCouple(seat) {
  return couples.has(seat)
}

export function isHallChair(seat) {
  return hall.has(seat)
}

/** 'hall' | 'private' — the two areas cannot be mixed inside one booking. */
export function areaOf(seat) {
  if (couples.has(seat)) return 'private'
  if (hall.has(seat)) return 'hall'
  return null
}

/** Guests a set of seats can hold, so the party size cannot be inflated past the room. */
export function capacityOf(seats) {
  return seats.reduce((total, seat) => {
    if (couples.has(seat)) return total + diningRoom.couples.find((c) => c.id === seat).guests
    return hall.has(seat) ? total + 1 : total
  }, 0)
}

import type { CSSProperties } from 'react'
import type { DiningRoom, FloorArea, FloorPlan, FloorTable } from '../lib/bookings'
import { cn } from '../lib/cn'

/**
 * The floor plan, drawn from server/config.js.
 *
 * Seats are chair icons — back, seat, legs — turned to face their table, not dots on
 * a map. Available is white, yours is amber, somebody else's is red with a slash, and
 * the two tables in the private dining room book as couples rather than chairs.
 *
 * CHAIR and GAP are in the room's own units, and config.js spaces its tables against
 * these numbers, so the boxes never overlap.
 */
const CHAIR = 6
const GAP = 3.8

const chairStroke = {
  free: 'text-ink/55',
  picked: 'text-ink',
  taken: 'text-ember-700',
  /** Drawn for scale only. Not a seat anybody can reserve. */
  decor: 'text-ink/40',
} as const

const chairFill = {
  free: '#ffffff',
  picked: 'var(--color-saffron)',
  taken: 'var(--color-ember)',
  decor: 'var(--color-cream-400)',
} as const

const numberInk = {
  free: 'var(--color-ink)',
  picked: 'var(--color-ink)',
  taken: 'var(--color-cream)',
  decor: 'var(--color-ink-600)',
} as const

export type SeatState = keyof typeof chairFill

/**
 * A chair seen from above: a back bar wider than the seat pan, which is rounded at the
 * front where the legs go. The glyph is rotated about its own centre, so the number —
 * which is not rotated — always lands on the seat pan however the chair faces.
 *
 * The booked slash is drawn inside this SVG, before the number, so the diagonal cannot
 * strike through the digit it is standing on.
 */
function ChairGlyph({
  state,
  angle,
  number,
  slash,
}: {
  state: SeatState
  angle: number
  number?: number
  slash?: boolean
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full">
      <g
        transform={`rotate(${angle} 12 12)`}
        strokeWidth="1.7"
        strokeLinejoin="round"
        stroke="currentColor"
        fill={chairFill[state]}
        className={cn(chairStroke[state])}
      >
        <rect x="3.4" y="2.2" width="17.2" height="5" rx="2.2" />
        <rect x="5.6" y="7.8" width="12.8" height="13.4" rx="4.2" />
      </g>
      {slash && (
        <line
          x1="2.8"
          y1="21.2"
          x2="21.2"
          y2="2.8"
          stroke="var(--color-ink)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}
      {number !== undefined && (
        <text
          x="12"
          y="12"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fontWeight="700"
          stroke="none"
          fill={numberInk[state]}
        >
          {number}
        </text>
      )}
    </svg>
  )
}

/** Where a chair sits around a table, and which way it faces. */
type Placed = { chair: string; x: number; y: number; angle: number }

function faceAngle(table: FloorTable, x: number, y: number) {
  const theta = (Math.atan2(y - table.y, x - table.x) * 180) / Math.PI
  // The glyph faces down at 0 degrees, so this turns it toward the table centre.
  return theta + 90
}

function chairPositions(table: FloorTable): Placed[] {
  const seats: Placed[] = []
  const push = (index: number, x: number, y: number) =>
    seats.push({ chair: `${table.id}-${index + 1}`, x, y, angle: faceAngle(table, x, y) })

  if (table.shape === 'round') {
    const ring = (table.r ?? 6) + GAP
    for (let index = 0; index < table.seats; index += 1) {
      const angle = ((-90 + (360 / table.seats) * index) * Math.PI) / 180
      push(index, table.x + ring * Math.cos(angle), table.y + ring * Math.sin(angle))
    }
    return seats
  }

  const halfW = (table.w ?? 10) / 2
  const halfH = (table.h ?? 6) / 2
  const ends = table.seats >= 5 ? 2 : 0
  const sides = table.seats - ends
  const left = Math.ceil(sides / 2)
  const right = sides - left
  const step = Math.max((table.h ?? 6) + 2.2, 7.4)
  let next = 0
  for (let k = 0; k < left; k += 1) push(next++, table.x - halfW - GAP, table.y + (k - (left - 1) / 2) * step)
  for (let k = 0; k < right; k += 1) push(next++, table.x + halfW + GAP, table.y + (k - (right - 1) / 2) * step)
  if (ends) {
    push(next, table.x, table.y - halfH - GAP)
    push(next + 1, table.x, table.y + halfH + GAP)
  }
  return seats
}

type RoomSize = { width: number; height: number }

function placed(x: number, y: number, room: RoomSize, size = CHAIR): CSSProperties {
  return {
    left: `${(x / room.width) * 100}%`,
    top: `${(y / room.height) * 100}%`,
    width: `${(size / room.width) * 100}%`,
    transform: 'translate(-50%, -50%)',
  }
}

function areaStyle(area: FloorArea, room: RoomSize): CSSProperties {
  return {
    left: `${(area.x / room.width) * 100}%`,
    top: `${(area.y / room.height) * 100}%`,
    width: `${(area.w / room.width) * 100}%`,
    height: `${(area.h / room.height) * 100}%`,
  }
}

/**
 * 'open' is a stretch of floor with a use, 'service' a fixed counter, 'room' a closed
 * room. The styles differ so the plan reads without relying on the words alone.
 */
function areaClass(kind: FloorArea['kind']) {
  if (kind === 'room') return 'border-ink/45 bg-ink/8 border-dashed'
  if (kind === 'service') return 'border-ink/35 bg-ink/14'
  return 'border-ink/25 bg-cream/45'
}

function TableShape({ table, room }: { table: FloorTable; room: RoomSize }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute grid place-items-center bg-cream text-[0.66rem] font-bold tracking-wider text-ink-400 ring-1 ring-ink/15',
        table.shape === 'round' ? 'rounded-full' : 'rounded-[0.4rem]',
      )}
      style={
        table.shape === 'round'
          ? { ...placed(table.x, table.y, room, (table.r ?? 6) * 2), aspectRatio: '1' }
          : {
              left: `${((table.x - (table.w ?? 10) / 2) / room.width) * 100}%`,
              top: `${((table.y - (table.h ?? 6) / 2) / room.height) * 100}%`,
              width: `${((table.w ?? 10) / room.width) * 100}%`,
              height: `${((table.h ?? 6) / room.height) * 100}%`,
            }
      }
    >
      {table.id}
    </div>
  )
}

function SeatButton({
  seat,
  state,
  room,
  onToggle,
  label,
}: {
  seat: Placed
  state: SeatState
  room: RoomSize
  onToggle: (chair: string) => void
  label: string
}) {
  const taken = state === 'taken'
  const number = Number(seat.chair.split('-')[1])
  return (
    <button
      type="button"
      disabled={taken}
      aria-pressed={taken ? undefined : state === 'picked'}
      onClick={() => onToggle(seat.chair)}
      aria-label={label}
      title={label}
      style={placed(seat.x, seat.y, room)}
      className={cn(
        'absolute aspect-square rounded-[0.5rem] border-0 bg-transparent p-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
        taken ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <span className="relative block h-full w-full">
        <ChairGlyph state={state} angle={seat.angle} number={number} slash={taken} />
      </span>
    </button>
  )
}

function seatLabel(chair: string, state: SeatState) {
  const [table, index] = chair.split('-')
  const where = `Table ${table}, chair ${index}`
  if (state === 'taken') return `${where} — already booked for this seating`
  if (state === 'picked') return `${where} — selected`
  return `${where} — free, press to select`
}

export function TableMap({
  floorPlan,
  taken,
  selected,
  onToggle,
  onOpenPrivate,
}: {
  floorPlan: FloorPlan
  taken: string[]
  selected: string[]
  onToggle: (chair: string) => void
  /** Sets the private dining room map, where the plan's own room block is a jump link. */
  onOpenPrivate?: () => void
}) {
  const { room } = floorPlan
  const held = new Set(taken)

  return (
    <div
      className="overflow-x-auto pb-2"
      tabIndex={0}
      role="region"
      aria-describedby="map-legend"
      aria-label="Main hall floor plan, with the balcony, cash counter, private dining room, toilet and party area labelled. Scroll sideways to see every table; Tab reaches each chair and Enter or Space selects it."
    >
      <div
        className="relative mx-auto w-full min-w-[40rem] rounded-[1.25rem] bg-cream-200/70 ring-1 ring-ink/10"
        style={{ aspectRatio: `${room.width} / ${room.height}` }}
      >
        {floorPlan.areas.map((area) => {
          const open = area.id === 'private' && onOpenPrivate
          const body = (
            <>
              <span className="px-1 text-center text-[0.6rem] font-semibold leading-tight tracking-[0.06em] text-ink-600 uppercase">
                {area.label}
              </span>
              {open && (
                <span aria-hidden="true" className="text-[0.62rem] font-bold text-ember-700">
                  Open map →
                </span>
              )}
            </>
          )
          const shared = cn(
            'absolute flex flex-col items-center justify-center gap-0.5 border-2',
            areaClass(area.kind),
          )
          if (open) {
            return (
              <button
                key={area.id}
                type="button"
                onClick={onOpenPrivate}
                aria-label="Open the private dining room map"
                style={areaStyle(area, room)}
                className={cn(shared, 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember hover:bg-ink/14')}
              >
                {body}
              </button>
            )
          }
          return (
            <div key={area.id} aria-hidden="true" style={areaStyle(area, room)} className={shared}>
              {body}
            </div>
          )
        })}

        {floorPlan.tables.map((table) => (
          <TableShape key={table.id} table={table} room={room} />
        ))}

        {floorPlan.tables.flatMap((table) =>
          chairPositions(table).map((seat) => {
            const isTaken = held.has(seat.chair)
            const isPicked = !isTaken && selected.includes(seat.chair)
            const state: SeatState = isTaken ? 'taken' : isPicked ? 'picked' : 'free'
            return (
              <SeatButton
                key={seat.chair}
                seat={seat}
                state={state}
                room={room}
                onToggle={onToggle}
                label={seatLabel(seat.chair, state)}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}

/**
 * The private dining room, on its own map.
 *
 * Four chairs are drawn at each table because that is what the room has, but only the
 * pair facing one another across the table is bookable, and picking either of them
 * holds the whole table for one couple. The side chairs are muted and unreachable, so
 * they cannot add capacity the server has already capped at two couples.
 */
export function PrivateRoomMap({
  diningRoom,
  taken,
  selected,
  onToggle,
}: {
  diningRoom: DiningRoom
  taken: string[]
  selected: string[]
  onToggle: (couple: string) => void
}) {
  const { room } = diningRoom
  const couples = new Map(diningRoom.couples.map((couple) => [couple.id, couple]))
  const held = new Set(taken)

  return (
    <div
      className="overflow-x-auto pb-2"
      tabIndex={0}
      role="region"
      aria-describedby="map-legend"
      aria-label={`Private dining room map. Two tables, each held for one couple — two couples in a seating, one per table. Tab reaches each bookable chair and Enter or Space takes the table.`}
    >
      <div
        className="relative mx-auto w-full min-w-[26rem] rounded-[1.25rem] bg-cream-200/70 ring-1 ring-ink/10"
        style={{ aspectRatio: `${room.width} / ${room.height}` }}
      >
        {diningRoom.areas.map((area) => (
          <div
            key={area.id}
            aria-hidden="true"
            style={areaStyle(area, room)}
            className={cn(
              'absolute flex items-center justify-center border-2 text-[0.58rem] font-semibold tracking-[0.06em] text-ink-600 uppercase',
              areaClass(area.kind),
            )}
          >
            {area.label}
          </div>
        ))}

        {diningRoom.tables.map((table) => (
          <TableShape key={table.id} table={table} room={room} />
        ))}

        {diningRoom.tables.flatMap((table) => {
          const couple = couples.get(table.id)
          if (!couple) return []
          const isTaken = held.has(couple.id)
          const isPicked = !isTaken && selected.includes(couple.id)
          const state: SeatState = isTaken ? 'taken' : isPicked ? 'picked' : 'free'
          const bookable = new Set(couple.bookable)
          return chairPositions(table).map((seat) => {
            if (!bookable.has(seat.chair)) {
              return (
                <div
                  key={seat.chair}
                  aria-hidden="true"
                  title="Side chair — not bookable, and it does not add a seat"
                  style={placed(seat.x, seat.y, room)}
                  className="absolute aspect-square"
                >
                  <ChairGlyph state="decor" angle={seat.angle} />
                </div>
              )
            }
            const label = `Table ${couple.table}, couple seat ${seat.chair.split('-')[1]} — ${
              isTaken ? 'this table is taken for this seating' : isPicked ? 'held for your couple' : 'pick either chair to hold this table for one couple'
            }`
            return (
              <SeatButton
                key={seat.chair}
                seat={seat}
                state={state}
                room={room}
                onToggle={() => onToggle(couple.id)}
                label={label}
              />
            )
          })
        })}
      </div>
    </div>
  )
}

export function MapLegend() {
  const keys: { label: string; note: string; state: SeatState; crossed?: boolean }[] = [
    { label: 'Free', note: 'pick a chair', state: 'free' },
    { label: 'Yours', note: 'selected', state: 'picked' },
    { label: 'Booked', note: 'someone else has it', state: 'taken', crossed: true },
    { label: 'Side chair', note: 'not bookable', state: 'decor' },
  ]
  return (
    <ul id="map-legend" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600">
      {keys.map((key) => (
        <li key={key.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="relative block h-6 w-6">
            <ChairGlyph
              state={key.state}
              angle={0}
              number={key.state === 'decor' ? undefined : 2}
              slash={key.crossed}
            />
          </span>
          <span className="font-semibold text-ink">{key.label}</span>
          <span className="text-ink-400">{key.note}</span>
        </li>
      ))}
    </ul>
  )
}

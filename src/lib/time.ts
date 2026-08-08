/**
 * All event times are wall-clock times at the party's location. The server
 * runs in UTC (Vercel), so every server-side format must pin the timezone —
 * otherwise "15:00" renders as "13:00".
 */
export const EVENT_TIMEZONE = 'Europe/Berlin'

type Dated = { date: string; endDate?: string | null }

const partsIn = (instant: Date, timeZone: string): Record<string, number> => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts: Record<string, number> = {}
  for (const { type, value } of formatter.formatToParts(instant)) {
    if (type !== 'literal') parts[type] = Number(value)
  }
  // en-CA renders midnight as hour 24; every other hour is as expected.
  if (parts.hour === 24) parts.hour = 0
  return parts
}

/** How far `timeZone` is ahead of UTC at this instant, in ms. */
const zoneOffset = (instant: Date, timeZone: string): number => {
  const p = partsIn(instant, timeZone)
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * When a party is finally over: noon, local time, the day after it happens.
 *
 * Not the start time, and not the end time either. A party that begins at 20:00
 * runs into the small hours, and reading "Schon vorbei" while the guests are
 * still in the room is worse than saying nothing. Noon the next day is late
 * enough to cover any night and early enough that the event has stopped
 * claiming to be current by the time anyone looks again.
 *
 * `endDate` extends this rather than replacing it — a host who writes 23:00
 * means "the music stops", not "the page should call it history at 23:00".
 */
export function eventEndsAt(event: Dated): Date {
  const start = new Date(event.date).getTime()
  const end = event.endDate ? new Date(event.endDate).getTime() : 0
  const last = new Date(Math.max(start, end))

  const { year, month, day } = partsIn(last, EVENT_TIMEZONE)
  // Date.UTC normalises the overflow, so the last of a month or year is fine.
  const noonNextDay = Date.UTC(year, month - 1, day + 1, 12)
  // Convert that wall clock to a real instant. Germany's DST switches at
  // 02:00/03:00 local, so noon is never near the ambiguous hour.
  return new Date(noonNextDay - zoneOffset(new Date(noonNextDay), EVENT_TIMEZONE))
}

/** Whether the party is over — see eventEndsAt for what that means. */
export const isEventPast = (event: Dated, now: Date = new Date()): boolean =>
  eventEndsAt(event).getTime() <= now.getTime()

/**
 * Whether it has kicked off. Distinct from `isEventPast`: the photo gallery
 * unlocks here, at the start, while "over" is a much later thing.
 */
export const hasEventStarted = (event: Dated, now: Date = new Date()): boolean =>
  new Date(event.date).getTime() <= now.getTime()

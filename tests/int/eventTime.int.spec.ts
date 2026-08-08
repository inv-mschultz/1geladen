/**
 * When a party is over.
 *
 * All arithmetic is in Europe/Berlin while the server runs in UTC, so every
 * case here is written as a UTC instant and asserted against a Berlin wall
 * clock — the combination that produced the bug this fixes.
 */
import { describe, expect, it } from 'vitest'

import { eventEndsAt, hasEventStarted, isEventPast } from '@/lib/time'

/** A Berlin wall-clock time, as the UTC instant it actually is. */
const berlin = (iso: string, offsetHours: number) =>
  new Date(`${iso}:00.000Z`).getTime() - offsetHours * 3_600_000

describe('eventEndsAt', () => {
  it('is noon the next day, in Berlin time', () => {
    // 8 Aug 2026 19:00 Berlin = 17:00Z (CEST, +2)
    const ends = eventEndsAt({ date: '2026-08-08T17:00:00.000Z' })
    // 9 Aug 12:00 Berlin = 10:00Z
    expect(ends.toISOString()).toBe('2026-08-09T10:00:00.000Z')
  })

  it('does not call an evening party past while it is happening', () => {
    const event = { date: '2026-08-08T17:00:00.000Z' } // 19:00 Berlin
    const duringTheParty = new Date('2026-08-08T21:30:00.000Z') // 23:30 Berlin
    const smallHours = new Date('2026-08-09T01:00:00.000Z') // 03:00 Berlin
    expect(isEventPast(event, duringTheParty)).toBe(false)
    expect(isEventPast(event, smallHours)).toBe(false)
  })

  it('is past once noon passes', () => {
    const event = { date: '2026-08-08T17:00:00.000Z' }
    expect(isEventPast(event, new Date('2026-08-09T09:59:00.000Z'))).toBe(false)
    expect(isEventPast(event, new Date('2026-08-09T10:00:00.000Z'))).toBe(true)
    expect(isEventPast(event, new Date('2026-08-09T10:01:00.000Z'))).toBe(true)
  })

  it('extends past an explicit end time rather than obeying it', () => {
    // Host says it ends 23:00 Berlin; that must not make it history at 23:00.
    const event = { date: '2026-08-08T17:00:00.000Z', endDate: '2026-08-08T21:00:00.000Z' }
    expect(isEventPast(event, new Date('2026-08-08T21:30:00.000Z'))).toBe(false)
    expect(eventEndsAt(event).toISOString()).toBe('2026-08-09T10:00:00.000Z')
  })

  it('counts from the end date when it runs onto the next day', () => {
    // Starts 8 Aug, ends 9 Aug 02:00 Berlin → over at noon on the 10th.
    const event = { date: '2026-08-08T17:00:00.000Z', endDate: '2026-08-09T00:00:00.000Z' }
    expect(eventEndsAt(event).toISOString()).toBe('2026-08-10T10:00:00.000Z')
  })

  it('rolls over month and year ends', () => {
    // 31 Aug 20:00 Berlin → 1 Sep 12:00 Berlin
    expect(eventEndsAt({ date: '2026-08-31T18:00:00.000Z' }).toISOString()).toBe(
      '2026-09-01T10:00:00.000Z',
    )
    // 31 Dec 21:00 Berlin (CET, +1) → 1 Jan 12:00 Berlin = 11:00Z
    expect(eventEndsAt({ date: '2026-12-31T20:00:00.000Z' }).toISOString()).toBe(
      '2027-01-01T11:00:00.000Z',
    )
  })

  it('uses winter offset either side of the DST switch', () => {
    // 24 Oct 2026 20:00 Berlin is CEST (+2); the clocks go back on the 25th,
    // so noon on the 25th is CET (+1) = 11:00Z, not 10:00Z.
    expect(eventEndsAt({ date: '2026-10-24T18:00:00.000Z' }).toISOString()).toBe(
      '2026-10-25T11:00:00.000Z',
    )
  })

  it('treats a party just after Berlin midnight as belonging to that day', () => {
    // 00:30 Berlin on 9 Aug = 22:30Z on the 8th. Over at noon on the 10th,
    // not the 9th — the calendar day is the Berlin one, not the UTC one.
    expect(eventEndsAt({ date: '2026-08-08T22:30:00.000Z' }).toISOString()).toBe(
      '2026-08-10T10:00:00.000Z',
    )
  })

  it('keeps berlin() honest', () => {
    // Sanity check on the helper the cases above lean on.
    expect(berlin('2026-08-08T19:00', 2)).toBe(new Date('2026-08-08T17:00:00.000Z').getTime())
  })
})

describe('hasEventStarted', () => {
  it('flips at the start time, not at the end of the night', () => {
    const event = { date: '2026-08-08T17:00:00.000Z' }
    expect(hasEventStarted(event, new Date('2026-08-08T16:59:00.000Z'))).toBe(false)
    expect(hasEventStarted(event, new Date('2026-08-08T17:00:00.000Z'))).toBe(true)
    // Still started, long before it counts as past — this is what unlocks the
    // photo gallery during the party.
    const during = new Date('2026-08-08T22:00:00.000Z')
    expect(hasEventStarted(event, during)).toBe(true)
    expect(isEventPast(event, during)).toBe(false)
  })
})

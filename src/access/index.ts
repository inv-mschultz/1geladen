import type { Access, FieldAccess, Payload, PayloadRequest, Where } from 'payload'
import { Forbidden } from 'payload'
import { cache } from 'react'

import { DELETED_GUEST_EMAIL } from '@/lib/deletedGuest'
import type { User } from '@/payload-types'

/** The id out of a relationship value, whether it came back populated or raw. */
export const relId = (value: unknown): number | null => {
  if (value == null) return null
  if (typeof value === 'object') return (value as { id?: number }).id ?? null
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

/** The ids out of a hasMany relationship value. */
export const toIds = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(relId).filter((id): id is number => id !== null) : []

/**
 * The old world, where `role: 'admin'` meant control over every event.
 *
 * Off now. Kept behind a flag so handing the blanket rights back is a config
 * change rather than a deploy: set LEGACY_GLOBAL_ADMIN=1 and redeploy without
 * rebuilding. Read per call rather than at module load so that env change lands
 * on its own, and so the tests can flip it.
 *
 * Delete the flag, and every `globalBypass` call, once production has run a
 * clean week on per-event hosts.
 */
export const globalBypass = (user: User | null | undefined): boolean =>
  process.env.LEGACY_GLOBAL_ADMIN === '1' && user?.role === 'admin'

/**
 * May create events and enter the backstage. This is a capability, *not*
 * control over any particular event — that lives in `events.hosts`. An admin
 * who hosts nothing has a guest's rights to everybody else's party.
 */
export const isPlatformAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isPlatformAdminFieldLevel: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin'

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

export const anyone: Access = () => true

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (globalBypass(user)) return true
  return { id: { equals: user.id } }
}

/**
 * Deduped per request. Nearly every access check needs this, and a single
 * event view checks access for rsvps, posts, comments, bring items, reactions
 * and media — so this ran a dozen-plus times per render, each an identical
 * query. Keyed on the user id rather than the request, because Payload builds a
 * fresh `req` for every Local API call and identity-keyed caching would always
 * miss. Falls back to querying normally outside a request scope, so the worst
 * case is the old behaviour rather than a wrong answer.
 *
 * One query answers three questions, so adding per-event hosts did not add a
 * second cached lookup — that would have doubled exactly what this exists to
 * prevent.
 */
type EventScope = {
  /** Events the user can see at all: member of, or host of. */
  visibleIds: number[]
  /** Events the user runs. */
  hostedIds: number[]
  /** Everyone who shares one of those events with them, themselves included. */
  peerUserIds: number[]
}

const eventScopeForUser = cache(async (payload: Payload, userId: number): Promise<EventScope> => {
  const { docs } = await payload.find({
    collection: 'events',
    // A host who somehow isn't on the guest list still sees their own event,
    // so the hosts ⊆ members invariant is never load-bearing for reads.
    where: { or: [{ members: { in: [userId] } }, { hosts: { in: [userId] } }] },
    // Now gates hosting, not just visibility — being silently truncated out of
    // an event you run would be a lockout, not a missing list entry.
    limit: 500,
    depth: 0,
    select: { hosts: true, members: true },
    overrideAccess: true,
  })

  const visibleIds: number[] = []
  const hostedIds: number[] = []
  const peers = new Set<number>([userId])

  for (const event of docs) {
    const hosts = toIds(event.hosts)
    visibleIds.push(event.id)
    if (hosts.includes(userId)) hostedIds.push(event.id)
    for (const id of hosts) peers.add(id)
    for (const id of toIds(event.members)) peers.add(id)
  }

  return { visibleIds, hostedIds, peerUserIds: [...peers] }
})

const scopeFor = async (
  payload: Payload,
  user: { id: number } | null | undefined,
): Promise<EventScope> =>
  user ? eventScopeForUser(payload, user.id) : { visibleIds: [], hostedIds: [], peerUserIds: [] }

/** IDs of all events the user can see — member of, or host of. */
export async function memberEventIds(req: PayloadRequest): Promise<number[]> {
  return (await scopeFor(req.payload, req.user)).visibleIds
}

/** IDs of all events the user hosts. */
export async function hostEventIds(req: PayloadRequest): Promise<number[]> {
  return (await scopeFor(req.payload, req.user)).hostedIds
}

/** IDs of everyone sharing an event with the user, including the user. */
export async function peerUserIds(req: PayloadRequest): Promise<number[]> {
  return (await scopeFor(req.payload, req.user)).peerUserIds
}

/** Whether the user hosts the given event. */
export async function isHostOf(
  req: PayloadRequest,
  event: number | { id: number } | null | undefined,
): Promise<boolean> {
  const eventId = relId(event)
  if (!req.user || !eventId) return false
  return (await hostEventIds(req)).includes(eventId)
}

/**
 * Whether the user may act with the event's authority — moderate its wall, pin
 * an entry on somebody else's behalf, reassign an RSVP.
 *
 * Distinct from `isHostOf`, which answers the plain factual question and is what
 * the UI should ask. This one also honours the legacy bypass, so the collection
 * hooks that pin ownership flip with the flag rather than with a deploy.
 */
export async function canActAsHost(
  req: PayloadRequest,
  event: number | { id: number } | null | undefined,
): Promise<boolean> {
  return globalBypass(req.user) || isHostOf(req, event)
}

/**
 * Same question from a server component or action, which has `payload` and a
 * user but no PayloadRequest. Shares the cache entry with `isHostOf`.
 */
export async function isHostOfFor(
  payload: Payload,
  user: { id: number } | null | undefined,
  event: number | { id: number } | null | undefined,
): Promise<boolean> {
  const eventId = relId(event)
  if (!user || !eventId) return false
  return (await scopeFor(payload, user)).hostedIds.includes(eventId)
}

/**
 * Read access for the Users collection: yourself, plus everyone you share an
 * event with.
 *
 * This used to be "any logged-in user", which was tolerable while admins were
 * globally trusted. Once hosts are independent it means one host can enumerate
 * another's guest list — names and email addresses — through /api/users.
 */
export const isEventPeerOrSelf: Access = async ({ req }) => {
  if (!req.user) return false
  if (globalBypass(req.user)) return true
  return {
    or: [
      { id: { in: await peerUserIds(req) } },
      // The sentinel that inherits departed guests' posts belongs to no event.
      // Relationship population respects read access, so without this exemption
      // their threads would render with a blank author.
      { email: { equals: DELETED_GUEST_EMAIL } },
    ],
  } as Where
}

/**
 * Read access for the Events collection itself: the events you were invited to,
 * plus the ones you run.
 */
export const isEventMemberOrHost: Access = ({ req: { user } }) => {
  if (!user) return false
  if (globalBypass(user)) return true
  return { or: [{ members: { in: [user.id] } }, { hosts: { in: [user.id] } }] } as Where
}

/**
 * Docs inside events the user hosts. `path` is the query path to the event id,
 * e.g. 'event', 'post.event', or 'id' on the Events collection itself.
 */
export const isEventHost =
  (path: string): Access =>
  async ({ req }) => {
    if (!req.user) return false
    if (globalBypass(req.user)) return true
    const ids = await hostEventIds(req)
    if (ids.length === 0) return false
    return { [path]: { in: ids } } as Where
  }

/**
 * Your own docs, plus everything inside events you host — the moderation power
 * that used to belong to every admin everywhere.
 *
 * Both arguments are required on purpose: this replaced `isAdminOrOwner(field)`,
 * and making the event path mandatory turns "I forgot a call site" from a silent
 * privilege change into a type error.
 */
export const isOwnerOrEventHost =
  (ownerField: string, eventPath: string): Access =>
  async ({ req }) => {
    if (!req.user) return false
    if (globalBypass(req.user)) return true
    const mine = { [ownerField]: { equals: req.user.id } }
    const ids = await hostEventIds(req)
    if (ids.length === 0) return mine as Where
    return { or: [mine, { [eventPath]: { in: ids } }] } as Where
  }

/** Field access for a doc that belongs to an event. Wire to update/read only —
 *  on create there is no `doc` yet, so it correctly denies. */
export const isEventHostField =
  (eventPath = 'event'): FieldAccess =>
  async ({ req, doc }) => {
    if (globalBypass(req.user)) return true
    return isHostOf(req, relId((doc as Record<string, unknown> | undefined)?.[eventPath]))
  }

/** Field access for fields *on* an event: only its current hosts may write them.
 *  Reads `doc.hosts` directly, so it costs no query. */
export const isEventHostFieldSelf: FieldAccess = ({ req: { user }, doc }) => {
  if (globalBypass(user)) return true
  if (!user) return false
  return toIds((doc as { hosts?: unknown } | undefined)?.hosts).includes(user.id)
}

/**
 * Read access for collections that hang off an event (posts, rsvps, …):
 * you see the content of events you belong to or host, and nothing else.
 * `path` is the query path to the event id, e.g. 'event' or 'post.event'.
 */
export const isEventMember =
  (path: string): Access =>
  async ({ req }) => {
    if (!req.user) return false
    if (globalBypass(req.user)) return true
    const ids = await memberEventIds(req)
    if (ids.length === 0) return false
    return { [path]: { in: ids } } as Where
  }

/** Throws unless the user belongs to, or hosts, the given event. */
export async function assertEventMember(
  req: PayloadRequest,
  event: number | { id: number } | null | undefined,
): Promise<void> {
  if (!req.user) throw new Forbidden()
  if (globalBypass(req.user)) return
  const eventId = relId(event)
  if (!eventId) throw new Forbidden()
  const ids = await memberEventIds(req)
  if (!ids.includes(eventId)) throw new Forbidden()
}

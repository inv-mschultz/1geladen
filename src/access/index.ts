import type { Access, FieldAccess, Payload, PayloadRequest, Where } from 'payload'
import { Forbidden } from 'payload'
import { cache } from 'react'

import type { User } from '@/payload-types'

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

export const anyone: Access = () => true

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

/** Grants full access to admins, otherwise limits to docs where `field` points at the user. */
export const isAdminOrOwner =
  (field: string): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return { [field]: { equals: user.id } }
  }

export const hasRole = (user: User | null | undefined, role: User['role']): boolean =>
  user?.role === role

/**
 * Deduped per request. Nearly every access check needs this list, and a single
 * event view checks access for rsvps, posts, comments, bring items, reactions
 * and media — so this ran a dozen-plus times per render, each an identical
 * query. Keyed on the user id rather than the request, because Payload builds a
 * fresh `req` for every Local API call and identity-keyed caching would always
 * miss. Falls back to querying normally outside a request scope, so the worst
 * case is the old behaviour rather than a wrong answer.
 */
const eventIdsForUser = cache(async (payload: Payload, userId: number): Promise<number[]> => {
  const { docs } = await payload.find({
    collection: 'events',
    where: { members: { in: [userId] } },
    limit: 100,
    depth: 0,
    select: {},
    overrideAccess: true,
  })
  return docs.map((event) => event.id)
})

/** IDs of all events the user is a member of. */
export async function memberEventIds(req: PayloadRequest): Promise<number[]> {
  if (!req.user) return []
  return eventIdsForUser(req.payload, req.user.id)
}

/**
 * Read access for collections that hang off an event (posts, rsvps, …):
 * admins see everything, guests only content of events they belong to.
 * `path` is the query path to the event id, e.g. 'event' or 'post.event'.
 */
export const isEventMember =
  (path: string): Access =>
  async ({ req }) => {
    if (!req.user) return false
    if (req.user.role === 'admin') return true
    const ids = await memberEventIds(req)
    if (ids.length === 0) return false
    return { [path]: { in: ids } } as Where
  }

/** Throws unless the user is an admin or a member of the given event. */
export async function assertEventMember(
  req: PayloadRequest,
  event: number | { id: number } | null | undefined,
): Promise<void> {
  if (!req.user) throw new Forbidden()
  if (req.user.role === 'admin') return
  const eventId = typeof event === 'object' && event !== null ? event.id : event
  if (!eventId) throw new Forbidden()
  const ids = await memberEventIds(req)
  if (!ids.includes(eventId)) throw new Forbidden()
}

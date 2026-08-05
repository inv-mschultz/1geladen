import type { Payload, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { toIds } from '@/access'

/**
 * Refuses to delete somebody who is the only host of an event.
 *
 * `events_rels.users_id` is ON DELETE cascade, so deleting a user silently
 * removes them from every hosts list — no error, no warning, and an event with
 * an empty hosts list can be read, edited and deleted by nobody at all. There
 * is no global admin left to rescue it, so the delete has to be stopped here.
 */
export async function assertNotSoleHost(req: PayloadRequest, userId: number): Promise<void> {
  const { docs } = await req.payload.find({
    collection: 'events',
    where: { hosts: { in: [userId] } },
    limit: 100,
    depth: 0,
    select: { hosts: true, title: true },
    overrideAccess: true,
    req,
  })

  const orphaned = docs.filter((event) => toIds(event.hosts).length <= 1)
  if (orphaned.length === 0) return

  const titles = orphaned.map((event) => `“${event.title}”`).join(', ')
  throw new APIError(
    `This account is the only host of ${titles}. Give those events another host first, ` +
      `otherwise nobody would be able to open them.`,
    400,
  )
}

/** Adds a user to an event's guest list (idempotent). */
export async function addEventMember(
  payload: Payload,
  event: { id: number; members?: (number | { id: number })[] | null },
  userId: number,
): Promise<void> {
  const memberIds = (event.members ?? []).map((member) =>
    typeof member === 'object' ? member.id : member,
  )
  if (memberIds.includes(userId)) return
  await payload.update({
    collection: 'events',
    id: event.id,
    data: { members: [...memberIds, userId] },
    overrideAccess: true,
  })
}

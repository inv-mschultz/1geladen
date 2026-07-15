import type { Payload } from 'payload'

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

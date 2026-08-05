/**
 * Per-event admin rights.
 *
 * `role: 'admin'` is a capability — may create events, may enter the backstage.
 * Control over a *given* event comes from that event's `hosts` list. These tests
 * pin down the difference, because it is the kind of thing that regresses
 * silently: a forgotten access helper doesn't throw, it just quietly hands
 * somebody the keys to a party they weren't invited to.
 *
 * Everything runs with the legacy bypass off, i.e. the world after Phase D.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import config from '@/payload.config'

const MARK = 'hostaccess-fixture'

let payload: Payload
let hostA: User
let hostB: User
let guest: User
let outsider: User
let eventA: { id: number }
let eventB: { id: number }

/** Whether an operation was refused, without caring how it was refused. */
const refused = async (op: Promise<unknown>): Promise<boolean> =>
  op.then(
    () => false,
    () => true,
  )

const makeUser = (name: string, role: 'admin' | 'guest') =>
  payload.create({
    collection: 'users',
    data: {
      name: `${MARK}-${name}`,
      email: `${MARK}-${name}@example.test`,
      password: 'partey2010',
      role,
    },
    overrideAccess: true,
  }) as Promise<User>

/**
 * Removes everything this suite creates. Runs before as well as after, so a
 * crashed run doesn't poison the next one with duplicate emails — these tests
 * share the dev database.
 */
async function cleanup(): Promise<void> {
  const { docs: events } = await payload.find({
    collection: 'events',
    where: { slug: { like: MARK } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  const eventIds = events.map((event) => event.id)

  if (eventIds.length > 0) {
    // Comments hang off the event through their post, not directly — the same
    // nested path the access rules have to walk.
    const byEvent = { event: { in: eventIds } }
    await payload.delete({
      collection: 'reactions',
      where: byEvent,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'comments',
      where: { 'post.event': { in: eventIds } },
      overrideAccess: true,
    })
    for (const collection of ['posts', 'rsvps', 'bring-items'] as const) {
      await payload.delete({ collection, where: byEvent, overrideAccess: true })
    }
    await payload.delete({
      collection: 'events',
      where: { id: { in: eventIds } },
      overrideAccess: true,
    })
  }

  await payload.delete({
    collection: 'users',
    where: { name: { like: MARK } },
    overrideAccess: true,
  })
}

describe('per-event host access', () => {
  beforeAll(async () => {
    // The whole point of these tests is the world without a global admin.
    process.env.LEGACY_GLOBAL_ADMIN = '0'
    payload = await getPayload({ config: await config })
    await cleanup()

    // Both hosts carry role 'admin': the capability to create events. Neither
    // may touch the other's party — that is what separates the two concepts.
    hostA = await makeUser('host-a', 'admin')
    hostB = await makeUser('host-b', 'admin')
    guest = await makeUser('guest', 'guest')
    outsider = await makeUser('outsider', 'guest')

    const makeEvent = (slug: string, host: User) =>
      payload.create({
        collection: 'events',
        data: {
          title: `${MARK} ${slug}`,
          slug: `${MARK}-${slug}`,
          date: new Date(Date.now() + 86_400_000).toISOString(),
          createdBy: host.id,
          members: [host.id, guest.id],
        },
        overrideAccess: true,
      })

    eventA = await makeEvent('event-a', hostA)
    eventB = await makeEvent('event-b', hostB)
  })

  afterAll(async () => {
    delete process.env.LEGACY_GLOBAL_ADMIN
    if (payload) await cleanup()
  })

  describe('events', () => {
    it('shows a host their own event and nobody else’s', async () => {
      const { docs } = await payload.find({
        collection: 'events',
        where: { slug: { like: MARK } },
        overrideAccess: false,
        user: hostA,
        depth: 0,
      })
      expect(docs.map((d) => d.id)).toEqual([eventA.id])
    })

    it('gives an organizer who hosts nothing no events at all', async () => {
      const nobody = await makeUser('hostless-admin', 'admin')
      const { docs } = await payload.find({
        collection: 'events',
        overrideAccess: false,
        user: nobody,
        depth: 0,
      })
      expect(docs).toHaveLength(0)
    })

    it('lets a host edit and delete their own event', async () => {
      const throwaway = await payload.create({
        collection: 'events',
        data: {
          title: `${MARK} throwaway`,
          slug: `${MARK}-throwaway`,
          date: new Date().toISOString(),
          createdBy: hostA.id,
        },
        overrideAccess: true,
      })
      await expect(
        payload.update({
          collection: 'events',
          id: throwaway.id,
          data: { title: `${MARK} renamed` },
          overrideAccess: false,
          user: hostA,
        }),
      ).resolves.toBeTruthy()
      await expect(
        payload.delete({ collection: 'events', id: throwaway.id, overrideAccess: false, user: hostA }),
      ).resolves.toBeTruthy()
    })

    it('refuses a host editing or deleting somebody else’s event', async () => {
      expect(
        await refused(
          payload.update({
            collection: 'events',
            id: eventB.id,
            data: { title: 'hijacked' },
            overrideAccess: false,
            user: hostA,
          }),
        ),
      ).toBe(true)
      expect(
        await refused(
          payload.delete({ collection: 'events', id: eventB.id, overrideAccess: false, user: hostA }),
        ),
      ).toBe(true)
    })

    it('lets a guest see both events but edit neither', async () => {
      const { docs } = await payload.find({
        collection: 'events',
        where: { slug: { like: MARK } },
        overrideAccess: false,
        user: guest,
        depth: 0,
      })
      expect(docs.map((d) => d.id).sort()).toEqual([eventA.id, eventB.id].sort())
      expect(
        await refused(
          payload.update({
            collection: 'events',
            id: eventA.id,
            data: { title: 'nope' },
            overrideAccess: false,
            user: guest,
          }),
        ),
      ).toBe(true)
    })

    it('shows an outsider nothing', async () => {
      const { docs } = await payload.find({
        collection: 'events',
        where: { slug: { like: MARK } },
        overrideAccess: false,
        user: outsider,
        depth: 0,
      })
      expect(docs).toHaveLength(0)
    })
  })

  describe('invariants', () => {
    it('makes the creator a host and a member', async () => {
      const created = await payload.create({
        collection: 'events',
        data: {
          title: `${MARK} invariant`,
          slug: `${MARK}-invariant`,
          date: new Date().toISOString(),
        },
        overrideAccess: false,
        user: hostA,
        depth: 0,
      })
      expect(created.hosts).toEqual([hostA.id])
      expect(created.members).toContain(hostA.id)
      await payload.delete({ collection: 'events', id: created.id, overrideAccess: true })
    })

    it('refuses to leave an event without a host', async () => {
      expect(
        await refused(
          payload.update({
            collection: 'events',
            id: eventA.id,
            data: { hosts: [] },
            overrideAccess: true,
          }),
        ),
      ).toBe(true)
    })

    it('hides the invite token from a member but not from a host', async () => {
      const asGuest = await payload.findByID({
        collection: 'events',
        id: eventA.id,
        overrideAccess: false,
        user: guest,
      })
      expect(asGuest.inviteToken).toBeUndefined()

      const asHost = await payload.findByID({
        collection: 'events',
        id: eventA.id,
        overrideAccess: false,
        user: hostA,
      })
      expect(typeof asHost.inviteToken).toBe('string')
    })
  })

  describe('moderation inside an event', () => {
    // The create hooks run even under overrideAccess, and assertEventMember
    // needs a req.user — so fixtures are authored by a real member.
    const postIn = (eventId: number, author: User) =>
      payload.create({
        collection: 'posts',
        data: { event: eventId, author: author.id, content: `${MARK} hello` },
        overrideAccess: true,
        user: author,
      })

    it('lets a host delete a guest’s post in their event, but not in another', async () => {
      const inA = await postIn(eventA.id, guest)
      const inB = await postIn(eventB.id, guest)

      expect(
        await refused(
          payload.delete({ collection: 'posts', id: inB.id, overrideAccess: false, user: hostA }),
        ),
      ).toBe(true)
      await expect(
        payload.delete({ collection: 'posts', id: inA.id, overrideAccess: false, user: hostA }),
      ).resolves.toBeTruthy()
    })

    // Comments reach their event through `post.event` — a nested relationship
    // path, which is the part most likely to silently stop filtering.
    it('resolves the nested post.event path for comments', async () => {
      const parentA = await postIn(eventA.id, guest)
      const parentB = await postIn(eventB.id, guest)
      const mk = (post: { id: number }) =>
        payload.create({
          collection: 'comments',
          data: { post: post.id, author: guest.id, content: `${MARK} comment` },
          overrideAccess: true,
          user: guest,
        })
      const inA = await mk(parentA)
      const inB = await mk(parentB)

      expect(
        await refused(
          payload.delete({ collection: 'comments', id: inB.id, overrideAccess: false, user: hostA }),
        ),
      ).toBe(true)
      await expect(
        payload.delete({ collection: 'comments', id: inA.id, overrideAccess: false, user: hostA }),
      ).resolves.toBeTruthy()
    })

    it('lets a host reassign an RSVP in their event only', async () => {
      const mk = (eventId: number) =>
        payload.create({
          collection: 'rsvps',
          data: { event: eventId, user: guest.id, status: 'yes' as const },
          overrideAccess: true,
        })
      const inA = await mk(eventA.id)
      const inB = await mk(eventB.id)

      const reassigned = await payload.update({
        collection: 'rsvps',
        id: inA.id,
        data: { user: outsider.id },
        overrideAccess: false,
        user: hostA,
        depth: 0,
      })
      expect(reassigned.user).toBe(outsider.id)

      expect(
        await refused(
          payload.update({
            collection: 'rsvps',
            id: inB.id,
            data: { status: 'no' },
            overrideAccess: false,
            user: hostA,
          }),
        ),
      ).toBe(true)
    })

    it('refuses an organizer impersonating an author in an event they only attend', async () => {
      // hostB is role 'admin' and a member of nothing here — but even as a plain
      // member they must not be able to post as somebody else.
      await payload.update({
        collection: 'events',
        id: eventA.id,
        data: { members: [hostA.id, guest.id, hostB.id] },
        overrideAccess: true,
      })

      const post = await payload.create({
        collection: 'posts',
        data: { event: eventA.id, author: guest.id, content: `${MARK} impersonation` },
        overrideAccess: false,
        user: hostB,
        depth: 0,
      })
      expect(post.author).toBe(hostB.id)
    })

    it('still refuses a host deleting a guest’s bring item', async () => {
      // Deliberate: removing somebody's entry is their call, not the host's.
      const item = await payload.create({
        collection: 'bring-items',
        data: { event: eventA.id, title: `${MARK} salad`, createdBy: guest.id },
        overrideAccess: true,
        user: guest,
      })
      expect(
        await refused(
          payload.delete({
            collection: 'bring-items',
            id: item.id,
            overrideAccess: false,
            user: hostA,
          }),
        ),
      ).toBe(true)

      // …but editing it is fine.
      await expect(
        payload.update({
          collection: 'bring-items',
          id: item.id,
          data: { note: `${MARK} bring more` },
          overrideAccess: false,
          user: hostA,
        }),
      ).resolves.toBeTruthy()
    })
  })

  // The server action itself needs a request context, so these cover the rules
  // it enforces at the layer underneath it.
  describe('promoting and demoting', () => {
    it('lets a host promote a member, who can then edit the event', async () => {
      await payload.update({
        collection: 'events',
        id: eventA.id,
        data: { hosts: [hostA.id, guest.id] },
        overrideAccess: false,
        user: hostA,
      })

      await expect(
        payload.update({
          collection: 'events',
          id: eventA.id,
          data: { title: `${MARK} event-a renamed by co-host` },
          overrideAccess: false,
          user: guest,
        }),
      ).resolves.toBeTruthy()

      // …and only this event. Promotion is not a platform-wide grant.
      expect(
        await refused(
          payload.update({
            collection: 'events',
            id: eventB.id,
            data: { title: 'nope' },
            overrideAccess: false,
            user: guest,
          }),
        ),
      ).toBe(true)
    })

    it('refuses a non-host rewriting the hosts list', async () => {
      // Field access strips `hosts`, so the write silently does nothing rather
      // than throwing — assert the list is unchanged, not that it threw.
      await payload
        .update({
          collection: 'events',
          id: eventB.id,
          data: { hosts: [outsider.id] },
          overrideAccess: false,
          user: guest,
        })
        .catch(() => undefined)

      const after = await payload.findByID({
        collection: 'events',
        id: eventB.id,
        depth: 0,
        overrideAccess: true,
      })
      expect(after.hosts).toEqual([hostB.id])
    })

    it('demotes back down to one host but no further', async () => {
      const after = await payload.update({
        collection: 'events',
        id: eventA.id,
        data: { hosts: [hostA.id] },
        overrideAccess: false,
        user: hostA,
        depth: 0,
      })
      expect(after.hosts).toEqual([hostA.id])
      expect(
        await refused(
          payload.update({
            collection: 'events',
            id: eventA.id,
            data: { hosts: [] },
            overrideAccess: false,
            user: hostA,
          }),
        ),
      ).toBe(true)
    })
  })

  describe('deleting a host', () => {
    it('refuses to delete the only host of an event', async () => {
      // The FK is ON DELETE cascade, so without the guard this would succeed
      // and quietly leave an event nobody can open.
      expect(
        await refused(
          payload.delete({ collection: 'users', id: hostA.id, overrideAccess: true }),
        ),
      ).toBe(true)

      const still = await payload.findByID({
        collection: 'events',
        id: eventA.id,
        depth: 0,
        overrideAccess: true,
      })
      expect(still.hosts).toContain(hostA.id)
    })

    it('allows it once the event has another host', async () => {
      const spare = await makeUser('spare-host', 'guest')
      const solo = await payload.create({
        collection: 'events',
        data: {
          title: `${MARK} handover`,
          slug: `${MARK}-handover`,
          date: new Date().toISOString(),
          createdBy: spare.id,
        },
        overrideAccess: true,
      })
      expect(
        await refused(payload.delete({ collection: 'users', id: spare.id, overrideAccess: true })),
      ).toBe(true)

      await payload.update({
        collection: 'events',
        id: solo.id,
        data: { hosts: [spare.id, hostA.id] },
        overrideAccess: true,
      })
      await expect(
        payload.delete({ collection: 'users', id: spare.id, overrideAccess: true }),
      ).resolves.toBeTruthy()

      await payload.delete({ collection: 'events', id: solo.id, overrideAccess: true })
    })

    it('does not block deleting a plain guest', async () => {
      const leaving = await makeUser('leaving', 'guest')
      await expect(
        payload.delete({ collection: 'users', id: leaving.id, overrideAccess: true }),
      ).resolves.toBeTruthy()
    })
  })

  describe('user list', () => {
    it('shows only people sharing an event, plus yourself', async () => {
      const { docs } = await payload.find({
        collection: 'users',
        where: { name: { like: MARK } },
        overrideAccess: false,
        user: outsider,
        depth: 0,
        limit: 100,
      })
      expect(docs.map((d) => d.id)).toEqual([outsider.id])
    })

    it('lets a guest see their fellow guests', async () => {
      const { docs } = await payload.find({
        collection: 'users',
        where: { name: { like: MARK } },
        overrideAccess: false,
        user: guest,
        depth: 0,
        limit: 100,
      })
      const ids = docs.map((d) => d.id)
      expect(ids).toContain(hostA.id)
      expect(ids).not.toContain(outsider.id)
    })
  })
})

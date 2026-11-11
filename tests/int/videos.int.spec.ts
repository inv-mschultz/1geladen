// @vitest-environment node
/**
 * Gallery videos: off unless a platform admin greenlights the party, and that
 * greenlight is all an admin outside the party gets to touch. See lib/video.
 *
 * Runs without a Blob store, so videos take the local path (the file comes
 * along) rather than the browser-to-Blob one.
 */
import { readFileSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ownEventsFor, relId } from '@/access'
import type { Event, User } from '@/payload-types'
import config from '@/payload.config'

const MARK = 'videos-fixture'

let payload: Payload
let admin: User
let host: User
let guest: User
let partyId: number

const clip = readFileSync(path.resolve(__dirname, '../fixtures/clip.mp4'))

const makeUser = (name: string, role: 'admin' | 'guest' = 'guest') =>
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

const uploadVideo = (user: User, data: Record<string, unknown>) =>
  payload.create({
    collection: 'media',
    file: { data: clip, name: 'clip.mp4', mimetype: 'video/mp4', size: clip.length },
    data: { alt: MARK, ...data },
    overrideAccess: false,
    user,
  })

const setVideosAllowed = (user: User, videosAllowed: boolean) =>
  payload.update({
    collection: 'events',
    id: partyId,
    data: { videosAllowed },
    overrideAccess: false,
    user,
  })

const party = () =>
  payload.findByID({ collection: 'events', id: partyId, depth: 0, overrideAccess: true })

async function cleanup(): Promise<void> {
  await payload.delete({
    collection: 'media',
    where: { alt: { equals: MARK } },
    overrideAccess: true,
  })
  const { docs: events } = await payload.find({
    collection: 'events',
    where: { slug: { like: MARK } },
    depth: 0,
    overrideAccess: true,
  })
  for (const event of events) {
    await payload.delete({ collection: 'events', id: event.id, overrideAccess: true })
  }
  await payload.delete({
    collection: 'users',
    where: { name: { like: MARK } },
    overrideAccess: true,
  })
}

describe('gallery videos', () => {
  beforeAll(async () => {
    process.env.LEGACY_GLOBAL_ADMIN = '0'
    payload = await getPayload({ config: await config })
    await cleanup()
    admin = await makeUser('admin', 'admin')
    host = await makeUser('host')
    guest = await makeUser('guest')
    partyId = (
      await payload.create({
        collection: 'events',
        data: {
          title: `${MARK} party`,
          slug: `${MARK}-party`,
          date: new Date(Date.now() - 3_600_000).toISOString(),
          hosts: [host.id],
          members: [host.id, guest.id],
          description: {
            root: {
              type: 'root',
              children: [],
              direction: null,
              format: '',
              indent: 0,
              version: 1,
            },
          },
          location: { street: 'Geheimweg 1' },
        },
        overrideAccess: true,
      })
    ).id
  })

  afterAll(async () => {
    delete process.env.LEGACY_GLOBAL_ADMIN
    if (payload) await cleanup()
  })

  it('are refused until the party is greenlit', async () => {
    await expect(uploadVideo(guest, { event: partyId })).rejects.toThrow()
  })

  it('the host cannot greenlight their own party', async () => {
    await setVideosAllowed(host, true)
    expect((await party()).videosAllowed).toBe(false)
  })

  describe('a platform admin outside the party', () => {
    it('sees it in the backstage, but not what is inside', async () => {
      const event = (await payload.findByID({
        collection: 'events',
        id: partyId,
        depth: 0,
        overrideAccess: false,
        user: admin,
      })) as Event
      expect(event.title).toBe(`${MARK} party`)
      expect(event.location).toBeUndefined()
      expect(event.members).toBeUndefined()
      expect(event.description).toBeUndefined()
      expect(event.inviteToken).toBeUndefined()
    })

    it('does not get it on their own overview', async () => {
      const { docs } = await payload.find({
        collection: 'events',
        where: { and: [await ownEventsFor(payload, admin), { id: { equals: partyId } }] },
        overrideAccess: false,
        user: admin,
      })
      expect(docs).toHaveLength(0)
    })

    it('can greenlight it, and change nothing else', async () => {
      await payload.update({
        collection: 'events',
        id: partyId,
        data: { videosAllowed: true, title: 'mine now', hosts: [admin.id], themeColor: '#000000' },
        overrideAccess: false,
        user: admin,
      })
      const event = await party()
      expect(event.videosAllowed).toBe(true)
      expect(event.title).toBe(`${MARK} party`)
      expect(event.hosts).toEqual([host.id])
      expect(event.themeColor).toBeFalsy()
    })

    it('cannot delete it', async () => {
      await expect(
        payload.delete({ collection: 'events', id: partyId, overrideAccess: false, user: admin }),
      ).rejects.toThrow()
    })
  })

  describe('once greenlit', () => {
    beforeAll(async () => {
      await setVideosAllowed(admin, true)
    })

    it('a guest can add one to the gallery', async () => {
      const video = await uploadVideo(guest, { event: partyId })
      expect(video.mimeType).toBe('video/mp4')
      expect(relId(video.event)).toBe(partyId)
    })

    it('but not to the wall', async () => {
      await expect(uploadVideo(guest, { wallEvent: partyId })).rejects.toThrow()
    })

    it('its poster goes with it', async () => {
      const buffer = await sharp({
        create: { width: 8, height: 8, channels: 3, background: '#000' },
      })
        .jpeg()
        .toBuffer()
      const poster = await payload.create({
        collection: 'media',
        file: { data: buffer, name: 'poster.jpg', mimetype: 'image/jpeg', size: buffer.length },
        data: { alt: MARK, wallEvent: partyId },
        overrideAccess: false,
        user: guest,
      })
      const video = await uploadVideo(guest, { event: partyId, poster: poster.id })
      await payload.delete({
        collection: 'media',
        id: video.id,
        overrideAccess: false,
        user: guest,
      })
      const { totalDocs } = await payload.count({
        collection: 'media',
        where: { id: { equals: poster.id } },
        overrideAccess: true,
      })
      expect(totalDocs).toBe(0)
    })

    it('the admin can switch them off again', async () => {
      await setVideosAllowed(admin, false)
      expect((await party()).videosAllowed).toBe(false)
      await expect(uploadVideo(guest, { event: partyId })).rejects.toThrow()
    })
  })

  it('a media doc still needs a file, unless it is a registered video', async () => {
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: MARK, filename: 'someone-elses.mp4', mimeType: 'video/mp4' },
        overrideAccess: false,
        user: guest,
      }),
    ).rejects.toThrow()
  })
})

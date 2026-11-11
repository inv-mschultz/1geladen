import config from '@payload-config'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getPayload } from 'payload'

import { ownEventsFor } from '@/access'
import { galleryRetiresAt } from '@/lib/time'
import { MAX_VIDEO_BYTES, MAX_VIDEOS_PER_EVENT, VIDEO_PATHNAME, VIDEO_TYPES } from '@/lib/video'

/**
 * Hands the browser a short-lived token to put one video straight into the
 * Blob store (see lib/video). Every check that can fail cheaply happens here,
 * before anything is uploaded; Media's beforeChange repeats them when the file
 * is registered, because that is the one that actually counts.
 */
export async function POST(request: Request): Promise<Response> {
  const token = process.env.MEDIA_READ_WRITE_TOKEN
  if (!token) return Response.json({ error: 'Blob storage is not configured.' }, { status: 404 })

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Not logged in.' }, { status: 401 })

  try {
    const body = (await request.json()) as HandleUploadBody
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!VIDEO_PATHNAME.test(pathname)) throw new Error('Invalid file name.')

        const eventId = Number(JSON.parse(clientPayload ?? '{}').eventId)
        if (!Number.isInteger(eventId)) throw new Error('No party given.')

        const {
          docs: [event],
        } = await payload.find({
          collection: 'events',
          where: { and: [await ownEventsFor(payload, user), { id: { equals: eventId } }] },
          limit: 1,
          depth: 0,
          select: { date: true, endDate: true, galleryRetiredAt: true, videosAllowed: true },
          overrideAccess: true,
        })
        if (!event) throw new Error('Not your party.')
        if (!event.videosAllowed) throw new Error('Videos are not enabled for this party.')
        if (event.galleryRetiredAt || galleryRetiresAt(event).getTime() <= Date.now()) {
          throw new Error('This gallery has been retired.')
        }
        const { totalDocs } = await payload.count({
          collection: 'media',
          where: { and: [{ event: { equals: eventId } }, { mimeType: { like: 'video/' } }] },
          overrideAccess: true,
        })
        if (totalDocs >= MAX_VIDEOS_PER_EVENT) throw new Error('This gallery is full.')

        return {
          allowedContentTypes: [...VIDEO_TYPES],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: false,
          // Matches what the storage plugin sets for photos.
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        }
      },
    })
    return Response.json(result)
  } catch (error) {
    payload.logger.warn({ msg: 'video upload refused', err: error, user: user.id })
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }
}

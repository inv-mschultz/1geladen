/**
 * Gallery videos. Off by default: a platform admin greenlights them per party
 * (events.videosAllowed), because a handful of phone videos outweighs every
 * photo the app has ever stored and Blob storage is what the free tier runs
 * out of first.
 *
 * Videos never pass through a function. Vercel caps a request body at 4.5 MB,
 * so the browser uploads straight to the Blob store with a short-lived token
 * from /video-upload, then registers the finished file (addGalleryVideo).
 * Playback reads the Blob URL directly for the same reason in reverse.
 */

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024

export const MAX_VIDEOS_PER_EVENT = 30

/** What phones record (mp4/mov) plus webm from desktop browsers. */
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const

const EXTENSIONS: Record<(typeof VIDEO_TYPES)[number], string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export const isVideoType = (type: string | null | undefined): boolean =>
  (VIDEO_TYPES as readonly string[]).includes(type ?? '')

export const videoExtension = (type: string): string | null =>
  EXTENSIONS[type as (typeof VIDEO_TYPES)[number]] ?? null

/**
 * Blob names for videos: 128 random bits, like every other upload (see Media's
 * beforeOperation). The browser picks the name, so the upload route only
 * accepts names of exactly this shape — nothing guessable, nothing nested.
 */
export const VIDEO_PATHNAME = /^[0-9a-f]{32}\.(mp4|mov|webm)$/

/** The public Blob store's base URL, derived from the token like the storage plugin does. */
export function blobBaseUrl(): string | null {
  const storeId = process.env.MEDIA_READ_WRITE_TOKEN?.match(
    /^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i,
  )?.[1]
  if (!storeId) return null
  return (
    process.env.STORAGE_VERCEL_BLOB_BASE_URL ||
    `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com`
  )
}

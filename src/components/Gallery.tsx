'use client'

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

import { upload } from '@vercel/blob/client'

import { addGalleryVideo, loadOlderPhotos, uploadPhotos } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { resizeImage } from '@/lib/resizeImage'
import { isVideoType, MAX_VIDEO_BYTES, videoExtension } from '@/lib/video'
import { captureVideoPoster } from '@/lib/videoPoster'
import { useMounted } from '@/lib/useMounted'
import { ArrowLeft, ArrowRight, X } from './icons'

export type GalleryPhoto = {
  id: number
  url: string
  largeUrl: string
  alt: string
  caption?: string | null
  uploaderName?: string | null
  /** Set for videos: where it plays from. `url`/`largeUrl` are then its poster, if any. */
  video?: string
  /** Pagination cursor for loading older photos. */
  createdAt: string
}

function Lightbox({
  photos,
  index,
  onClose,
  onNav,
  dict,
}: {
  photos: GalleryPhoto[]
  index: number
  onClose: () => void
  onNav: (next: number) => void
  dict: Dictionary['gallery']
}) {
  const mounted = useMounted()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onNav(-1)
      else if (e.key === 'ArrowRight') onNav(1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onNav])

  if (!mounted) return null

  const photo = photos[index]
  const label = [photo.caption, photo.uploaderName ? `${dict.by} ${photo.uploaderName}` : null]
    .filter(Boolean)
    .join(' · ')

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="lightbox__close" aria-label={dict.close} onClick={onClose}>
        <X />
      </button>

      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          aria-label={dict.prev}
          onClick={(e) => {
            e.stopPropagation()
            onNav(-1)
          }}
        >
          <ArrowLeft />
        </button>
      )}

      <figure className="lightbox__stage" onClick={(e) => e.stopPropagation()}>
        {photo.video ? (
          <video
            key={photo.id}
            src={photo.video}
            poster={photo.largeUrl || undefined}
            controls
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.largeUrl} alt={photo.alt} />
        )}
        <figcaption className="lightbox__bar">
          <span className="lightbox__meta">
            <span className="lightbox__count">
              {index + 1} / {photos.length}
            </span>
            {label && <span className="lightbox__label">{label}</span>}
          </span>
          <a
            href={photo.video ? downloadUrl(photo.video) : photo.largeUrl}
            download={photo.video ? `1geladen-video-${photo.id}` : `1geladen-foto-${photo.id}.jpg`}
            className="btn btn--small"
            onClick={(e) => e.stopPropagation()}
          >
            {dict.download}
          </a>
        </figcaption>
      </figure>

      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          aria-label={dict.next}
          onClick={(e) => {
            e.stopPropagation()
            onNav(1)
          }}
        >
          <ArrowRight />
        </button>
      )}
    </div>,
    document.body,
  )
}

/** Blob ignores `download` (another origin); it has its own switch for that. */
const downloadUrl = (url: string) => (url.startsWith('https://') ? `${url}?download=1` : url)

/** Some browsers leave `type` empty for .mov; the extension is all there is then. */
const TYPE_BY_EXTENSION: Record<string, string> = {
  mov: 'video/quicktime',
  mp4: 'video/mp4',
  webm: 'video/webm',
}
const videoTypeOf = (file: File): string | null =>
  isVideoType(file.type)
    ? file.type
    : (TYPE_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? null)

const randomName = (ext: string) =>
  `${Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')}.${ext}`

export function Gallery({
  eventId,
  photos,
  hasMore,
  coverImageId,
  unlocked,
  retired = false,
  notice,
  videosAllowed = false,
  directVideoUpload = false,
  dict,
}: {
  eventId: number
  photos: GalleryPhoto[]
  hasMore: boolean
  coverImageId?: number | null
  unlocked: boolean
  /** The photos were deleted 30 days after the party. */
  retired?: boolean
  /** Shown above the grid — e.g. when the photos will go. */
  notice?: string | null
  /** Greenlit by a platform admin for this party (events.videosAllowed). */
  videosAllowed?: boolean
  /** Videos go to Blob from the browser (production); otherwise through the action. */
  directVideoUpload?: boolean
  dict: Dictionary['gallery']
}) {
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<number | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ids of photos whose bitmap has arrived; everything else wears a skeleton.
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set())
  const markLoaded = (id: number) =>
    setLoaded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))

  // Older pages pulled on demand; `photos` stays the server's freshest window.
  const [older, setOlder] = useState<GalleryPhoto[]>([])
  const [moreAvailable, setMoreAvailable] = useState(hasMore)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const allPhotos = useMemo(() => {
    const seen = new Set(photos.map((photo) => photo.id))
    return [...photos, ...older.filter((photo) => !seen.has(photo.id))]
  }, [photos, older])

  const showOlder = () => {
    const oldest = allPhotos[allPhotos.length - 1]
    if (!oldest || loadingOlder) return
    setLoadingOlder(true)
    startTransition(async () => {
      const result = await loadOlderPhotos(eventId, oldest.createdAt, coverImageId)
      setOlder((prev) => [...prev, ...result.photos])
      setMoreAvailable(result.hasMore)
      setLoadingOlder(false)
    })
  }

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || pending) return
    startTransition(async () => {
      setFailed(false)
      // One request per photo. Vercel caps a serverless request body at 4.5 MB
      // and that cap sits in front of the function, so next.config's larger
      // serverActions.bodySizeLimit cannot lift it — batching a phone's worth of
      // photos into a single FormData just gets the whole upload rejected.
      let anyFailed = false
      for (const file of Array.from(files)) {
        try {
          const videoType = videoTypeOf(file)
          if (videoType) {
            await uploadVideo(file, videoType)
            continue
          }
          const formData = new FormData()
          formData.append('photos', await resizeImage(file))
          await uploadPhotos(eventId, formData)
        } catch {
          anyFailed = true // keep going: one oversized photo shouldn't sink the rest
        } finally {
          setProgress(null)
        }
      }
      setFailed(anyFailed)
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  // Videos skip the function body limit by going to Blob first (see lib/video).
  const uploadVideo = async (file: File, type: string) => {
    if (!videosAllowed || file.size > MAX_VIDEO_BYTES) throw new Error('video refused')
    const formData = new FormData()
    const poster = await captureVideoPoster(file)
    if (poster) formData.append('poster', poster)

    if (directVideoUpload) {
      setProgress(0)
      const blob = await upload(randomName(videoExtension(type) ?? 'mp4'), file, {
        access: 'public',
        handleUploadUrl: '/video-upload',
        clientPayload: JSON.stringify({ eventId }),
        contentType: type,
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      })
      formData.append('pathname', blob.pathname)
    } else {
      formData.append('video', new File([file], file.name, { type }))
    }
    await addGalleryVideo(eventId, formData)
  }

  // Wrap-around navigation
  const nav = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + allPhotos.length) % allPhotos.length))

  if (retired) {
    return (
      <div className="gallery gallery--locked">
        <p>{dict.retired}</p>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="gallery gallery--locked">
        <p>{dict.locked}</p>
      </div>
    )
  }

  return (
    <div className="gallery">
      <div className="gallery__upload">
        <input
          ref={inputRef}
          type="file"
          accept={videosAllowed ? 'image/*,video/*' : 'image/*'}
          multiple
          id="photo-upload"
          className="gallery__input"
          onChange={(e) => onFiles(e.target.files)}
          disabled={pending}
        />
        <label htmlFor="photo-upload" className={`btn ${pending ? 'is-disabled' : ''}`}>
          {pending
            ? progress === null
              ? dict.uploading
              : `${dict.uploading} ${progress} %`
            : videosAllowed
              ? dict.uploadWithVideos
              : dict.upload}
        </label>
      </div>

      {videosAllowed && (
        <p className="gallery__notice">
          {dict.videoHint.replace('{mb}', String(MAX_VIDEO_BYTES / 1024 / 1024))}
        </p>
      )}

      {notice && <p className="gallery__notice">{notice}</p>}

      {failed && (
        <p className="gallery__error" role="alert">
          {dict.uploadFailed}
        </p>
      )}

      {allPhotos.length === 0 ? (
        <p className="section__empty">{dict.empty}</p>
      ) : (
        <ul className="gallery__grid">
          {allPhotos.map((photo, index) => (
            <li
              key={photo.id}
              className={`gallery__photo ${loaded.has(photo.id) ? '' : 'is-loading'}`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={photo.video ? dict.play : photo.alt || dict.title}
              >
                {photo.video && <span className="gallery__play" />}
                {photo.video && !photo.url ? (
                  // No poster (the browser couldn't decode it at upload): let
                  // the video show its own first frame instead.
                  <video
                    src={`${photo.video}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    onLoadedData={() => markLoaded(photo.id)}
                    onError={() => markLoaded(photo.id)}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    loading="lazy"
                    // A cached image can already be complete before React attaches
                    // onLoad, which would strand the skeleton on top of it forever.
                    ref={(el) => {
                      if (el?.complete) markLoaded(photo.id)
                    }}
                    onLoad={() => markLoaded(photo.id)}
                    // A broken photo should show itself as broken, not shimmer for ever.
                    onError={() => markLoaded(photo.id)}
                  />
                )}
              </button>
              {(photo.caption || photo.uploaderName) && (
                <span className="gallery__caption">{photo.caption || photo.uploaderName}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {moreAvailable && (
        <div className="load-more">
          <button
            type="button"
            className={`btn btn--ghost btn--small ${loadingOlder ? 'is-loading' : ''}`}
            disabled={loadingOlder}
            aria-busy={loadingOlder}
            onClick={showOlder}
          >
            <span className="btn__label">{dict.loadOlder}</span>
          </button>
        </div>
      )}

      {openIndex !== null && (
        <Lightbox
          photos={allPhotos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNav={nav}
          dict={dict}
        />
      )}
    </div>
  )
}

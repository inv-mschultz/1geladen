'use client'

import React, { useRef, useTransition } from 'react'

import { uploadPhotos } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'

export type GalleryPhoto = {
  id: number
  url: string
  alt: string
  caption?: string | null
  uploaderName?: string | null
}

export function Gallery({
  eventId,
  photos,
  unlocked,
  dict,
}: {
  eventId: number
  photos: GalleryPhoto[]
  unlocked: boolean
  dict: Dictionary['gallery']
}) {
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || pending) return
    const formData = new FormData()
    Array.from(files).forEach((file) => formData.append('photos', file))
    startTransition(async () => {
      await uploadPhotos(eventId, formData)
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  if (!unlocked) {
    return (
      <div className="gallery gallery--locked">
        <span className="gallery__lock" aria-hidden>
          🔒
        </span>
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
          accept="image/*"
          multiple
          id="photo-upload"
          className="gallery__input"
          onChange={(e) => onFiles(e.target.files)}
          disabled={pending}
        />
        <label htmlFor="photo-upload" className={`btn ${pending ? 'is-disabled' : ''}`}>
          {pending ? dict.uploading : `📸 ${dict.upload}`}
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="section__empty">{dict.empty}</p>
      ) : (
        <ul className="gallery__grid">
          {photos.map((photo, index) => (
            <li key={photo.id} className="gallery__photo" style={{ ['--tilt' as string]: `${((index % 5) - 2) * 1.4}deg` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} loading="lazy" />
              {(photo.caption || photo.uploaderName) && (
                <span className="gallery__caption">{photo.caption || photo.uploaderName}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

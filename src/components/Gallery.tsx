'use client'

import React, { useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

import { uploadPhotos } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { ArrowLeft, ArrowRight, X } from './icons'

export type GalleryPhoto = {
  id: number
  url: string
  largeUrl: string
  alt: string
  caption?: string | null
  uploaderName?: string | null
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
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.largeUrl} alt={photo.alt} />
        <figcaption className="lightbox__bar">
          <span className="lightbox__meta">
            <span className="lightbox__count">
              {index + 1} / {photos.length}
            </span>
            {label && <span className="lightbox__label">{label}</span>}
          </span>
          <a
            href={photo.largeUrl}
            download={`1geladen-foto-${photo.id}.jpg`}
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
  const [openIndex, setOpenIndex] = useState<number | null>(null)
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

  // Wrap-around navigation
  const nav = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length))

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
          accept="image/*"
          multiple
          id="photo-upload"
          className="gallery__input"
          onChange={(e) => onFiles(e.target.files)}
          disabled={pending}
        />
        <label htmlFor="photo-upload" className={`btn ${pending ? 'is-disabled' : ''}`}>
          {pending ? dict.uploading : dict.upload}
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="section__empty">{dict.empty}</p>
      ) : (
        <ul className="gallery__grid">
          {photos.map((photo, index) => (
            <li key={photo.id} className="gallery__photo">
              <button type="button" onClick={() => setOpenIndex(index)} aria-label={photo.alt || dict.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.alt} loading="lazy" />
              </button>
              {(photo.caption || photo.uploaderName) && (
                <span className="gallery__caption">{photo.caption || photo.uploaderName}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNav={nav}
          dict={dict}
        />
      )}
    </div>
  )
}

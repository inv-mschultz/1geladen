'use client'

import React, { useEffect, useState } from 'react'

import type { Dictionary } from '@/i18n/dictionaries'
import { X } from './icons'

// Register a free production key at developers.giphy.com; the fallback is
// GIPHY's public beta key (rate-limited, dev only).
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'

type Gif = {
  id: string
  url: string
  preview: string
  alt: string
}

type GiphyImage = { url: string }
type GiphyItem = {
  id: string
  title?: string
  images: { fixed_height: GiphyImage; fixed_height_small?: GiphyImage }
}

export function GifPicker({
  onPick,
  onClose,
  dict,
}: {
  onPick: (url: string, alt: string) => void
  onClose: () => void
  dict: Dictionary['wall']
}) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<Gif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const endpoint = query.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=12&rating=g`
        const res = await fetch(endpoint, { signal: controller.signal })
        const json = (await res.json()) as { data?: GiphyItem[] }
        setGifs(
          (json.data ?? []).map((item) => ({
            id: item.id,
            url: item.images.fixed_height.url,
            preview: item.images.fixed_height_small?.url ?? item.images.fixed_height.url,
            alt: item.title || 'GIF',
          })),
        )
      } catch {
        // aborted or offline — keep whatever we had
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  return (
    <div className="gif-picker">
      <div className="gif-picker__head">
        <input
          type="text"
          className="input input--small"
          placeholder={dict.gifSearch}
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="btn btn--icon" aria-label="Close" onClick={onClose}>
          <X />
        </button>
      </div>

      {!loading && gifs.length === 0 ? (
        <p className="gif-picker__empty">{dict.gifEmpty}</p>
      ) : (
        <ul className="gif-picker__grid">
          {gifs.map((gif) => (
            <li key={gif.id}>
              <button type="button" onClick={() => onPick(gif.url, gif.alt)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.preview} alt={gif.alt} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="gif-picker__footer">{dict.gifBy}</p>
    </div>
  )
}

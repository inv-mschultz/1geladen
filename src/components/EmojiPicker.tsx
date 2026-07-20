'use client'

import React, { useMemo, useState } from 'react'

import type { Dictionary } from '@/i18n/dictionaries'
import { EMOJI_GROUPS, searchEmoji } from '@/lib/emoji'
import { X } from './icons'

/**
 * Emoji picker for the wall composers and the reaction bar. Deliberately
 * dependency-free: the usual libraries ship a megabyte of data and expect a
 * CDN, while a party wall needs a few hundred well-chosen emoji at most.
 */
export function EmojiPicker({
  onPick,
  onClose,
  dict,
}: {
  onPick: (emoji: string) => void
  onClose: () => void
  dict: Dictionary['wall']
}) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const results = useMemo(() => (trimmed ? searchEmoji(trimmed) : null), [trimmed])

  return (
    <div className="emoji-picker">
      <div className="emoji-picker__head">
        <input
          type="text"
          className="input input--small"
          placeholder={dict.emojiSearch}
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="btn btn--icon" aria-label={dict.close} onClick={onClose}>
          <X />
        </button>
      </div>

      <div className="emoji-picker__body">
        {results ? (
          results.length === 0 ? (
            <p className="emoji-picker__empty">{dict.emojiEmpty}</p>
          ) : (
            <ul className="emoji-picker__grid">
              {results.map((entry) => (
                <li key={entry.char}>
                  <button
                    type="button"
                    title={entry.name}
                    aria-label={entry.name}
                    onClick={() => onPick(entry.char)}
                  >
                    {entry.char}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          EMOJI_GROUPS.map((group) => (
            <section key={group.id} className="emoji-picker__group">
              <h4 className="emoji-picker__group-title">{dict.emojiGroups[group.id]}</h4>
              <ul className="emoji-picker__grid">
                {group.emoji.map((entry) => (
                  <li key={entry.char}>
                    <button
                      type="button"
                      title={entry.name}
                      aria-label={entry.name}
                      onClick={() => onPick(entry.char)}
                    >
                      {entry.char}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

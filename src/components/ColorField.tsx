'use client'

import React, { useEffect, useRef, useState } from 'react'

// Curated party palette — vivid tones that all survive the OKLCH theme engine
const SWATCHES = [
  '#4ce6a5',
  '#2ec4b6',
  '#4cc9f0',
  '#3a86ff',
  '#7b6cff',
  '#c77dff',
  '#ff8ad4',
  '#ff5d8f',
  '#ff7b54',
  '#ffb703',
  '#ffd166',
  '#e63946',
]

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * Flat swatch-based color picker (replaces the native color input): a chip
 * showing the current color opens a panel with the palette plus a hex field.
 */
export function ColorField({
  label,
  name,
  value,
  customLabel,
  onChange,
}: {
  label: string
  name: string
  value: string
  customLabel: string
  onChange: (hex: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setHexDraft(value), [value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const pick = (hex: string) => {
    onChange(hex.toLowerCase())
    setOpen(false)
  }

  return (
    <div className="field color-field" ref={ref}>
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className="color-field__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="color-field__dot" style={{ background: value }} aria-hidden />
        <span className="color-field__hex">{value}</span>
      </button>

      {open && (
        <div className="color-field__panel">
          <div className="color-field__swatches" role="listbox" aria-label={label}>
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                role="option"
                aria-selected={hex === value.toLowerCase()}
                className={`color-field__swatch ${hex === value.toLowerCase() ? 'is-selected' : ''}`}
                style={{ background: hex }}
                title={hex}
                onClick={() => pick(hex)}
              />
            ))}
          </div>
          <label className="color-field__custom">
            <span>{customLabel}</span>
            <input
              type="text"
              className="input"
              value={hexDraft}
              maxLength={7}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                const raw = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                setHexDraft(raw)
                if (HEX.test(raw)) onChange(raw.toLowerCase())
              }}
            />
          </label>
        </div>
      )}
    </div>
  )
}

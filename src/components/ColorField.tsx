'use client'

import React, { useEffect, useRef, useState } from 'react'

// Quick choices — vivid tones that all survive the OKLCH theme engine
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

const clamp = (n: number) => Math.min(1, Math.max(0, n))

type Hsv = { h: number; s: number; v: number }

function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = (h * 60 + 360) % 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(5)}${f(3)}${f(1)}`
}

/**
 * Flat color picker (replaces the native input): a chip showing the current
 * color opens a panel with a full saturation/brightness area, a hue slider,
 * quick-choice swatches, and a hex field.
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
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const ref = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)

  // Keep internal state in sync when the value changes from outside;
  // don't reset hue/saturation for the same color (grays lose hue info).
  useEffect(() => {
    setHexDraft(value)
    setHsv((current) => (hsvToHex(current) === value.toLowerCase() ? current : hexToHsv(value)))
  }, [value])

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

  const apply = (next: Hsv) => {
    setHsv(next)
    onChange(hsvToHex(next))
  }

  const pickFromArea = (e: React.PointerEvent) => {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    apply({
      h: hsv.h,
      s: clamp((e.clientX - rect.left) / rect.width),
      v: 1 - clamp((e.clientY - rect.top) / rect.height),
    })
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
          <div
            ref={areaRef}
            className="color-field__area"
            style={{
              background: `linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              pickFromArea(e)
            }}
            onPointerMove={(e) => {
              if (e.buttons & 1) pickFromArea(e)
            }}
          >
            <span
              className="color-field__cursor"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }}
            />
          </div>

          <input
            type="range"
            className="color-field__hue"
            min={0}
            max={360}
            value={Math.round(hsv.h)}
            aria-label="Hue"
            onChange={(e) => apply({ ...hsv, h: Number(e.target.value) })}
          />

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
                onClick={() => {
                  onChange(hex)
                  setOpen(false)
                }}
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
              data-1p-ignore=""
              data-lpignore="true"
              data-bwignore=""
              data-form-type="other"
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

/**
 * Single-color design token engine.
 *
 * Give it one vivid color and it derives the whole monochrome system in
 * OKLCH: the page background (the color itself), a deep dark surface in the
 * same hue, bright text-on-dark, a mid "texture" tone, muted text, and
 * hairlines. Platform and events each get their own base color.
 */

export const PLATFORM_COLOR = '#a8f25a'
export const DEFAULT_EVENT_COLOR = PLATFORM_COLOR

type Oklch = { l: number; c: number; h: number }

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toLinear = (channel: number) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

const fromLinear = (channel: number) => {
  const c = clamp(channel)
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

function rgbToOklch([r8, g8, b8]: [number, number, number]): Oklch {
  const r = toLinear(r8)
  const g = toLinear(g8)
  const b = toLinear(b8)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  return {
    l: L,
    c: Math.sqrt(a * a + bb * bb),
    h: (Math.atan2(bb, a) * 180) / Math.PI,
  }
}

function oklchToRgb({ l: L, c, h }: Oklch): [number, number, number] | null {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const bb = c * Math.sin(rad)

  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * bb, 3)
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * bb, 3)
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * bb, 3)

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  if (r < -0.001 || r > 1.001 || g < -0.001 || g > 1.001 || b < -0.001 || b > 1.001) return null
  return [Math.round(fromLinear(r) * 255), Math.round(fromLinear(g) * 255), Math.round(fromLinear(b) * 255)]
}

/** Renders an OKLCH color as hex, reducing chroma until it fits sRGB. */
function css(color: Oklch): string {
  let { c } = color
  for (let i = 0; i < 24; i++) {
    const rgb = oklchToRgb({ ...color, c })
    if (rgb) {
      return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
    }
    c = Math.max(0, c - 0.01)
  }
  return '#000000'
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

export type ThemeTokens = Record<string, string>

/** One color in, the whole system out. */
export function themeTokens(baseHex: string): ThemeTokens {
  const rgb = hexToRgb(baseHex) ?? hexToRgb(PLATFORM_COLOR)!
  const base = rgbToOklch(rgb)
  const { h } = base
  const chroma = Math.min(base.c, 0.23)

  // The page background is the color itself, nudged into a readable range
  const bg = css({ l: clamp(base.l, 0.62, 0.92), c: chroma, h })
  // Bright: the same color, guaranteed light enough to sit on the dark surface
  const bright = css({ l: Math.max(clamp(base.l, 0.62, 0.92), 0.78), c: chroma, h })
  // Ink doubles as text-on-light and the big dark card surface
  const ink = css({ l: 0.28, c: Math.min(chroma * 0.55, 0.09), h })
  const surface = ink
  const surface2 = css({ l: 0.345, c: Math.min(chroma * 0.5, 0.08), h })
  // Mid tone: the oversized "texture type" shade from the reference boards
  const mid = css({ l: 0.5, c: Math.min(chroma * 0.75, 0.13), h })
  const muted = css({ l: 0.68, c: Math.min(chroma * 0.35, 0.06), h })

  return {
    '--c-bg': bg,
    '--c-bright': bright,
    '--c-ink': ink,
    '--c-surface': surface,
    '--c-surface-2': surface2,
    '--c-mid': mid,
    '--c-muted': muted,
    '--c-line': withAlpha(bright, 0.22),
    '--c-line-strong': withAlpha(bright, 0.45),
    '--c-line-on-bg': withAlpha(ink, 0.25),
  }
}

/** Inline-style object for React `style` props. */
export const themeStyle = (baseHex: string) => themeTokens(baseHex) as import('react').CSSProperties

/** CSS text that re-themes the whole page (rendered in a <style> tag). */
export function themeCss(baseHex: string): string {
  const tokens = themeTokens(baseHex)
  const body = Object.entries(tokens)
    .map(([key, value]) => `${key}:${value}`)
    .join(';')
  return `:root{${body}}`
}

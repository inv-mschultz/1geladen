'use client'

import React, { useEffect, useRef } from 'react'

/** Pink and green tones from the brand, plus a little white. */
const PALETTE = ['#ff8ad4', '#ffb3e3', '#c95ea3', '#4ce6a5', '#8affd0', '#2e7d58', '#e4fbef']
const SPACING = 18 // CSS pixels between grid points
const DOT = 2 // CSS pixels: tiny squares, the brand's pixel look
const FRAME_MS = 50 // twinkling doesn't need 60 fps

type Dot = { x: number; y: number; color: string; base: number; phase: number; speed: number }

/**
 * A fine grid of tiny coloured dots on a canvas. Most grid points stay
 * empty; the rest get a random tone and strength from a seeded random, so
 * the pattern is the same on every visit. CSS decides where it shows.
 *
 * With `twinkle`, dots light up one by one at random and fade again —
 * drawn only while the canvas is on screen, and never with reduced motion.
 */
export function DotField({
  twinkle = false,
  fromY = 0,
  className,
}: {
  twinkle?: boolean
  /** Leave the top of the canvas empty: dots start this far down (0–1). */
  fromY?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let dots: Dot[] = []
    let width = 0
    let height = 0

    const layout = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      let seed = 42
      const random = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      dots = []
      for (let y = SPACING / 2 + Math.floor((height * fromY) / SPACING) * SPACING; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          if (random() < 0.55) continue
          dots.push({
            x: Math.round(x),
            y: Math.round(y),
            color: PALETTE[Math.floor(random() * PALETTE.length)],
            base: 0.12 + random() * 0.5,
            phase: random() * Math.PI * 2,
            speed: 0.3 + random() * 0.9,
          })
        }
      }
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      for (const dot of dots) {
        // Mostly at rest; now and then a dot flares up and fades again.
        const flare = twinkle ? Math.pow(Math.max(0, Math.sin(t * dot.speed + dot.phase)), 24) : 0
        ctx.globalAlpha = Math.min(1, dot.base * (twinkle ? 0.55 : 1) + flare)
        ctx.fillStyle = dot.color
        const size = DOT + (flare > 0.5 ? 1 : 0)
        ctx.fillRect(dot.x, dot.y, size, size)
      }
    }

    layout()
    draw(0)

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = 0
    let visible = false
    const loop = (now: number) => {
      frame = 0
      if (!visible) return
      if (now - last >= FRAME_MS) {
        last = now
        draw(now / 1000)
      }
      frame = requestAnimationFrame(loop)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && twinkle && !still && !frame) frame = requestAnimationFrame(loop)
    })
    if (twinkle) observer.observe(canvas)

    const resize = new ResizeObserver(() => {
      layout()
      draw(performance.now() / 1000)
    })
    resize.observe(canvas)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      resize.disconnect()
    }
  }, [twinkle, fromY])

  return <canvas ref={ref} className={className} aria-hidden />
}

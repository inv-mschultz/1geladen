'use client'

import React, { useEffect, useRef } from 'react'

import type { SceneModule } from './three/types'

const loaders: Record<'invite' | 'disco', () => Promise<SceneModule>> = {
  invite: () => import('./three/invite'),
  disco: () => import('./three/disco'),
}

/**
 * Hosts one three.js scene in a chapter's stage.
 *
 * The scene is optional decoration over a CSS version that already works:
 * three.js loads only when the chapter is about to scroll in, and only if
 * the visitor hasn't asked for reduced motion and the device has WebGL. Once
 * it is running the chapter gets `data-three`, which hides the CSS version.
 *
 * Each frame the scene reads the chapter's `--p` (written by StoryScroll)
 * and the pointer position; offscreen it doesn't render at all.
 */
export function SceneCanvas({ scene, text }: { scene: 'invite' | 'disco'; text?: Record<string, string> }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const chapter = canvas?.closest<HTMLElement>('.story__chapter')
    if (!canvas || !chapter) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let disposed = false
    let started = false
    let visible = false
    let frame = 0
    let instance: Awaited<ReturnType<SceneModule['create']>> | null = null
    const pointer = { x: 0, y: 0 }

    const loop = (now: number) => {
      frame = 0
      if (!instance || !visible) return
      const p = parseFloat(chapter.style.getPropertyValue('--p')) || 0
      instance.render(p, now / 1000, pointer)
      frame = requestAnimationFrame(loop)
    }

    const start = async () => {
      started = true
      try {
        const mod = await loaders[scene]()
        if (disposed) return
        const created = await mod.create(canvas, text ?? {})
        if (disposed) {
          created.dispose()
          return
        }
        instance = created
        chapter.dataset.three = ''
        resize()
        if (visible) frame = requestAnimationFrame(loop)
      } catch (err) {
        // No WebGL, or the chunk failed to load: the CSS scene stays.
        console.warn('[story] 3D scene unavailable', err)
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      instance?.resize(rect.width, rect.height)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible && !started) void start()
        if (visible && instance && !frame) frame = requestAnimationFrame(loop)
      },
      { rootMargin: '50% 0px' },
    )
    observer.observe(chapter)

    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('resize', resize)

    return () => {
      disposed = true
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', resize)
      instance?.dispose()
      delete chapter.dataset.three
    }
  }, [scene, text])

  return <canvas ref={ref} className="story-three" aria-hidden />
}

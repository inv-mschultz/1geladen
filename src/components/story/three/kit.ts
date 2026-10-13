import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Shared bits for the story's three.js scenes. */

export const PINK = '#ff8ad4'
export const GREEN = '#4ce6a5'
export const DARK = '#0d1f17'

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Progress of `p` through the window [from, to], clamped to 0–1. */
export const span = (p: number, from: number, to: number) => clamp01((p - from) / (to - from))

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
/** Ease-out with a little overshoot, for things that swing. */
export const easeOutBack = (x: number) => {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** Glyph rows of the logo mark, 5×5: the sparkle with its extra pixel at the top left. */
export const SPARKLE = ['10100', '01110', '11111', '01110', '00100']
/** 3×5 pixel "1", for the house number. */
export const ONE = ['010', '110', '010', '010', '111']

/**
 * Builds a pixel glyph from little boxes — the brand's pixel look, but with
 * depth. Returns one merged-looking group centred on the origin.
 */
export function pixelGlyph(rows: string[], cell: number, depth: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(cell, cell, depth)
  const h = rows.length
  const w = rows[0].length
  rows.forEach((row, y) =>
    row.split('').forEach((on, x) => {
      if (on !== '1') return
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set((x - (w - 1) / 2) * cell, ((h - 1) / 2 - y) * cell, depth / 2)
      mesh.castShadow = true
      group.add(mesh)
    }),
  )
  return group
}

/**
 * Sets the canvas size within a pixel budget: full device resolution on a
 * laptop or phone, but a full-screen canvas at 2× on a big monitor (~10+
 * megapixels per frame) gets scaled down a little.
 */
export function sizeRenderer(renderer: THREE.WebGLRenderer, width: number, height: number, budget = 6_000_000) {
  const ratio = Math.min(window.devicePixelRatio, 2, Math.sqrt(budget / (width * height)))
  renderer.setPixelRatio(Math.max(0.75, ratio))
  renderer.setSize(width, height, false)
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Neutral keeps the brand pink pink; ACES would push it towards salmon.
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x000000, 0)
  return renderer
}

/** A soft studio environment for reflections, generated — no HDR file to download. */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  return texture
}

/** Fine grain for paper and plaster, as a bump map. */
export function noiseTexture(size = 256, strength = 40): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * strength
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v
    image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

/** A canvas texture drawn by `draw`, in sRGB. */
export function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  /** Draws at this multiple of the given size, for sharp text up close. */
  scale = 2,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  draw(ctx, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** The page's own font (next/font gives it a generated family name). */
export const pageFont = () => getComputedStyle(document.body).fontFamily || 'sans-serif'

/** Draws the pixel sparkle on a 2D canvas. */
export function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, color: string) {
  ctx.fillStyle = color
  SPARKLE.forEach((row, y) =>
    row.split('').forEach((on, x) => {
      if (on === '1') ctx.fillRect(cx + (x - 2.5) * cell, cy + (y - 2.5) * cell, cell, cell)
    }),
  )
}

/** Frees every geometry, material and texture under `root`. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose()
      })
      material.dispose()
    })
  })
}

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import {
  canvasTexture,
  createRenderer,
  DARK,
  disposeTree,
  drawSparkle,
  easeInOut,
  GREEN,
  pageFont,
  PINK,
  sizeRenderer,
  span,
  studioEnvironment,
} from './kit'
import type { SceneInstance } from './types'

/**
 * 18:00 — the invitation, as a paper envelope.
 *
 * Over the chapter's scroll: the flap folds open (seal and all), the card
 * slides out as far as it can while the envelope fades away, and the card turns into
 * the page's own card — which starts exactly over the 3D one and grows into
 * place, so its buttons are real buttons.
 *
 * The model comes from Blender (blender/envelope.py → public/story/envelope.glb);
 * this file textures, lights and plays it. The envelope is 3 × 2 units,
 * centred on the origin, facing +z.
 */

const W = 3

function cardTexture(text: Record<string, string>) {
  const font = pageFont()
  return canvasTexture(1380, 920, (ctx, w, h) => {
    ctx.fillStyle = '#10291d'
    ctx.fillRect(0, 0, w, h)

    // Kicker sticker
    const kicker = (text.kicker ?? '').toUpperCase()
    ctx.font = `900 30px ${font}`
    const kw = ctx.measureText(kicker).width + kicker.length * 4 + 56
    ctx.fillStyle = PINK
    ctx.beginPath()
    ctx.roundRect((w - kw) / 2, 120, kw, 64, 14)
    ctx.fill()
    ctx.fillStyle = '#33101f'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = '4px'
    ctx.fillText(kicker, w / 2, 153)

    // Title, wrapped
    ctx.letterSpacing = '0px'
    ctx.font = `800 96px ${font}`
    const words = (text.title ?? '').toUpperCase().split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width > w - 200 && line) {
        lines.push(line)
        line = word
      } else line = next
    }
    if (line) lines.push(line)
    ctx.fillStyle = GREEN
    lines.forEach((l, i) => ctx.fillText(l, w / 2, 290 + i * 100))

    ctx.strokeStyle = GREEN
    ctx.lineWidth = 3
    ctx.strokeText((text.titleAccent ?? '').toUpperCase(), w / 2, 290 + lines.length * 100)

    drawSparkle(ctx, w - 110, 110, 10, PINK)
  })
}

/** A fun stamp: a party face on a pink-to-mint field, white perforated border. */
function stampTexture() {
  const font = pageFont()
  return canvasTexture(256, 320, (ctx, w, h) => {
    // Perforated edge: a white field with bites taken out along the border.
    ctx.fillStyle = '#fffaf2'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-out'
    for (let x = 6; x <= w; x += 20) {
      ctx.beginPath()
      ctx.arc(x, 0, 6.5, 0, Math.PI * 2)
      ctx.arc(x, h, 6.5, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let y = 6; y <= h; y += 20) {
      ctx.beginPath()
      ctx.arc(0, y, 6.5, 0, Math.PI * 2)
      ctx.arc(w, y, 6.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'

    const field = ctx.createLinearGradient(0, 20, 0, h - 20)
    field.addColorStop(0, '#ffb3e3')
    field.addColorStop(1, '#8affd0')
    ctx.fillStyle = field
    ctx.fillRect(20, 20, w - 40, h - 40)

    // Sunburst behind the emoji.
    ctx.save()
    ctx.translate(w / 2, h / 2 - 20)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-14, -140)
      ctx.lineTo(14, -140)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    ctx.font = '128px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🥳', w / 2, h / 2 - 16)

    ctx.fillStyle = DARK
    ctx.font = `900 34px ${font}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('0 €', w - 36, 62)
    ctx.textAlign = 'center'
    ctx.font = `900 21px ${font}`
    ctx.letterSpacing = '4px'
    ctx.fillText('PARTYPOST', w / 2 + 2, h - 40)
  })
}

/**
 * Paper fibre as a bump map: thousands of faint short strokes in every
 * direction over fine grain. Raking light picks it up as a paper surface.
 */
function fibreTexture() {
  const texture = canvasTexture(
    1024,
    1024,
    (ctx, w, h) => {
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, w, h)
      let seed = 9
      const random = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      const grain = ctx.getImageData(0, 0, w, h)
      for (let i = 0; i < grain.data.length; i += 4) {
        const v = 128 + (random() - 0.5) * 26
        grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = v
      }
      ctx.putImageData(grain, 0, 0)
      ctx.lineCap = 'round'
      for (let i = 0; i < 5000; i++) {
        const x = random() * w
        const y = random() * h
        const a = random() * Math.PI * 2
        const l = 6 + random() * 26
        ctx.strokeStyle = random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
        ctx.lineWidth = 0.6 + random() * 1.2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l)
        ctx.stroke()
      }
    },
    1,
  )
  texture.colorSpace = THREE.NoColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.5, 2.5)
  return texture
}

function addressTexture(text: Record<string, string>) {
  const font = pageFont()
  return canvasTexture(640, 200, (ctx) => {
    ctx.fillStyle = '#5a1a40'
    ctx.letterSpacing = '6px'
    ctx.font = `900 54px ${font}`
    ctx.fillText((text.to ?? '').toUpperCase(), 8, 80)
    ctx.globalAlpha = 0.65
    ctx.font = `800 34px ${font}`
    ctx.fillText((text.from ?? '').toUpperCase(), 8, 150)
  })
}

export async function create(canvas: HTMLCanvasElement, text: Record<string, string>): Promise<SceneInstance> {
  const gltf = await new GLTFLoader().loadAsync('/story/envelope.glb')
  const renderer = createRenderer(canvas)
  const scene = new THREE.Scene()
  const environment = studioEnvironment(renderer)
  scene.environment = environment
  // The studio environment is the soft, all-round light; the key only adds
  // gentle direction and the shadows.
  scene.environmentIntensity = 0.75

  // Variance shadows blur properly: soft, wide penumbras like real
  // paper-on-paper shadows, instead of hard or clipped edges.
  renderer.shadowMap.type = THREE.VSMShadowMap
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100)

  // --- light -------------------------------------------------------------------------
  scene.add(new THREE.HemisphereLight('#ffe3f3', DARK, 0.3))
  const key = new THREE.DirectionalLight('#fff2e6', 1.7)
  // High and a little to the side: enough angle for the bulge and fibre to
  // show, short shadows that fall down and to the right.
  key.position.set(-2.4, 4, 7)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = key.shadow.camera.bottom = -3.5
  key.shadow.camera.right = key.shadow.camera.top = 3.5
  key.shadow.camera.near = 1
  key.shadow.camera.far = 16
  key.shadow.radius = 14
  key.shadow.blurSamples = 24
  key.shadow.bias = -0.0002
  scene.add(key)
  const rim = new THREE.PointLight(PINK, 30)
  rim.position.set(2.6, 1.8, -2)
  scene.add(rim)
  const fill = new THREE.PointLight(GREEN, 6)
  fill.position.set(-3, -2, 3)
  scene.add(fill)

  // An invisible wall behind the envelope that only shows shadows, so the
  // envelope seems to hover just in front of the page.
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }))
  catcher.position.z = -0.6
  catcher.receiveShadow = true
  scene.add(catcher)

  // --- the model -----------------------------------------------------------------------------
  const root = new THREE.Group() // sways with the pointer
  root.add(gltf.scene)
  scene.add(root)

  const byName = (name: string) => {
    const found = gltf.scene.getObjectByName(name)
    if (!found) throw new Error(`envelope.glb has no "${name}"`)
    return found
  }
  const envelope = byName('Envelope')
  const flap = byName('Flap')
  const seal = byName('Seal')
  const card = byName('Card')
  const flapRest = flap.position.clone()
  const cardRest = card.position.clone()

  // Canvas textures go onto the materials Blender named for them. glTF UVs
  // start top-left, so these textures must not be flipped.
  const bump = fibreTexture()
  const textures: Record<string, THREE.Texture> = {
    CardFace: cardTexture(text),
    Stamp: stampTexture(),
    Address: addressTexture(text),
  }
  Object.values(textures).forEach((texture) => (texture.flipY = false))
  // Everything that belongs to the envelope (not the card), for the fade-out.
  const envelopeMaterials = new Set<THREE.MeshStandardMaterial>()
  envelope.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
    if (material) envelopeMaterials.add(material)
  })

  const alwaysTransparent = new Set<THREE.Material>()
  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const material = mesh.material as THREE.MeshStandardMaterial
    const texture = textures[material.name]
    if (texture) {
      material.map = texture
      material.color.set('#ffffff')
    }
    // The card is printed matter: let its colours read as printed, not as lit grey.
    if (material.name === 'CardFace') {
      // Mostly self-lit so it matches the page's card colour, with enough
      // lit colour left for the pocket's shadow to show on it.
      material.emissive.set('#ffffff')
      material.emissiveMap = texture
      material.emissiveIntensity = 0.92
      material.color.set('#161616')
      material.envMapIntensity = 0
      material.roughness = 1 // no sheen: printed matte card
    }
    if (material.name === 'Stamp' || material.name === 'Address') {
      material.transparent = true
      // No depth writes: their clear parts must not punch holes in the
      // pocket behind them while it fades.
      material.depthWrite = false
      alwaysTransparent.add(material)
      material.side = THREE.DoubleSide
      mesh.castShadow = false
    }
    if (material.name.startsWith('Paper') || material.name === 'Inner') {
      material.bumpMap = bump
      material.bumpScale = 1.4
      material.roughnessMap = bump
    }
  })

  // --- layout -----------------------------------------------------------------------------
  let width = 1
  let height = 1
  const resize = (w: number, h: number) => {
    width = Math.max(1, w)
    height = Math.max(1, h)
    sizeRenderer(renderer, width, height)
    camera.aspect = width / height

    // Same size and spot as the CSS envelope box, so the HTML card that
    // takes over at the end lands where the 3D one was.
    const box = canvas.parentElement?.querySelector('.story-invite__envelope')?.getBoundingClientRect()
    const own = canvas.getBoundingClientRect()
    const envPx = box?.width || Math.min(540, width * 0.84)
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    camera.position.set(0, 0, (W * height) / (envPx * 2 * tan))
    const cx = box ? box.left + box.width / 2 - own.left : width / 2
    const cy = box ? box.top + box.height / 2 - own.top : height / 2
    camera.setViewOffset(width, height, width / 2 - cx, height / 2 - cy, width, height)
    camera.updateProjectionMatrix()
  }

  // --- animation ----------------------------------------------------------------------------
  const sway = { x: 0, y: 0 }

  // The HTML card that takes over, and the 3D card's corners for measuring
  // where it is on screen.
  const chapter = canvas.closest<HTMLElement>('.story__chapter')
  const htmlCard = chapter?.querySelector<HTMLElement>('.story-invite__card') ?? null
  const cardMaterials = new Set<THREE.MeshStandardMaterial>()
  card.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
    if (material) cardMaterials.add(material)
  })
  const corner = new THREE.Vector3()
  const box = { left: 0, right: 0, top: 0, bottom: 0 }
  const measureCard = () => {
    box.left = box.top = Infinity
    box.right = box.bottom = -Infinity
    card.updateWorldMatrix(true, false)
    for (const [x, y] of [
      [-1.38, -0.92],
      [1.38, -0.92],
      [1.38, 0.92],
      [-1.38, 0.92],
    ]) {
      corner.set(x, y, 0).applyMatrix4(card.matrixWorld).project(camera)
      const px = ((corner.x + 1) / 2) * width
      const py = ((1 - corner.y) / 2) * height
      box.left = Math.min(box.left, px)
      box.right = Math.max(box.right, px)
      box.top = Math.min(box.top, py)
      box.bottom = Math.max(box.bottom, py)
    }
  }

  const render = (p: number, t: number, pointer: { x: number; y: number }) => {
    const open = easeInOut(span(p, 0, 0.16))
    const rise = easeInOut(span(p, 0.14, 0.34))
    // The envelope is pulled down and away, which slides the card the rest
    // of the way out — it never sits in front of the envelope's edges. Only
    // once it has cleared the card does the envelope fade.
    const pull = easeInOut(span(p, 0.3, 0.46))
    const fade = span(p, 0.4, 0.48)
    // The 3D card becomes the page's card: same spot and size at first, then
    // it glides and grows into place — and stays there for the rest.
    const morph = easeInOut(span(p, 0.44, 0.62))
    const calm = 1 - span(p, 0.3, 0.45)

    // Idle float and pointer tilt, settling as the card comes out.
    sway.x += (pointer.y * 0.12 - sway.x) * 0.06
    sway.y += (pointer.x * 0.2 - sway.y) * 0.06
    root.rotation.x = (-0.12 + sway.x + Math.sin(t * 0.7) * 0.04) * calm
    root.rotation.y = (-0.14 + sway.y + Math.sin(t * 0.5) * 0.07) * calm
    root.rotation.z = (0.03 + Math.sin(t * 0.4) * 0.015) * calm
    root.position.y = Math.sin(t * 1.1) * 0.03 * calm

    // The seal swings up with the flap and quietly fades on the way — no
    // popping off, no stray shadow.
    const sealFade = span(open, 0.1, 0.55)
    seal.visible = sealFade < 1
    seal.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = sealFade === 0
      const material = mesh.material as THREE.MeshStandardMaterial
      material.transparent = sealFade > 0
      material.opacity = 1 - sealFade
    })
    // A little past flat, so the open flap leans back behind the card.
    flap.rotation.x = -open * Math.PI * 1.05
    flap.position.copy(flapRest)
    if (open >= 0.5) flap.position.z = -0.024

    envelope.position.y = -pull * 2.3
    envelope.visible = fade < 1
    for (const material of envelopeMaterials) {
      material.transparent = fade > 0 || alwaysTransparent.has(material)
      material.opacity = 1 - fade
    }
    ;(catcher.material as THREE.ShadowMaterial).opacity = 0.18 * (1 - fade)

    // It rises only as far as its bottom edge stays tucked in the pocket.
    card.position.set(cardRest.x, cardRest.y + rise * 0.98, cardRest.z)
    const cardFade = span(morph, 0.12, 0.45)
    card.visible = cardFade < 1
    for (const material of cardMaterials) {
      material.transparent = cardFade > 0
      material.opacity = 1 - cardFade
    }

    renderer.render(scene, camera)
    if (htmlCard) morphCard(morph)
  }

  /**
   * Places the HTML card over the 3D one (morph 0) and moves it to its own
   * spot, centred on the screen (morph 1). Its background fades in first,
   * covering the fading 3D card, and its text crossfades with the 3D
   * card's. Until it has arrived it doesn't take clicks.
   */
  const morphCard = (morph: number) => {
    const el = htmlCard as HTMLElement
    if (morph <= 0) {
      el.style.visibility = 'hidden'
      return
    }
    measureCard()
    const finalW = el.offsetWidth
    const finalH = el.offsetHeight
    const own = canvas.getBoundingClientRect()
    const slot = el.parentElement!.getBoundingClientRect()
    // The card's CSS puts its centre at the slot's centre; translate from there.
    const slotX = slot.left + slot.width / 2 - own.left
    const slotY = slot.top + slot.height / 2 - own.top
    const fromX = (box.left + box.right) / 2
    const fromY = (box.top + box.bottom) / 2
    const x = fromX + (width / 2 - fromX) * morph
    const y = fromY + (height / 2 - fromY) * morph
    const sx = (box.right - box.left) / finalW
    const sy = (box.bottom - box.top) / finalH
    const scaleX = sx + (1 - sx) * morph
    const scaleY = sy + (1 - sy) * morph
    el.style.visibility = 'visible'
    el.style.transform = `translate(-50%, -50%) translate(${x - slotX}px, ${y - slotY}px) scale(${scaleX}, ${scaleY})`
    // Background first, over the fading 3D card; the text crossfades with
    // the 3D card's printed text, so the card is never blank.
    el.style.setProperty('--card-bg', String(Math.min(1, morph / 0.25)))
    el.style.setProperty('--card-content', String(Math.min(1, Math.max(0, (morph - 0.2) / 0.35))))
    el.style.pointerEvents = morph > 0.98 ? 'auto' : 'none'
  }

  return {
    render,
    resize,
    dispose: () => {
      disposeTree(scene)
      environment.dispose()
      bump.dispose()
      renderer.dispose()
    },
  }
}

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { canvasTexture, createRenderer, disposeTree, GREEN, PINK, sizeRenderer, span } from './kit'
import type { SceneInstance } from './types'

/**
 * The close: a disco ball, hanging where it hangs, that fades in as you
 * scroll into the last screen. It turns slowly and throws soft rays of
 * light through the haze.
 *
 * The model comes from Blender (blender/discoball.py → public/story/discoball.glb).
 * The canvas is transparent: the ball is drawn opaque, and the glow and
 * rays only add light, so they brighten the page beneath them.
 *
 * Realism comes mostly from what the tiles reflect: a dim room full of
 * small lights, so most tiles glint a little and a few flash hard, the way
 * a real mirror ball does. The rays are drawn, not lit — thin camera-facing
 * ribbons that fan out from the ball and brighten as tiles swing past.
 */

const RAYS = 46

/**
 * Light on a transparent canvas. Colour is added (weighted by its alpha)
 * and alpha is added too, so every pixel stays valid premultiplied colour —
 * colour without alpha is something browsers on real GPUs simply drop,
 * which is why glow and rays vanished there. Over the dark page the result
 * looks the same as pure additive light.
 */
const addLight = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
} as const
const SPIN = 0.1 // radians per second: a slow, lazy turn
const RADIUS = 0.5

/** Dozens of small lights in a dark club, rendered once into a reflection map. */
function clubEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const club = new THREE.Scene()
  // The room itself: a soft gradient, a little lighter overhead, faintly
  // pink on one side and mint on the other. Every tile sees a slightly
  // different part of it, which gives the shimmering grey mosaic.
  const roomGeometry = new THREE.SphereGeometry(20, 48, 24)
  const tint = new THREE.Color()
  const tones = roomGeometry.attributes.position
  const vertexColors = new Float32Array(tones.count * 3)
  for (let i = 0; i < tones.count; i++) {
    const y = tones.getY(i) / 20
    const x = tones.getX(i) / 20
    tint.setRGB(0.05, 0.05, 0.06).lerp(new THREE.Color(0.32, 0.31, 0.34), Math.max(0, y) ** 1.5)
    tint.add(new THREE.Color(0.12, 0.02, 0.08).multiplyScalar(Math.max(0, -x)))
    tint.add(new THREE.Color(0.01, 0.08, 0.05).multiplyScalar(Math.max(0, x)))
    tint.toArray(vertexColors, i * 3)
  }
  roomGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3))
  club.add(new THREE.Mesh(roomGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))
  let seed = 5
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const colors = ['#ffffff', '#ffffff', '#ffffff', '#ffe9d6', PINK, PINK, GREEN, '#8a6bff']
  const bulb = new THREE.SphereGeometry(1, 12, 8)
  for (let i = 0; i < 180; i++) {
    const z = random() * 2 - 1
    const a = random() * Math.PI * 2
    const r = Math.sqrt(1 - z * z)
    const direction = new THREE.Vector3(Math.cos(a) * r, z, Math.sin(a) * r)
    const strength = 2 + random() * 14
    const light = new THREE.Mesh(
      bulb,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colors[i % colors.length]).multiplyScalar(strength) }),
    )
    light.position.copy(direction.multiplyScalar(12 + random() * 6))
    light.scale.setScalar(0.12 + random() * 0.35)
    club.add(light)
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const texture = pmrem.fromScene(club, 0).texture
  pmrem.dispose()
  return texture
}

/**
 * Light rays: one instanced ribbon per ray. Each runs from the ball's
 * surface outwards, faces the camera, widens a little, and fades out along
 * its length and towards its edges — a beam in haze, not a cone.
 */
function rayMesh(count: number) {
  const base = new THREE.InstancedBufferGeometry()
  // Two triangles: x = along the ray (0 at the ball, 1 at the end), y = across (-1..1).
  base.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, -1, 0, 1, 1, 0, 0, 1, 0]), 3))
  let seed = 13
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const palette = ['#ffffff', '#ffffff', '#ffd6ef', '#ff8ad4', '#9dffd6', '#ffffff']
  const dirs = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const params = new Float32Array(count * 4) // length, width, phase, strength
  for (let i = 0; i < count; i++) {
    const z = random() * 1.6 - 0.8
    const a = random() * Math.PI * 2
    const r = Math.sqrt(1 - z * z)
    dirs.set([Math.cos(a) * r, z, Math.sin(a) * r], i * 3)
    new THREE.Color(palette[i % palette.length]).toArray(colors, i * 3)
    params.set([4 + random() * 6, 0.025 + random() * 0.05, random() * Math.PI * 2, 0.5 + random() * 0.5], i * 4)
  }
  base.setAttribute('dir', new THREE.InstancedBufferAttribute(dirs, 3))
  base.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3))
  base.setAttribute('params', new THREE.InstancedBufferAttribute(params, 4))
  base.instanceCount = count

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...addLight,
    side: THREE.DoubleSide,
    uniforms: { uAngle: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 dir;
      attribute vec3 color;
      attribute vec4 params;
      uniform float uAngle;
      uniform vec3 uCenter;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vStrength;
      void main() {
        // Turn with the ball.
        float c = cos(uAngle), s = sin(uAngle);
        vec3 d = normalize(vec3(dir.x * c + dir.z * s, dir.y, -dir.x * s + dir.z * c));
        float len = params.x;
        float width = params.y;
        vec3 start = uCenter + d * ${RADIUS.toFixed(2)};
        vec3 p = start + d * len * position.x;
        // Face the camera: spread across the ray, perpendicular to the view.
        vec3 toCam = normalize(cameraPosition - p);
        vec3 side = normalize(cross(d, toCam));
        p += side * position.y * width * (0.4 + position.x * 2.2);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        vUv = position.xy;
        vColor = color;
        // A tile only throws a ray while it faces a light: rays swell and
        // fade as the ball turns, and rays pointing at us are kept faint.
        float sweep = pow(0.5 + 0.5 * sin(params.z + uAngle * 7.0 + uTime * 0.3), 3.0);
        float facing = 1.0 - smoothstep(0.55, 0.95, abs(dot(d, toCam)));
        vStrength = params.w * sweep * facing;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vStrength;
      void main() {
        // Gaussian across the ribbon, forced to exactly zero at its edges so
        // no ribbon ever shows its rectangle.
        float across = exp(-vUv.y * vUv.y * 3.5) * (1.0 - vUv.y * vUv.y);
        float along = pow(1.0 - vUv.x, 1.6) * smoothstep(0.0, 0.06, vUv.x);
        // A brighter root where the ray leaves the ball: the glow a camera
        // would bloom, drawn in rather than post-processed.
        float root = exp(-vUv.x * 14.0) * (1.0 - vUv.y * vUv.y);
        float a = (across * along + root * 0.6) * vStrength * uOpacity * 0.3;
        if (a < 0.001) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  })
  const mesh = new THREE.Mesh(base, material)
  mesh.frustumCulled = false
  return { mesh, material }
}

/**
 * Glow around the ball, as if the air near it were lit: a wide pink haze.
 * Drawn as a sprite rather than a bloom pass, which some browsers composite
 * badly on a blended canvas.
 */
function haloSprite(stops: [number, string][], size: number) {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    for (const [offset, color] of stops) g.addColorStop(offset, color)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }, 1)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false, transparent: true, ...addLight }))
  sprite.scale.setScalar(size)
  return sprite
}

export async function create(canvas: HTMLCanvasElement): Promise<SceneInstance> {
  const gltf = await new GLTFLoader().loadAsync('/story/discoball.glb')

  const renderer = createRenderer(canvas)
  // Transparent canvas: the ball is opaque, and light only ever adds.
  renderer.setClearColor('#000000', 0)
  renderer.shadowMap.enabled = false
  const scene = new THREE.Scene()
  const environment = clubEnvironment(renderer)
  scene.environment = environment
  scene.environmentIntensity = 1.6

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100)
  camera.position.set(0, 0, 7)
  camera.lookAt(0, 0, 0)

  scene.add(gltf.scene)
  const ball = gltf.scene.getObjectByName('DiscoBall')
  if (!ball) throw new Error('discoball.glb has no "DiscoBall"')

  const haze = haloSprite(
    [
      [0, 'rgba(255,170,225,0.32)'],
      [0.14, 'rgba(255,150,218,0.2)'],
      [0.35, 'rgba(255,138,212,0.07)'],
      [0.65, 'rgba(255,138,212,0.015)'],
      [1, 'rgba(0,0,0,0)'],
    ],
    7,
  )
  haze.position.z = -0.8
  scene.add(haze)

  const rays = rayMesh(RAYS)
  scene.add(rays.mesh)

  // Two slow lights circling close by, for the odd hard flash on a tile.
  const flashes = [new THREE.PointLight('#ffffff', 3, 3, 1.5), new THREE.PointLight(PINK, 3, 3, 1.5)]
  flashes.forEach((light) => scene.add(light))

  // --- layout: the ball hangs in the upper part of the screen ---------------------------------------------
  const resize = (w: number, h: number) => {
    const width = Math.max(1, w)
    const height = Math.max(1, h)
    sizeRenderer(renderer, width, height, 4_000_000)
    camera.aspect = width / height
    camera.position.z = camera.aspect < 0.8 ? 9.5 : 7
    camera.setViewOffset(width, height, 0, height * 0.22, width, height)
    camera.updateProjectionMatrix()
  }

  // --- animation ---------------------------------------------------------------------------------------------
  const render = (p: number, t: number, pointer: { x: number; y: number }) => {
    // Fades in as the section scrolls in; p reaches ~0.5 when it fills the screen.
    const appear = span(p, 0.12, 0.45)
    canvas.style.opacity = String(appear * appear * (3 - 2 * appear))

    const angle = t * SPIN
    ball.rotation.y = angle
    ball.rotation.x = Math.sin(t * 0.25) * 0.02 + pointer.y * 0.04
    gltf.scene.rotation.y = pointer.x * 0.08

    flashes.forEach((light, i) => {
      const a = t * (0.25 + i * 0.1) + i * 3
      light.position.set(Math.cos(a) * 1.4, Math.sin(a * 0.6) * 0.9, 1.5 + Math.sin(a) * 0.6)
    })

    rays.material.uniforms.uAngle.value = angle + pointer.x * 0.08
    rays.material.uniforms.uTime.value = t
    rays.material.uniforms.uOpacity.value = appear

    renderer.render(scene, camera)
  }

  return {
    render,
    resize,
    dispose: () => {
      disposeTree(scene)
      environment.dispose()
      renderer.dispose()
    },
  }
}

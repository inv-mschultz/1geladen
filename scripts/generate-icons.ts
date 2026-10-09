/**
 * Renders the home-screen icons into public/icons from the logo in
 * src/lib/brand.ts. The PNGs are committed; re-run after changing the logo:
 *
 *   pnpm tsx scripts/generate-icons.ts
 */
import { mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

import { logoSvg } from '../src/lib/brand'

const out = path.resolve(process.cwd(), 'public/icons')

const icons = [
  // Regular icons keep the sparkle at the size of the favicon.
  { file: 'icon-192.png', size: 192, svg: logoSvg({ rounded: false }) },
  { file: 'icon-512.png', size: 512, svg: logoSvg({ rounded: false }) },
  // Android crops maskable icons to its own shape; keep the art in the safe zone.
  { file: 'maskable-512.png', size: 512, svg: logoSvg({ rounded: false, scale: 0.7 }) },
  // iOS rounds the corners itself and ignores transparency.
  { file: 'apple-touch-icon.png', size: 180, svg: logoSvg({ rounded: false, scale: 0.85 }) },
]

await mkdir(out, { recursive: true })
for (const { file, size, svg } of icons) {
  await sharp(Buffer.from(svg), { density: 72 * (size / 100) })
    .resize(size, size)
    .png()
    .toFile(path.join(out, file))
  console.log(`wrote public/icons/${file}`)
}

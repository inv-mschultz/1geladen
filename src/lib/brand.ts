/** Platform-dark background behind the logo mark. */
export const BRAND_BG = '#0d1f17'
/** The pink of the pixel sparkle. */
export const BRAND_PINK = '#ff8ad4'

const SPARKLE_CELLS = [
  [15, 15], [43, 15],
  [29, 29], [43, 29], [57, 29],
  [15, 43], [29, 43], [43, 43], [57, 43], [71, 43],
  [29, 57], [43, 57], [57, 57],
  [43, 71],
]

/**
 * The logo mark — pink pixel sparkle on the platform-dark background — as SVG.
 *
 * `scale` shrinks the sparkle about the centre while the background stays full
 * bleed: maskable icons get cropped to a circle by Android, so their artwork has
 * to sit inside the middle 80%. `rounded` is for the favicon only; home-screen
 * icons are masked by the OS and must be square.
 */
export function logoSvg({ scale = 1, rounded = true }: { scale?: number; rounded?: boolean } = {}): string {
  const offset = (100 - 100 * scale) / 2
  const cells = SPARKLE_CELLS.map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="14"/>`).join('')
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    `<rect width="100" height="100"${rounded ? ' rx="24"' : ''} fill="${BRAND_BG}"/>` +
    `<g fill="${BRAND_PINK}" shape-rendering="crispEdges" transform="translate(${offset} ${offset}) scale(${scale})">${cells}</g>` +
    '</svg>'
  )
}

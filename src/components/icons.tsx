import React from 'react'

const iconProps = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  style: { verticalAlign: '-0.12em' },
} as const

export const ArrowUpRight = () => (
  <svg {...iconProps}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)

export const ArrowRight = () => (
  <svg {...iconProps}>
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </svg>
)

export const ArrowLeft = () => (
  <svg {...iconProps}>
    <path d="M20 12H4m6-6-6 6 6 6" />
  </svg>
)

export const ArrowDown = () => (
  <svg {...iconProps}>
    <path d="M12 4v16m-6-6 6 6 6-6" />
  </svg>
)

export const ArrowUp = () => (
  <svg {...iconProps}>
    <path d="M12 20V4m-6 6 6-6 6 6" />
  </svg>
)

export const X = () => (
  <svg {...iconProps}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const Power = () => (
  <svg {...iconProps}>
    <path d="M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0" />
  </svg>
)

export const ImageIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.2" />
    <path d="m21 15.5-4.5-4.5L8 19" />
  </svg>
)

export const Restore = () => (
  <svg {...iconProps}>
    <path d="M3 12a9 9 0 1 0 2.8-6.5L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

export const Trash = () => (
  <svg {...iconProps}>
    <path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m4 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7m4 4v6m4-6v6" />
  </svg>
)

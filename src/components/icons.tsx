import React from 'react'

/**
 * Pixel icons from Pixelarticons (MIT, https://pixelarticons.com) by
 * Gerrit Halfmann — inlined as fill paths so they ride on currentColor.
 */

const px = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  shapeRendering: 'crispEdges',
  'aria-hidden': true,
  style: { verticalAlign: '-0.12em' },
} as const

export const ArrowUp = () => (
  <svg {...px}>
    <path d="M11 20h2V4h-2zm2-12h2V6h-2zm2 2h2V8h-2zm2 2h2v-2h-2zm-6-4H9V6h2z" />
    <path d="M15 10H7V8h8zm2 2H5v-2h12z" />
  </svg>
)

export const ArrowDown = () => (
  <svg {...px}>
    <path d="M13 12h6v2h-2v2h-2v2h-2v2h-2v-2H9v-2H7v-2H5v-2h6V4h2v8Z" />
  </svg>
)

export const ArrowLeft = () => (
  <svg {...px}>
    <path d="M20 11v2H4v-2zM8 13v2H6v-2zm2 2v2H8v-2zm2 2v2h-2v-2zm-4-6V9H6v2z" />
    <path d="M10 15V7H8v8zm2 2V5h-2v12z" />
  </svg>
)

export const ArrowRight = () => (
  <svg {...px}>
    <path d="M4 11v2h16v-2zm12 2v2h2v-2zm-2 2v2h2v-2zm-2 2v2h2v-2zm4-6V9h2v2z" />
    <path d="M14 15V7h2v8zm-2 2V5h2v12z" />
  </svg>
)

export const ArrowUpRight = () => (
  <svg {...px}>
    <path d="M11 5H5v2h6V5ZM5 7H3v12h2V7Zm12 12H5v2h12v-2Zm2-6h-2v6h2v-6Zm-8 0H9v2h2v-2Zm2-2h-2v2h2v-2Zm2-2h-2v2h2V9Zm2-2h-2v2h2V7Zm2-2h-2v2h2V5Zm2-2h-2v8h2V3Z" />
    <path d="M21 3h-8v2h8V3Z" />
  </svg>
)

export const X = () => (
  <svg {...px}>
    <path d="M7 19H5V17H7V19ZM19 19H17V17H19V19ZM9 15V17H7V15H9ZM17 17H15V15H17V17ZM11 15H9V13H11V15ZM15 15H13V13H15V15ZM13 13H11V11H13V13ZM11 11H9V9H11V11ZM15 11H13V9H15V11ZM9 9H7V7H9V9ZM17 9H15V7H17V9ZM7 7H5V5H7V7ZM19 7H17V5H19V7Z" />
  </svg>
)

export const Trash = () => (
  <svg {...px}>
    <path d="M18 22H6V20H18V22ZM9 6H15V4H17V6H22V8H20V20H18V8H6V20H4V8H2V6H7V4H9V6ZM15 4H9V2H15V4Z" />
  </svg>
)

export const Power = () => (
  <svg {...px}>
    <path d="M6 20h12v2H6zM18 6h2v2h-2zM4 6h2v2H4zm2-2h2v2H6zm10 0h2v2h-2zM4 18h2v2H4zm14 0h2v2h-2zM2 8h2v10H2zm18 0h2v10h-2zm-9-6h2v9h-2z" />
  </svg>
)

export const ImageIcon = () => (
  <svg {...px}>
    <path d="M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zm-4 8h2v2h-2zm-2 2h2v2h-2zm4 0h2v2h-2zm-8 0h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2z" />
    <path d="M20 16h2v2h-2zM8 16h2v2H8zm-2 2h2v2H6zM8 6h2v2H8zM6 8h2v2H6zm2 2h2v2H8zm2-2h2v2h-2z" />
  </svg>
)

export const Restore = () => (
  <svg {...px}>
    <path d="M16 4h2v6h-2zm-2-2h2v2h-2zm0 2h2v8h-2zM4 8H2v5h2z" />
    <path d="M4 6h16v2H4zm4 14H6v-6h2zm2 2H8v-2h2zm0-2H8v-8h2zm10-4h2v-5h-2z" />
    <path d="M20 18H4v-2h16z" />
  </svg>
)

export const ChevronDown = () => (
  <svg {...px}>
    <path d="M13 16h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 10H5V8h2v2Zm12 0h-2V8h2v2Z" />
  </svg>
)

export const Heart = () => (
  <svg {...px}>
    <path d="M13 22h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 16H5v-2h2v2Zm12 0h-2v-2h2v2ZM5 14H3v-2h2v2Zm16 0h-2v-2h2v2ZM3 12H1V6h2v6Zm20 0h-2V6h2v6ZM13 8h-2V6h2v2ZM5 6H3V4h2v2Zm6 0H9V4h2v2Zm4 0h-2V4h2v2Zm6 0h-2V4h2v2ZM9 4H5V2h4v2Zm10 0h-4V2h4v2Z" />
  </svg>
)

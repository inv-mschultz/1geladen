import React from 'react'

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initials || '?'}
    </span>
  )
}

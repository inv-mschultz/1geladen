import React from 'react'

const AVATAR_COLORS = ['#e04e2e', '#e9a820', '#7a8450', '#7c3b4e', '#3e6b8a', '#a4632a']

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

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
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundColor: avatarColor(name),
      }}
      aria-hidden
    >
      {initials || '?'}
    </span>
  )
}

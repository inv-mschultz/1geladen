import type { Event } from '@/payload-types'

/** Lexical rich text → plain text, one line per paragraph. */
export function richTextToPlain(description: Event['description']): string {
  if (!description?.root) return ''
  const root = description.root as { children?: unknown[] }
  const lines: string[] = []
  for (const child of root.children ?? []) {
    const texts: string[] = []
    const walk = (node: { text?: string; children?: unknown[] }) => {
      if (typeof node.text === 'string') texts.push(node.text)
      if (Array.isArray(node.children)) node.children.forEach((n) => walk(n as never))
    }
    walk(child as never)
    lines.push(texts.join(''))
  }
  return lines.join('\n').trim()
}

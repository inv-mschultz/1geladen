import React from 'react'

/**
 * Long event titles are often dotted or hyphenated ("Fast.Fierzig.Feiern"),
 * which browsers treat as one unbreakable word — `overflow-wrap: anywhere`
 * then chops it mid-syllable ("FAST.FIERZIG.F / EIERN").
 *
 * Emitting a <wbr> after each "." and "-" adds real soft-wrap opportunities,
 * which line breaking prefers; anywhere-breaking stays as the last resort for
 * a single segment that still doesn't fit on its own line.
 */
export function BreakableTitle({ text }: { text: string }): React.ReactElement {
  // Keep the separator attached to the chunk before the break opportunity.
  const chunks = text.split(/(?<=[.\-])/)
  return (
    <>
      {chunks.map((chunk, index) => (
        <React.Fragment key={index}>
          {chunk}
          {index < chunks.length - 1 && <wbr />}
        </React.Fragment>
      ))}
    </>
  )
}

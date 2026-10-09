/**
 * Who runs 1geladen, for the Impressum and the privacy policy.
 *
 * TODO(operator): fill in before opening sign-ups to strangers. German law
 * (§ 5 DDG) wants a postal address a letter actually reaches — no P.O. box —
 * and an email that gets read. Leave a field empty and the pages show a loud
 * placeholder instead of quietly publishing something incomplete.
 */
export const operator = {
  name: 'Michael Schultz',
  street: 'Liebenwalder Str. 16',
  city: '13347 Berlin',
  email: 'hey@bureauproto.io',
}

/** Where people report content (DSA Art. 16) and privacy requests go. */
export const contactEmail = (): string => operator.email || 'hey@bureauproto.io'

export const reportMailto = (): string =>
  `mailto:${contactEmail()}?subject=${encodeURIComponent('Inhalt melden / Report content')}` +
  `&body=${encodeURIComponent('Link zum Inhalt / Link to the content:\n\nWas ist das Problem? / What is wrong?\n')}`

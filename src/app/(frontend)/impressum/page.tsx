import type { Metadata } from 'next'
import React from 'react'

import { contactEmail, operator } from '@/lib/legal'

export const metadata: Metadata = { title: 'Impressum — 1geladen' }

const Missing = ({ what }: { what: string }) => <mark className="legal__missing">[{what} fehlt]</mark>

export default function ImpressumPage() {
  return (
    <article className="legal reveal">
      <h1 className="legal__title">Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {operator.name || <Missing what="Name" />}
        <br />
        {operator.street || <Missing what="Straße und Hausnummer" />}
        <br />
        {operator.city || <Missing what="PLZ und Ort" />}
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${contactEmail()}`}>{contactEmail()}</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>{operator.name || <Missing what="Name" />}, Anschrift wie oben.</p>

      <h2>Ein privates Projekt</h2>
      <p>
        1geladen ist ein nicht-kommerzielles Hobbyprojekt. Es gibt keine Werbung, kein Tracking und
        keine Bezahlfunktionen.
      </p>

      <h2>Inhalte von Nutzer:innen</h2>
      <p>
        Beiträge, Kommentare und Fotos auf Event-Seiten stammen von den jeweiligen Gästen und sind nur
        für die Eingeladenen sichtbar. Wenn dir dort etwas Rechtswidriges begegnet, schreib an{' '}
        <a href={`mailto:${contactEmail()}`}>{contactEmail()}</a> — mit dem Link zum Inhalt und einer
        kurzen Begründung. Gemeldete Inhalte werden zügig geprüft und gegebenenfalls entfernt.
      </p>
    </article>
  )
}

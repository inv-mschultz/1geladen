import type { Metadata } from 'next'
import React from 'react'

import { contactEmail, operator } from '@/lib/legal'

export const metadata: Metadata = { title: 'Datenschutz — 1geladen' }

/*
 * A draft written for this app as it is built, not legal advice. Have it
 * checked before strangers sign up, and update it whenever a new service
 * starts receiving data (a new storage provider, an email sender, analytics).
 */
export default function DatenschutzPage() {
  const email = contactEmail()
  return (
    <article className="legal reveal">
      <h1 className="legal__title">Datenschutz</h1>

      <h2>Kurz gesagt</h2>
      <p>
        1geladen speichert nur, was es braucht, um eure Feier zu organisieren. Keine Werbung, kein
        Tracking, keine Weitergabe zu Marketingzwecken. Event-Inhalte sehen nur die Eingeladenen. Du
        kannst dein Konto jederzeit selbst löschen.
      </p>

      <h2>Verantwortlich</h2>
      <p>
        {operator.name}, Kontakt siehe <a href="/impressum">Impressum</a>, E-Mail:{' '}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>

      <h2>Welche Daten, wofür</h2>
      <ul>
        <li>
          <strong>Konto:</strong> Name, E-Mail-Adresse und Passwort (nur als Hash gespeichert). Wer über
          einen Einladungslink beitritt, gibt nur einen Namen an.
        </li>
        <li>
          <strong>Event-Inhalte:</strong> Zu- und Absagen, Pinnwand-Beiträge, Kommentare, Reaktionen,
          Mitbringlisten und hochgeladene Fotos. Sichtbar nur für Gäste und Hosts des jeweiligen
          Events.
        </li>
        <li>
          <strong>Benachrichtigungen (optional):</strong> Wenn du sie einschaltest, speichern wir eine
          technische Adresse deines Geräts beim Push-Dienst deines Browsers bzw. Betriebssystems
          (Apple, Google oder Mozilla). Die Nachricht wird über diesen Dienst zugestellt.
        </li>
        <li>
          <strong>Server-Protokolle:</strong> Beim Aufruf verarbeitet unser Hosting-Anbieter technisch
          notwendige Daten wie IP-Adresse und Zeitpunkt, um die Seite auszuliefern und vor Missbrauch
          zu schützen.
        </li>
      </ul>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des Dienstes, den du nutzt) und
        für Server-Protokolle Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb).
      </p>

      <h2>Cookies und lokaler Speicher</h2>
      <p>
        Wir setzen nur technisch notwendige Cookies: deine Anmeldung, deine Sprache und dein
        Farbmodus. Im Browser merken wir uns außerdem, ob du den Hinweis „aufs Handy“ ausgeblendet
        hast. Dafür ist keine Einwilligung nötig (§ 25 Abs. 2 TDDDG). Tracking-Cookies gibt es nicht.
      </p>

      <h2>Dienstleister</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (USA) — Hosting und Speicherung der Fotos. Vercel ist unter dem
          EU-U.S. Data Privacy Framework zertifiziert; mit Vercel besteht ein Vertrag zur
          Auftragsverarbeitung.
        </li>
        <li>
          <strong>Neon Inc.</strong> (USA) — Datenbank, betrieben über Vercel. Ebenfalls mit Vertrag zur
          Auftragsverarbeitung.
        </li>
        <li>
          <strong>GIPHY</strong> (Shutterstock, USA) — Wenn du GIFs suchst oder ein Beitrag ein GIF
          enthält, lädt dein Browser es direkt von GIPHY. Dabei erhält GIPHY deine IP-Adresse.
        </li>
      </ul>

      <h2>Wie lange</h2>
      <p>
        Fotos in der Galerie eines Events werden 30 Tage nach der Party automatisch gelöscht. Alles
        andere bleibt, solange dein Konto besteht. Löschst du dein Konto, verschwinden Zusagen, Reaktionen,
        Galerie-Fotos und Benachrichtigungs-Einstellungen. Beiträge und Kommentare bleiben im
        Gesprächsverlauf, aber ohne deinen Namen. Events, die nur du ausrichtest, werden mit allen
        Inhalten gelöscht.
      </p>

      <h2>Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch. Schreib dafür an{' '}
        <a href={`mailto:${email}`}>{email}</a>. Außerdem kannst du dich bei einer
        Datenschutz-Aufsichtsbehörde beschweren.
      </p>
    </article>
  )
}

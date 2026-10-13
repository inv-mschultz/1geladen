import type { Locale } from './dictionaries'

/**
 * Copy for the landing story — what a party on 1geladen looks like from a
 * guest's side: the invitation arrives, you answer, the planning happens,
 * and afterwards the photos. Kept out of the main dictionary because it is
 * long, and only this one page reads it.
 */
const de = {
  metaTitle: 'So geht’s · 1geladen',
  metaDescription:
    'Eine Einladung, ein Link, eine Party: Zusagen, Mitbringliste, Pinnwand und Fotos. Ohne Werbung, ohne Tracking, ohne Kosten.',

  invite: {
    to: 'An: Dich',
    from: 'Von: 1geladen',
    hint: 'Runterscrollen zum Öffnen',
    headline: 'Post für dich.',
    kicker: 'Du bist eingeladen',
    title: 'Events organisieren wie 2010.',
    titleAccent: 'Nur besser.',
    blurb:
      'Eine Seite pro Party, nur für die Leute, die eingeladen sind. Zusagen, Mitbringliste, Pinnwand und Fotos: alles an einem Ort, ganz ohne blaues F.',
    cta: 'Ich will mitfeiern',
  },

  plan: {
    kicker: 'Zusagen & planen',
    title: 'Kommst du? Und was bringst du mit?',
    text: 'Gäste öffnen den Link, tippen ihren Namen ein und sind drin. Kein Konto, keine App, kein Passwort. Dann: dabei, vielleicht oder kann nicht. Und auf der Mitbringliste schnappt sich jede:r etwas. Nie wieder fünf Kartoffelsalate. Außer ihr wollt das.',
  },

  rsvp: {
    tryIt: 'Probier’s aus',
    event: 'Sommerfest bei Jonas',
    eventMeta: 'Sa · 20 Uhr · Hinterhof',
    yes: 'Dabei',
    maybe: 'Vielleicht',
    no: 'Kann nicht',
    you: 'Du',
    replies: {
      yes: 'Juhu! Du stehst auf der Liste.',
      maybe: 'Wir halten dir ein Getränk kalt.',
      no: 'Schade! Die Fotos siehst du trotzdem.',
    },
  },

  notify: {
    kicker: 'Bis zur Party',
    title: 'Ding-dong.',
    text: 'Bis zur Party ist auf der Event-Seite schon einiges los. Wenn jemand zusagt, an die Pinnwand schreibt oder dir antwortet, meldet sich dein Handy. Leg 1geladen auf den Home-Bildschirm. Fühlt sich an wie eine App, ganz ohne Store.',
    app: '1geladen',
    now: 'jetzt',
    notes: [
      { title: 'Lena hat zugesagt 🎉', body: 'Sommerfest bei Jonas · Sa, 20 Uhr' },
      { title: 'Neu auf der Pinnwand', body: 'Mia: „Gibt’s auch was Veganes? 🌱“' },
      { title: 'Tobi hat dir geantwortet', body: '„Ich bring die Musikbox mit!“' },
    ],
    lockTime: '19:42',
    lockDate: 'Donnerstag, 12. Juni',
  },

  kitchen: {
    listTitle: 'Mitbringliste',
    claim: 'Ich bring’s',
    unclaim: 'Doch nicht',
    you: 'Du',
    free: 'noch frei',
    brings: 'bringt’s',
    tally: '{n} von {total} vergeben',
    items: [
      { emoji: '🥗', name: 'Kartoffelsalat', by: '' },
      { emoji: '🥨', name: 'Brezeln', by: 'Tobi' },
      { emoji: '🍉', name: 'Wassermelone', by: '' },
      { emoji: '🧊', name: 'Eiswürfel', by: 'Mia' },
      { emoji: '🎂', name: 'Kuchen', by: '' },
      { emoji: '🔊', name: 'Musikbox', by: 'Ayşe' },
    ],
  },


  wall: {
    kicker: 'Pinnwand',
    title: 'Hier wird schon vorgefeiert.',
    text: 'Fragen, Vorfreude, GIFs: Auf der Pinnwand jeder Party wird gepostet, kommentiert und reagiert. Wie früher, nur ohne Algorithmus und nur für die Gäste.',
    post: {
      author: 'Jonas',
      time: 'vor 2 Std.',
      text: 'Noch 3 Tage! 🎉 Wer hat eine Lichterkette für den Hinterhof?',
    },
    reactions: [
      { emoji: '🔥', count: 7 },
      { emoji: '🥳', count: 5 },
      { emoji: '💡', count: 2 },
    ],
    comments: [
      { author: 'Lena', time: 'vor 1 Std.', text: 'Hab zwei! Bring ich mit ✨', gif: '' },
      { author: 'Tobi', time: 'vor 45 Min.', text: '', gif: '🕺' },
      { author: 'Mia', time: 'vor 10 Min.', text: 'Ich bin so bereit.', gif: '' },
    ],
    gif: 'GIF',
  },

  faq: {
    kicker: 'FAQ',
    title: 'Noch Fragen?',
    text: 'Das Wichtigste auf einen Blick. Zettel antippen für die Antwort.',
    hint: 'Zettel antippen zum Umdrehen',
    faq: [
      {
        sticker: '💸',
        q: 'Kostet das etwas?',
        a: 'Nein. Kein Abo, keine Premium-Version, keine Werbung. 1geladen ist ein privates Hobbyprojekt. Damit das so bleibt, gibt es ein paar Grenzen: bis zu 10 kommende Partys pro Person und 300 Fotos pro Galerie.',
      },
      {
        sticker: '🔑',
        q: 'Brauchen meine Gäste ein Konto?',
        a: 'Nein. Wer den Link hat, gibt einen Namen ein und ist dabei. Wer sich auf mehreren Geräten anmelden oder selbst einladen will, kann später eine E-Mail hinzufügen.',
      },
      {
        sticker: '🙈',
        q: 'Wer sieht unsere Fotos und Beiträge?',
        a: 'Nur die Gäste und Hosts dieser einen Party. Event-Seiten sind nicht öffentlich und tauchen nirgends auf. Es gibt keinen Feed, keinen Algorithmus und keine öffentlichen Profile.',
      },
      {
        sticker: '👯',
        q: 'Kann ich zu zweit ausrichten?',
        a: 'Klar. Mach Gäste zu Co-Hosts, dann können sie mit bearbeiten, einladen und aufräumen.',
      },
      {
        sticker: '📱',
        q: 'Gibt es eine App?',
        a: 'Sozusagen: Öffne 1geladen im Browser und füge es zum Home-Bildschirm hinzu. Dann hat es ein eigenes Icon und kann dir Bescheid geben, wenn jemand zusagt oder dir antwortet.',
      },
      {
        sticker: '🧹',
        q: 'Kann ich mein Konto löschen?',
        a: 'Jederzeit, selbst, unter „Dein Konto“. Gesammelt wird hier sowieso wenig: kein Tracking, keine Analyse-Cookies. Was mit deinen Daten passiert, steht im Datenschutz.',
      },
    ],
  },

  late: {
    kicker: 'Danach',
    title: 'Was auf der Party passiert, bleibt 30 Tage.',
    text: 'Sobald die Party beginnt, öffnet die Galerie: Alle laden ihre Fotos an einen Ort statt in zwölf Chats, und nur Gäste sehen sie. 30 Tage danach werden die Fotos gelöscht. Bis dahin könnt ihr eure Lieblingsbilder herunterladen. Die Seite selbst bleibt als Erinnerung.',
    day: 'Tag {n} nach der Party',
    captions: ['Tanzfläche', 'Kuchen!!', 'Jonas’ Moves', 'Polonaise'],
  },

  close: {
    title: 'Schmeiß deine eigene Party.',
    ctaRegister: 'Konto erstellen',
    ctaHost: 'Party anlegen',
    login: 'Ich habe schon ein Konto',
  },
}

const en: typeof de = {
  metaTitle: 'How it works · 1geladen',
  metaDescription:
    'One invite, one link, one party: RSVPs, bring list, wall and photos. No ads, no tracking, no cost.',

  invite: {
    to: 'To: You',
    from: 'From: 1geladen',
    hint: 'Scroll down to open',
    headline: 'You’ve got mail.',
    kicker: 'You are invited',
    title: 'Organize events like it’s 2010.',
    titleAccent: 'Only better.',
    blurb:
      'One page per party, only for the people who are invited. RSVPs, bring list, wall and photos: all in one place, no blue F required.',
    cta: 'Count me in',
  },

  plan: {
    kicker: 'RSVP & plan',
    title: 'Are you coming? And what are you bringing?',
    text: 'Guests open the link, type their name and they’re in. No account, no app, no password. Then: yes, maybe or can’t. And on the bring list everyone grabs something. Never five potato salads again. Unless you want that.',
  },

  rsvp: {
    tryIt: 'Try it',
    event: 'Summer party at Jonas’',
    eventMeta: 'Sat · 8 pm · Backyard',
    yes: 'Attending',
    maybe: 'Maybe',
    no: 'Can’t',
    you: 'You',
    replies: {
      yes: 'Yay! You’re on the list.',
      maybe: 'We’ll keep a drink cold for you.',
      no: 'Too bad! You’ll still see the photos.',
    },
  },

  notify: {
    kicker: 'Until the party',
    title: 'Ding-dong.',
    text: 'Before the party, the event page is already buzzing. When someone RSVPs, posts on the wall or replies to you, your phone lets you know. Add 1geladen to your home screen. It feels like an app, no store needed.',
    app: '1geladen',
    now: 'now',
    notes: [
      { title: 'Lena is coming 🎉', body: 'Summer party at Jonas’ · Sat, 8 pm' },
      { title: 'New on the wall', body: 'Mia: “Anything vegan? 🌱”' },
      { title: 'Tobi replied to you', body: '“I’ll bring the speaker!”' },
    ],
    lockTime: '19:42',
    lockDate: 'Thursday, 12 June',
  },

  kitchen: {
    listTitle: 'Bring list',
    claim: 'I’ll bring it',
    unclaim: 'Never mind',
    you: 'You',
    free: 'still open',
    brings: 'brings it',
    tally: '{n} of {total} taken',
    items: [
      { emoji: '🥗', name: 'Potato salad', by: '' },
      { emoji: '🥨', name: 'Pretzels', by: 'Tobi' },
      { emoji: '🍉', name: 'Watermelon', by: '' },
      { emoji: '🧊', name: 'Ice cubes', by: 'Mia' },
      { emoji: '🎂', name: 'Cake', by: '' },
      { emoji: '🔊', name: 'Speaker', by: 'Ayşe' },
    ],
  },


  wall: {
    kicker: 'The wall',
    title: 'The party starts early.',
    text: 'Questions, excitement, GIFs: every party has its own wall to post, comment and react on. Like back then, just without an algorithm, and for guests only.',
    post: {
      author: 'Jonas',
      time: '2 h ago',
      text: '3 more days! 🎉 Who has fairy lights for the backyard?',
    },
    reactions: [
      { emoji: '🔥', count: 7 },
      { emoji: '🥳', count: 5 },
      { emoji: '💡', count: 2 },
    ],
    comments: [
      { author: 'Lena', time: '1 h ago', text: 'I have two! Bringing them ✨', gif: '' },
      { author: 'Tobi', time: '45 min ago', text: '', gif: '🕺' },
      { author: 'Mia', time: '10 min ago', text: 'I am so ready.', gif: '' },
    ],
    gif: 'GIF',
  },

  faq: {
    kicker: 'FAQ',
    title: 'Any questions?',
    text: 'The essentials at a glance. Tap a note for the answer.',
    hint: 'Tap a note to flip it',
    faq: [
      {
        sticker: '💸',
        q: 'Does it cost anything?',
        a: 'No. No subscription, no premium tier, no ads. 1geladen is a private hobby project. To keep it that way there are a few limits: up to 10 upcoming parties per person and 300 photos per gallery.',
      },
      {
        sticker: '🔑',
        q: 'Do my guests need an account?',
        a: 'No. Whoever has the link enters a name and is in. Anyone who wants to log in on several devices or send invites themselves can add an email later.',
      },
      {
        sticker: '🙈',
        q: 'Who sees our photos and posts?',
        a: 'Only the guests and hosts of that one party. Event pages aren’t public and don’t show up anywhere. There’s no feed, no algorithm and no public profiles.',
      },
      {
        sticker: '👯',
        q: 'Can I host together with someone?',
        a: 'Sure. Make guests co-hosts so they can edit, invite and tidy up too.',
      },
      {
        sticker: '📱',
        q: 'Is there an app?',
        a: 'Sort of: open 1geladen in your browser and add it to your home screen. It gets its own icon and can let you know when someone RSVPs or replies to you.',
      },
      {
        sticker: '🧹',
        q: 'Can I delete my account?',
        a: 'Any time, yourself, under “Your account”. Not much is collected anyway: no tracking, no analytics cookies. What happens to your data is explained in the privacy policy.',
      },
    ],
  },

  late: {
    kicker: 'Afterwards',
    title: 'What happens at the party stays for 30 days.',
    text: 'When the party starts, the gallery opens: everyone’s photos in one place instead of twelve chats, and only guests can see them. 30 days later the photos are deleted. Until then you can download your favourites. The page itself stays as a memory.',
    day: 'Day {n} after the party',
    captions: ['Dance floor', 'Cake!!', 'Jonas’ moves', 'Conga line'],
  },

  close: {
    title: 'Throw your own party.',
    ctaRegister: 'Create account',
    ctaHost: 'Throw a party',
    login: 'I already have an account',
  },
}

export type StoryCopy = typeof de

export const getStory = (locale: Locale): StoryCopy => (locale === 'en' ? en : de)

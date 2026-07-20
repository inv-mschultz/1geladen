/**
 * Curated emoji set for the wall composers and reactions.
 *
 * Not exhaustive by design — the full Unicode set is ~3800 emoji and the
 * libraries that ship it cost about a megabyte. This is the subset a party
 * wall actually reaches for. Keywords are German *and* English so search works
 * in both locales without a translated dataset.
 */

export type Emoji = { char: string; name: string; keywords: string[] }
export type EmojiGroupId =
  | 'smileys'
  | 'gestures'
  | 'hearts'
  | 'party'
  | 'food'
  | 'drink'
  | 'nature'
  | 'objects'

export type EmojiGroup = { id: EmojiGroupId; emoji: Emoji[] }

const e = (char: string, name: string, ...keywords: string[]): Emoji => ({ char, name, keywords })

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    id: 'smileys',
    emoji: [
      e('😀', 'Grinsen', 'grin', 'smile', 'lachen', 'happy', 'freude'),
      e('😃', 'Freude', 'smile', 'happy', 'froh'),
      e('😄', 'Lachen', 'laugh', 'lachen', 'happy'),
      e('😁', 'Strahlen', 'beam', 'grin', 'zähne'),
      e('😆', 'Loslachen', 'laugh', 'lol', 'lachen'),
      e('😅', 'Schwitzen', 'sweat', 'nervous', 'schwitz'),
      e('🤣', 'Kugeln vor Lachen', 'rofl', 'lachen', 'lol'),
      e('😂', 'Tränen lachen', 'joy', 'lachen', 'tränen', 'lol'),
      e('🙂', 'Leichtes Lächeln', 'smile', 'lächeln'),
      e('😉', 'Zwinkern', 'wink', 'zwinkern'),
      e('😊', 'Verlegen', 'blush', 'lächeln', 'süß'),
      e('😇', 'Unschuldig', 'angel', 'engel', 'unschuldig'),
      e('🥰', 'Verliebt', 'love', 'liebe', 'herzen'),
      e('😍', 'Herzaugen', 'love', 'liebe', 'heart', 'eyes'),
      e('🤩', 'Begeistert', 'star', 'wow', 'stern'),
      e('😘', 'Kuss', 'kiss', 'kuss'),
      e('😋', 'Lecker', 'yum', 'lecker', 'tasty'),
      e('😜', 'Zunge', 'tongue', 'zunge', 'frech'),
      e('🤪', 'Verrückt', 'crazy', 'verrückt', 'goofy'),
      e('🤗', 'Umarmung', 'hug', 'umarmung'),
      e('🤔', 'Nachdenken', 'think', 'denken', 'hmm'),
      e('🤫', 'Pssst', 'shh', 'leise', 'geheim'),
      e('😐', 'Neutral', 'neutral', 'meh'),
      e('🙄', 'Augenrollen', 'eyeroll', 'augen', 'rollen'),
      e('😴', 'Schlafen', 'sleep', 'schlafen', 'müde'),
      e('🥳', 'Party', 'party', 'feiern', 'celebrate'),
      e('😎', 'Cool', 'cool', 'sonnenbrille', 'sunglasses'),
      e('🤤', 'Sabbern', 'drool', 'hunger', 'lecker'),
      e('😭', 'Weinen', 'cry', 'weinen', 'tränen'),
      e('😱', 'Schock', 'scream', 'schock', 'shock'),
      e('🤯', 'Mind blown', 'mindblown', 'wow', 'krass'),
      e('🥺', 'Bettelblick', 'pleading', 'bitte', 'süß'),
      e('😳', 'Errötet', 'flushed', 'oops', 'peinlich'),
      e('🫠', 'Zerfließen', 'melt', 'schmelzen', 'hitze'),
      e('👀', 'Augen', 'eyes', 'augen', 'schauen', 'look'),
    ],
  },
  {
    id: 'gestures',
    emoji: [
      e('👍', 'Daumen hoch', 'thumbsup', 'daumen', 'yes', 'gut', 'like'),
      e('👎', 'Daumen runter', 'thumbsdown', 'daumen', 'nein', 'schlecht'),
      e('👏', 'Applaus', 'clap', 'applaus', 'klatschen'),
      e('🙌', 'Hände hoch', 'raise', 'hände', 'yay', 'hooray'),
      e('🙏', 'Bitte danke', 'pray', 'bitte', 'danke', 'thanks'),
      e('🤝', 'Handschlag', 'handshake', 'deal', 'abgemacht'),
      e('✌️', 'Peace', 'peace', 'victory', 'frieden'),
      e('🤟', 'Love you', 'loveyou', 'rock'),
      e('🤙', 'Ruf an', 'callme', 'shaka', 'hangloose'),
      e('💪', 'Muskel', 'muscle', 'stark', 'strong', 'kraft'),
      e('🫶', 'Herzhände', 'hearthands', 'herz', 'liebe'),
      e('👋', 'Winken', 'wave', 'winken', 'hallo', 'tschüss'),
      e('🤌', 'Fingerkuss', 'chefkiss', 'italien', 'perfekt'),
      e('✍️', 'Schreiben', 'write', 'schreiben', 'notiz'),
      e('🫡', 'Salut', 'salute', 'jawohl', 'aye'),
    ],
  },
  {
    id: 'hearts',
    emoji: [
      e('❤️', 'Rotes Herz', 'heart', 'herz', 'liebe', 'love'),
      e('🧡', 'Oranges Herz', 'heart', 'herz', 'orange'),
      e('💛', 'Gelbes Herz', 'heart', 'herz', 'gelb'),
      e('💚', 'Grünes Herz', 'heart', 'herz', 'grün'),
      e('💙', 'Blaues Herz', 'heart', 'herz', 'blau'),
      e('💜', 'Lila Herz', 'heart', 'herz', 'lila'),
      e('🖤', 'Schwarzes Herz', 'heart', 'herz', 'schwarz'),
      e('🤍', 'Weißes Herz', 'heart', 'herz', 'weiß'),
      e('💖', 'Funkelndes Herz', 'heart', 'herz', 'sparkle', 'funkeln'),
      e('💕', 'Zwei Herzen', 'hearts', 'herzen', 'liebe'),
      e('💔', 'Gebrochenes Herz', 'brokenheart', 'herz', 'traurig'),
      e('✨', 'Funkeln', 'sparkles', 'funkeln', 'glitzer', 'magic'),
      e('🔥', 'Feuer', 'fire', 'feuer', 'lit', 'heiß'),
      e('💯', 'Hundert', 'hundred', 'perfekt', 'punkte'),
      e('⭐', 'Stern', 'star', 'stern'),
    ],
  },
  {
    id: 'party',
    emoji: [
      e('🎉', 'Konfetti', 'tada', 'party', 'konfetti', 'feiern'),
      e('🎊', 'Konfettiball', 'confetti', 'party', 'feiern'),
      e('🥂', 'Anstoßen', 'cheers', 'prost', 'anstoßen', 'sekt'),
      e('🍾', 'Sektkorken', 'champagne', 'sekt', 'prost', 'feiern'),
      e('🎂', 'Geburtstagstorte', 'cake', 'torte', 'geburtstag', 'birthday'),
      e('🎁', 'Geschenk', 'gift', 'geschenk', 'präsent'),
      e('🎈', 'Luftballon', 'balloon', 'ballon', 'party'),
      e('🪩', 'Discokugel', 'discoball', 'disco', 'party', 'tanzen'),
      e('🎵', 'Musik', 'music', 'musik', 'note'),
      e('🎶', 'Noten', 'music', 'musik', 'noten'),
      e('💃', 'Tänzerin', 'dance', 'tanzen', 'party'),
      e('🕺', 'Tänzer', 'dance', 'tanzen', 'party'),
      e('🎤', 'Mikrofon', 'mic', 'mikrofon', 'karaoke', 'singen'),
      e('🎸', 'Gitarre', 'guitar', 'gitarre', 'musik'),
      e('🪅', 'Piñata', 'pinata', 'party', 'feiern'),
      e('🎆', 'Feuerwerk', 'fireworks', 'feuerwerk', 'silvester'),
    ],
  },
  {
    id: 'food',
    emoji: [
      e('🍕', 'Pizza', 'pizza', 'essen', 'food'),
      e('🍝', 'Pasta', 'pasta', 'spaghetti', 'nudeln', 'essen'),
      e('🍔', 'Burger', 'burger', 'hamburger', 'essen'),
      e('🌮', 'Taco', 'taco', 'essen'),
      e('🥗', 'Salat', 'salad', 'salat', 'gesund'),
      e('🧀', 'Käse', 'cheese', 'käse', 'raclette'),
      e('🥖', 'Baguette', 'bread', 'brot', 'baguette'),
      e('🥨', 'Brezel', 'pretzel', 'brezel', 'brezn'),
      e('🍟', 'Pommes', 'fries', 'pommes'),
      e('🍰', 'Kuchen', 'cake', 'kuchen', 'torte'),
      e('🍪', 'Keks', 'cookie', 'keks', 'plätzchen'),
      e('🍫', 'Schokolade', 'chocolate', 'schoko', 'schokolade'),
      e('🍿', 'Popcorn', 'popcorn', 'kino'),
      e('🥘', 'Pfanne', 'pan', 'pfanne', 'eintopf', 'kochen'),
      e('🍲', 'Eintopf', 'stew', 'eintopf', 'suppe'),
      e('🥩', 'Fleisch', 'meat', 'fleisch', 'steak', 'grillen'),
      e('🌭', 'Hotdog', 'hotdog', 'würstchen', 'grillen'),
      e('🍦', 'Eis', 'icecream', 'eis', 'dessert'),
      e('🍓', 'Erdbeere', 'strawberry', 'erdbeere', 'obst'),
      e('🥑', 'Avocado', 'avocado', 'gesund'),
    ],
  },
  {
    id: 'drink',
    emoji: [
      e('🍻', 'Prost', 'beers', 'prost', 'bier', 'anstoßen'),
      e('🍺', 'Bier', 'beer', 'bier'),
      e('🍷', 'Rotwein', 'wine', 'wein', 'rotwein'),
      e('🥃', 'Whisky', 'whisky', 'schnaps'),
      e('🍸', 'Cocktail', 'cocktail', 'martini', 'drink'),
      e('🍹', 'Longdrink', 'cocktail', 'drink', 'tropisch'),
      e('🧉', 'Mate', 'mate', 'tee'),
      e('☕', 'Kaffee', 'coffee', 'kaffee', 'tee'),
      e('🧊', 'Eiswürfel', 'ice', 'eis', 'kalt'),
      e('🥤', 'Softdrink', 'soda', 'limo', 'getränk'),
      e('🍵', 'Tee', 'tea', 'tee'),
      e('💧', 'Wasser', 'water', 'wasser'),
    ],
  },
  {
    id: 'nature',
    emoji: [
      e('☀️', 'Sonne', 'sun', 'sonne', 'wetter'),
      e('🌤️', 'Leicht bewölkt', 'cloud', 'wolke', 'wetter'),
      e('🌧️', 'Regen', 'rain', 'regen', 'wetter'),
      e('⛈️', 'Gewitter', 'storm', 'gewitter', 'sturm'),
      e('❄️', 'Schnee', 'snow', 'schnee', 'kalt', 'winter'),
      e('🌈', 'Regenbogen', 'rainbow', 'regenbogen'),
      e('🌙', 'Mond', 'moon', 'mond', 'nacht'),
      e('🌱', 'Sprössling', 'plant', 'pflanze', 'grün'),
      e('🌻', 'Sonnenblume', 'sunflower', 'blume', 'sommer'),
      e('🌸', 'Blüte', 'blossom', 'blume', 'frühling'),
      e('🍂', 'Herbstlaub', 'leaves', 'herbst', 'blätter'),
      e('🐶', 'Hund', 'dog', 'hund'),
      e('🐱', 'Katze', 'cat', 'katze'),
      e('🦋', 'Schmetterling', 'butterfly', 'schmetterling'),
    ],
  },
  {
    id: 'objects',
    emoji: [
      e('📸', 'Kamera', 'camera', 'kamera', 'foto'),
      e('🎬', 'Klappe', 'clapper', 'film', 'video'),
      e('⏰', 'Wecker', 'alarm', 'uhr', 'zeit'),
      e('📍', 'Ort', 'pin', 'ort', 'location', 'adresse'),
      e('🗓️', 'Kalender', 'calendar', 'kalender', 'datum', 'termin'),
      e('✅', 'Erledigt', 'check', 'haken', 'fertig', 'done'),
      e('❌', 'Nein', 'cross', 'nein', 'falsch'),
      e('⚠️', 'Achtung', 'warning', 'achtung', 'warnung'),
      e('❓', 'Frage', 'question', 'frage'),
      e('❗', 'Ausrufezeichen', 'exclamation', 'wichtig'),
      e('💡', 'Idee', 'idea', 'idee', 'licht'),
      e('🔑', 'Schlüssel', 'key', 'schlüssel'),
      e('🚗', 'Auto', 'car', 'auto', 'fahren'),
      e('🚲', 'Fahrrad', 'bike', 'fahrrad', 'rad'),
      e('🚕', 'Taxi', 'taxi'),
      e('🏠', 'Zuhause', 'home', 'haus', 'zuhause'),
      e('💸', 'Geld', 'money', 'geld', 'kosten'),
      e('📱', 'Handy', 'phone', 'handy', 'telefon'),
    ],
  },
]

const ALL_EMOJI: Emoji[] = EMOJI_GROUPS.flatMap((group) => group.emoji)

/** Substring match over name + keywords; the emoji character itself also matches. */
export function searchEmoji(query: string): Emoji[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return ALL_EMOJI.filter(
    (entry) =>
      entry.char === needle ||
      entry.name.toLowerCase().includes(needle) ||
      entry.keywords.some((keyword) => keyword.includes(needle)),
  )
}

const ALLOWED = new Set(ALL_EMOJI.map((entry) => entry.char))

/**
 * Reactions are restricted to the curated set. Accepting arbitrary input would
 * mean storing whatever a crafted request sends — the picker is the only way in,
 * so the server checks against the same list it offers.
 */
export function isAllowedReaction(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED.has(value)
}

// One British voice, chosen the same way every launch.
//
// `speechSynthesis.getVoices()` is not a stable list: iOS returns it in a
// different order between launches (and re-orders it again after a language
// change), and the set of installed voices differs per device. The old rule —
// "the first en-GB voice in the list" — therefore drifted, so a team heard a
// different narrator each time they opened the app, which reads as a fault in
// the middle of an emergency.
//
// This function is pure and order-independent: given the same SET of voices it
// always returns the same one, whatever order they arrive in.

/**
 * British voices in preference order, by exact name. Apple's own en-GB voices
 * first (they are the ones a dental practice's iPhone will actually have),
 * then Chrome desktop, then the Edge/Windows natural voices.
 */
const PREFERRED_NAMES = [
  'Daniel',
  'Kate',
  'Serena',
  'Arthur',
  'Martha',
  'Oliver',
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Microsoft Libby Online (Natural) - English (United Kingdom)',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
] as const;

/** BCP-47-ish, lowercased, with Android's `en_GB` underscore normalised. */
const normaliseLang = (lang: string | undefined): string =>
  (lang ?? '').replace(/_/g, '-').toLowerCase();

const isBritish = (voice: SpeechSynthesisVoice): boolean =>
  normaliseLang(voice.lang).startsWith('en-gb');

const isEnglish = (voice: SpeechSynthesisVoice): boolean => {
  const lang = normaliseLang(voice.lang);
  return lang === 'en' || lang.startsWith('en-');
};

/**
 * iOS appends a quality suffix to the same voice: "Daniel", "Daniel
 * (Enhanced)", "Daniel (Premium)". All three are Daniel; the suffixed ones are
 * the better downloads, so they win.
 */
const matchesName = (voice: SpeechSynthesisVoice, candidate: string): boolean =>
  voice.name === candidate || voice.name.startsWith(`${candidate} `);

const isUpgraded = (voice: SpeechSynthesisVoice): boolean =>
  /\((?:enhanced|premium)\)/i.test(voice.name);

/** Code-unit order — deterministic, and not locale-dependent like localeCompare. */
const byName = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice): number =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

/** Upgraded (Enhanced/Premium) variants first, then alphabetical. */
const byQualityThenName = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice): number => {
  const quality = Number(isUpgraded(b)) - Number(isUpgraded(a));
  return quality !== 0 ? quality : byName(a, b);
};

/**
 * Pick the voice ResusIQ narrates with. Deterministic for a given set of
 * voices, regardless of the order the platform hands them over in.
 *
 * Order: a named en-GB voice (best quality variant of that name) → any other
 * en-GB voice → any English voice → null. The two fallback tiers sort by
 * QUALITY THEN NAME, not alphabetically: an Enhanced/Premium download beats a
 * compact voice of a different name, and the name is only the tie-break that
 * keeps the result order-independent. Never a non-English voice, and never
 * en-US while an en-GB exists.
 */
export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const british = voices.filter(isBritish);

  for (const candidate of PREFERRED_NAMES) {
    const matches = british.filter((voice) => matchesName(voice, candidate));
    if (matches.length > 0) return matches.sort(byQualityThenName)[0];
  }

  if (british.length > 0) return [...british].sort(byQualityThenName)[0];

  const english = voices.filter(isEnglish);
  if (english.length > 0) return [...english].sort(byQualityThenName)[0];

  // Better silent-default than a Polish voice reading "adrenaline 500
  // micrograms" — the caller falls back to `lang = 'en-GB'` alone.
  return null;
}

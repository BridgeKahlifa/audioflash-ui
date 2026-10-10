// Android TTS voice selection. Kept free of React Native imports so it can be unit tested.

export type SpeechVoiceInfo = {
  identifier: string;
  language: string;
  // Only reported by the patched Android expo-speech module (scripts/patch-expo-speech.cjs).
  installed?: boolean;
  requiresNetwork?: boolean;
};

// Engines report Cantonese under zh-HK / zh-MO; never substitute it for Mandarin.
const CANTONESE_REGIONS = new Set(["hk", "mo"]);

export function normalizeLocale(locale: string): string {
  return locale.replace(/_/g, "-").toLowerCase();
}

function localeParts(locale: string): { base: string; region: string | null } {
  const [base, ...rest] = normalizeLocale(locale).split("-");
  return { base, region: rest.find((part) => part.length === 2) ?? null };
}

/** Key for "let the engine pick its default voice for this locale". */
export function defaultVoiceKey(locale: string): string {
  return `default:${normalizeLocale(locale)}`;
}

/** Voices that can speak the locale's language and have their data on the device. */
export function usableVoicesForLocale(
  voices: readonly SpeechVoiceInfo[],
  locale: string,
): SpeechVoiceInfo[] {
  const requested = localeParts(locale);
  return voices.filter((voice) => {
    const candidate = localeParts(voice.language);
    if (candidate.base !== requested.base || voice.installed === false) return false;
    if (
      requested.base === "zh" &&
      candidate.region !== requested.region &&
      candidate.region !== null &&
      CANTONESE_REGIONS.has(candidate.region)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Picks the voice to request for a locale. Returns undefined to let the engine use its
 * default voice for the locale, which is what happens whenever the device has a voice for
 * exactly that locale. Otherwise returns another installed voice of the same language
 * (e.g. es-US when es-ES is requested), skipping anything that already failed to start.
 */
export function selectSpeechVoice(
  voices: readonly SpeechVoiceInfo[],
  locale: string,
  failedKeys: ReadonlySet<string> = new Set(),
): string | undefined {
  const requested = normalizeLocale(locale);
  const candidates = usableVoicesForLocale(voices, locale).filter(
    (voice) => !failedKeys.has(voice.identifier),
  );
  const isExact = (voice: SpeechVoiceInfo) => normalizeLocale(voice.language) === requested;

  if (candidates.some(isExact) && !failedKeys.has(defaultVoiceKey(locale))) return undefined;

  const rank = (voice: SpeechVoiceInfo) =>
    (isExact(voice) ? 0 : 2) + (voice.requiresNetwork ? 1 : 0);
  return [...candidates].sort((a, b) => rank(a) - rank(b))[0]?.identifier;
}

/** Compact summary of every voice of the locale's language, for diagnostics. */
export function describeVoicesForLocale(
  voices: readonly SpeechVoiceInfo[],
  locale: string,
  limit = 12,
): string {
  const { base } = localeParts(locale);
  return voices
    .filter((voice) => localeParts(voice.language).base === base)
    .slice(0, limit)
    .map((voice) =>
      [
        voice.identifier,
        voice.language,
        voice.installed === false ? "not_installed" : "installed",
        voice.requiresNetwork ? "network" : "local",
      ].join("|"),
    )
    .join(", ");
}

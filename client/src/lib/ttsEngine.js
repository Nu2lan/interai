/**
 * TTS Engine — Browser SpeechSynthesis wrapper with multilingual support.
 * Azerbaijani falls back to Turkish voices when native az voice isn't available.
 */

// Language code → BCP 47 tags to search for
const LANG_VOICE_MAP = {
  az: ['az-AZ', 'az', 'tr-TR', 'tr'], // Azerbaijani, fallback to Turkish
  en: ['en-US', 'en-GB', 'en'],
  ru: ['ru-RU', 'ru'],
  tr: ['tr-TR', 'tr'],
  de: ['de-DE', 'de'],
  fr: ['fr-FR', 'fr'],
  es: ['es-ES', 'es'],
  ar: ['ar-SA', 'ar'],
  fa: ['fa-IR', 'fa'],
  zh: ['zh-CN', 'zh'],
  ja: ['ja-JP', 'ja'],
  ko: ['ko-KR', 'ko'],
};

let cachedVoices = [];

/**
 * Load available voices (may require waiting for voiceschanged event).
 */
function loadVoices() {
  return new Promise((resolve) => {
    cachedVoices = speechSynthesis.getVoices();
    if (cachedVoices.length > 0) {
      resolve(cachedVoices);
      return;
    }
    speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoices = speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, { once: true });
  });
}

/**
 * Find the best matching voice for a language.
 * @param {string} langCode - ISO 639-1 code (e.g., "az", "en")
 * @returns {SpeechSynthesisVoice|null}
 */
function findVoice(langCode) {
  const tags = LANG_VOICE_MAP[langCode] || [langCode];

  for (const tag of tags) {
    // Exact match first
    const exact = cachedVoices.find(v => 
      v.lang.toLowerCase() === tag.toLowerCase()
    );
    if (exact) return exact;

    // Prefix match
    const prefix = cachedVoices.find(v =>
      v.lang.toLowerCase().startsWith(tag.toLowerCase())
    );
    if (prefix) return prefix;
  }

  // Fallback to first available
  return cachedVoices[0] || null;
}

/**
 * Speak text in the given language using browser TTS.
 * @param {string} text - Text to speak
 * @param {string} language - Language code (e.g., "az", "en")
 * @returns {Promise<void>}
 */
export async function speak(text, language = 'en') {
  if (!('speechSynthesis' in window)) {
    console.warn('[TTS] SpeechSynthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  // Ensure voices are loaded
  if (cachedVoices.length === 0) {
    await loadVoices();
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = findVoice(language);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = language;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = resolve;
    utterance.onerror = () => resolve();

    speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing TTS playback.
 */
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * Check if TTS is currently speaking.
 * @returns {boolean}
 */
export function isSpeaking() {
  return 'speechSynthesis' in window && speechSynthesis.speaking;
}

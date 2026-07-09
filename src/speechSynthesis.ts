import type { LanguageKey } from './content'

type SpeakOptions = {
  language: LanguageKey
  onEnd?: () => void
  onError?: () => void
  onStart?: () => void
}

const LANGUAGE_BY_KEY: Record<LanguageKey, string> = {
  en: 'en-IN',
  hinglish: 'hi-IN',
}

let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null

function getSpeechSynthesis() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  return window.speechSynthesis
}

export function getSpeechSynthesisLanguage(language: LanguageKey) {
  return LANGUAGE_BY_KEY[language]
}

export function isSpeechSynthesisSupported() {
  return Boolean(getSpeechSynthesis() && typeof SpeechSynthesisUtterance !== 'undefined')
}

export function cancelSpeechSynthesis() {
  getSpeechSynthesis()?.cancel()
}

function normalizeLanguage(language: string) {
  return language.toLowerCase()
}

function chooseVoice(voices: SpeechSynthesisVoice[], language: LanguageKey) {
  const preferredLanguage = normalizeLanguage(getSpeechSynthesisLanguage(language))
  const fallbackLanguage = language === 'en' ? 'en-us' : 'hi'

  return (
    voices.find((voice) => normalizeLanguage(voice.lang) === preferredLanguage) ??
    voices.find((voice) => normalizeLanguage(voice.lang).startsWith(preferredLanguage.slice(0, 2))) ??
    voices.find((voice) => normalizeLanguage(voice.lang).startsWith(fallbackLanguage)) ??
    null
  )
}

export function loadSpeechVoices() {
  const synthesis = getSpeechSynthesis()
  if (!synthesis) return Promise.resolve([])

  const voices = synthesis.getVoices()
  if (voices.length > 0) return Promise.resolve(voices)
  if (voicesReadyPromise) return voicesReadyPromise

  const activeSynthesis = synthesis
  voicesReadyPromise = new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      activeSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(activeSynthesis.getVoices())
    }, 700)

    function handleVoicesChanged() {
      window.clearTimeout(timeout)
      activeSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(activeSynthesis.getVoices())
    }

    activeSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
  })

  return voicesReadyPromise
}

export function primeSpeechSynthesis(language: LanguageKey) {
  const synthesis = getSpeechSynthesis()
  if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') return false

  try {
    synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(' ')
    utterance.lang = getSpeechSynthesisLanguage(language)
    utterance.volume = 0
    synthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}

export async function speakUtterance(text: string, options: SpeakOptions) {
  const synthesis = getSpeechSynthesis()
  if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
    options.onError?.()
    return false
  }

  try {
    const voices = await loadSpeechVoices()
    synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = getSpeechSynthesisLanguage(options.language)
    utterance.voice = chooseVoice(voices, options.language)
    utterance.rate = options.language === 'en' ? 0.94 : 0.9
    utterance.pitch = 0.95

    utterance.onstart = () => options.onStart?.()
    utterance.onend = () => options.onEnd?.()
    utterance.onerror = () => options.onError?.()

    synthesis.speak(utterance)
    return true
  } catch {
    options.onError?.()
    return false
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LanguageKey } from './content'

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed'

type SpeechRecognitionEvent = Event & {
  resultIndex: number
  results: SpeechRecognitionResultList
}

type SpeechRecognitionErrorEvent = Event & {
  error: SpeechRecognitionErrorCode | string
  message?: string
}

type SpeechRecognitionConstructor = new () => SpeechRecognition

type SpeechRecognition = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onend: ((event: Event) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onstart: ((event: Event) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export type SpeechStatus =
  | 'unsupported'
  | 'idle'
  | 'listening'
  | 'processing'
  | 'complete'
  | 'error'

export type SpeechErrorKind =
  | 'unsupported'
  | 'permission-denied'
  | 'no-speech'
  | 'network'
  | 'audio-capture'
  | 'aborted'
  | 'language'
  | 'service'
  | 'unknown'

export type SpeechError = {
  kind: SpeechErrorKind
  code: string
  message: string
  canRetry: boolean
  shouldUseTypedFallback: boolean
}

type UseSpeechRecognitionOptions = {
  language: LanguageKey
  continuous?: boolean
  initialSilenceTimeoutMs?: number
  endOfSpeechTimeoutMs?: number
  autoStopOnFinal?: boolean
}

type StartOptions = {
  resetTranscript?: boolean
}

const LANGUAGE_BY_KEY: Record<LanguageKey, string> = {
  en: 'en-IN',
  hinglish: 'hi-IN',
}

function getSpeechConstructor() {
  if (typeof window === 'undefined') {
    return undefined
  }

  const speechWindow = window as SpeechWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

function getErrorDetails(code: string): SpeechError {
  switch (code) {
    case 'not-allowed':
      return {
        kind: 'permission-denied',
        code,
        message: 'Microphone permission was denied.',
        canRetry: true,
        shouldUseTypedFallback: true,
      }
    case 'service-not-allowed':
      return {
        kind: 'service',
        code,
        message: 'Speech recognition service is not allowed in this browser.',
        canRetry: false,
        shouldUseTypedFallback: true,
      }
    case 'no-speech':
      return {
        kind: 'no-speech',
        code,
        message: "I didn't catch that. Please try again.",
        canRetry: true,
        shouldUseTypedFallback: true,
      }
    case 'audio-capture':
      return {
        kind: 'audio-capture',
        code,
        message: 'No microphone was found or it could not be started.',
        canRetry: true,
        shouldUseTypedFallback: true,
      }
    case 'network':
      return {
        kind: 'network',
        code,
        message: 'Speech recognition had a network problem.',
        canRetry: true,
        shouldUseTypedFallback: true,
      }
    case 'aborted':
      return {
        kind: 'aborted',
        code,
        message: 'Speech recognition was stopped.',
        canRetry: true,
        shouldUseTypedFallback: false,
      }
    case 'bad-grammar':
      return {
        kind: 'unknown',
        code,
        message: 'Speech recognition could not use its grammar settings.',
        canRetry: true,
        shouldUseTypedFallback: true,
      }
    case 'language-not-supported':
      return {
        kind: 'language',
        code,
        message: 'This speech recognition language is not supported here.',
        canRetry: true,
        shouldUseTypedFallback: true,
      }
    default:
      return {
        kind: 'unknown',
        code,
        message: 'Speech recognition hit an unexpected problem.',
        canRetry: true,
        shouldUseTypedFallback: true,
      }
  }
}

export function getRecognitionLanguage(language: LanguageKey) {
  return LANGUAGE_BY_KEY[language]
}

const DEFAULT_END_OF_SPEECH_TIMEOUT_MS = 1500

export function useSpeechRecognition({
  language,
  continuous = false,
  initialSilenceTimeoutMs = 9000,
  endOfSpeechTimeoutMs = DEFAULT_END_OF_SPEECH_TIMEOUT_MS,
  autoStopOnFinal = true,
}: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimerRef = useRef<number | null>(null)
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')
  const lastErrorRef = useRef<SpeechError | null>(null)
  const requestedStopRef = useRef(false)
  const heardSpeechRef = useRef(false)
  const [isSupported, setIsSupported] = useState(() => Boolean(getSpeechConstructor()))
  const [status, setStatus] = useState<SpeechStatus>(() =>
    getSpeechConstructor() ? 'idle' : 'unsupported',
  )
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [lastError, setLastError] = useState<SpeechError | null>(() =>
    getSpeechConstructor()
      ? null
      : {
          kind: 'unsupported',
          code: 'unsupported',
          message: 'This browser does not support SpeechRecognition.',
          canRetry: false,
          shouldUseTypedFallback: true,
        },
  )

  useEffect(() => {
    lastErrorRef.current = lastError
  }, [lastError])

  const recognitionLanguage = useMemo(() => getRecognitionLanguage(language), [language])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    requestedStopRef.current = true
    clearSilenceTimer()
    recognitionRef.current?.stop()
    setStatus((current) => (current === 'listening' ? 'processing' : current))
  }, [clearSilenceTimer])

  const reset = useCallback(() => {
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    heardSpeechRef.current = false
    setInterimTranscript('')
    setFinalTranscript('')
    setLastError(null)
    setStatus(isSupported ? 'idle' : 'unsupported')
  }, [isSupported])

  const start = useCallback(
    ({ resetTranscript = true }: StartOptions = {}) => {
      const Recognition = getSpeechConstructor()
      if (!Recognition) {
        setIsSupported(false)
        setStatus('unsupported')
        setLastError({
          kind: 'unsupported',
          code: 'unsupported',
          message: 'This browser does not support SpeechRecognition.',
          canRetry: false,
          shouldUseTypedFallback: true,
        })
        return false
      }

      clearSilenceTimer()
      recognitionRef.current?.abort()
      requestedStopRef.current = false

      if (resetTranscript) {
        finalTranscriptRef.current = ''
        interimTranscriptRef.current = ''
        heardSpeechRef.current = false
        setFinalTranscript('')
        setInterimTranscript('')
      }

      const recognition = new Recognition()
      recognition.continuous = continuous
      recognition.interimResults = true
      recognition.lang = recognitionLanguage
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsSupported(true)
        setStatus('listening')
        setLastError(null)
        silenceTimerRef.current = window.setTimeout(() => {
          setLastError(getErrorDetails('no-speech'))
          requestedStopRef.current = true
          recognition.stop()
        }, initialSilenceTimeoutMs)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        clearSilenceTimer()
        let interim = ''
        let committed = ''

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          const transcript = result[0]?.transcript ?? ''
          if (result.isFinal) {
            committed += transcript
          } else {
            interim += transcript
          }
        }

        if (committed.trim()) {
          heardSpeechRef.current = true
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${committed}`.trim()
          setFinalTranscript(finalTranscriptRef.current)
        }

        if (interim.trim()) {
          heardSpeechRef.current = true
        }

        interimTranscriptRef.current = interim.trim()
        setInterimTranscript(interim.trim())

        if (autoStopOnFinal && finalTranscriptRef.current.trim()) {
          requestedStopRef.current = true
          recognition.stop()
        } else {
          silenceTimerRef.current = window.setTimeout(() => {
            requestedStopRef.current = true
            recognition.stop()
          }, heardSpeechRef.current ? endOfSpeechTimeoutMs : initialSilenceTimeoutMs)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        clearSilenceTimer()
        const details = getErrorDetails(event.error)
        setLastError(event.message ? { ...details, message: event.message } : details)
        setStatus('error')
        if (event.error === 'language-not-supported' && language === 'en') {
          recognition.lang = 'en-US'
        }
      }

      recognition.onend = () => {
        clearSilenceTimer()
        recognitionRef.current = null
        const bestTranscript = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim()
        if (bestTranscript) {
          finalTranscriptRef.current = bestTranscript
          setFinalTranscript(bestTranscript)
          setInterimTranscript('')
          interimTranscriptRef.current = ''
          setStatus('complete')
          return
        }
        if (lastErrorRef.current || requestedStopRef.current) {
          setStatus((current) => (current === 'processing' ? 'idle' : current))
          return
        }
        setLastError(getErrorDetails('no-speech'))
        setStatus('error')
      }

      recognitionRef.current = recognition

      try {
        recognition.start()
        return true
      } catch {
        recognitionRef.current = null
        setLastError(getErrorDetails('aborted'))
        setStatus('error')
        return false
      }
    },
    [
      autoStopOnFinal,
      clearSilenceTimer,
      continuous,
      endOfSpeechTimeoutMs,
      initialSilenceTimeoutMs,
      language,
      recognitionLanguage,
    ],
  )

  useEffect(() => {
    return () => {
      clearSilenceTimer()
      recognitionRef.current?.abort()
    }
  }, [clearSilenceTimer])

  useEffect(() => {
    if (status === 'listening') {
      stop()
    }
  }, [language])

  return {
    finalTranscript,
    interimTranscript,
    isListening: status === 'listening',
    isSupported,
    lastError,
    recognitionLanguage,
    reset,
    start,
    status,
    stop,
    transcript: `${finalTranscript} ${interimTranscript}`.trim(),
  }
}

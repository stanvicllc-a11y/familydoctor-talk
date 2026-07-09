import { ArrowLeft, Languages, PhoneCall, ShieldCheck, Volume2 } from 'lucide-react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import './App.css'
import { content, type LanguageKey } from './content'
import { createEmptyIntake, INTAKE_FIELD_KEYS, withIntakeAnswer } from './intake'
import type { IntakeAnswerSource, IntakeData, IntakeFieldKey } from './intake'
import {
  cancelSpeechSynthesis,
  primeSpeechSynthesis,
  speakUtterance,
} from './speechSynthesis'
import { useSpeechRecognition } from './useSpeechRecognition'

type SelfViewStatus = 'loading' | 'ready' | 'blocked'
type FlowPhase = 'speaking' | 'listening' | 'summary' | 'prescription' | 'download'

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

function playPlaceholderTone() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return

  try {
    const audio = new AudioContextClass()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.frequency.value = 620
    gain.gain.value = 0.035
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + 0.1)
    window.setTimeout(() => void audio.close(), 180)
  } catch {
    // Browser audio may wait for a user gesture; the visual flow still continues.
  }
}

const KEYWORD_PATTERNS: Array<{
  label: Record<LanguageKey, string>
  terms: string[]
}> = [
  { label: { en: 'fever', hinglish: 'fever' }, terms: ['fever', 'temperature', 'bukhar'] },
  { label: { en: 'cough', hinglish: 'cough' }, terms: ['cough', 'khansi'] },
  { label: { en: 'pain', hinglish: 'pain' }, terms: ['pain', 'ache', 'dard'] },
  { label: { en: 'breathing', hinglish: 'breathing' }, terms: ['breath', 'breathing', 'saans'] },
  { label: { en: 'vomiting', hinglish: 'vomiting' }, terms: ['vomit', 'vomiting', 'ulti'] },
  { label: { en: 'headache', hinglish: 'headache' }, terms: ['headache', 'sir dard'] },
  { label: { en: 'allergy', hinglish: 'allergy' }, terms: ['allergy', 'allergic'] },
  { label: { en: 'medicine', hinglish: 'medicine' }, terms: ['medicine', 'medication', 'tablet', 'dawai'] },
]

function buildKeywordReflection(answer: string, language: LanguageKey, fallback: string) {
  const normalizedAnswer = answer.toLowerCase()
  const keywords = KEYWORD_PATTERNS.filter((item) =>
    item.terms.some((term) => normalizedAnswer.includes(term)),
  )
    .map((item) => item.label[language])
    .slice(0, 3)

  if (keywords.length === 0) return fallback

  const keywordText = keywords.join(', ')
  return language === 'en'
    ? `I am noting the ${keywordText} part and keeping the full picture together.`
    : `Main ${keywordText} wali baat note kar raha hoon aur full picture saath mein rakh raha hoon.`
}

function inferEditField(editText: string): IntakeFieldKey | null {
  const normalizedText = editText.toLowerCase()
  const matches = (terms: string[]) => terms.some((term) => normalizedText.includes(term))

  if (matches(['allerg', 'allergy'])) return 'allergies'
  if (matches(['medicine', 'medication', 'tablet', 'dawai', 'supplement'])) return 'currentMedications'
  if (matches(['started', 'since', 'duration', 'kab se', 'worse', 'better'])) return 'duration'
  if (matches(['severe', 'severity', 'bad', 'impact'])) return 'severity'
  if (matches(['fever', 'cough', 'pain', 'vomit', 'breath', 'symptom', 'dard'])) {
    return 'associatedSymptoms'
  }
  if (matches(['tried', 'remedy', 'home', 'took', 'liya'])) return 'triedRemedies'
  if (matches(['travel', 'food', 'khaya'])) return 'recentTravel'
  if (matches(['sick', 'contact', 'around', 'aas-paas'])) return 'sickContacts'
  if (matches(['history', 'condition', 'surgery'])) return 'pastHistory'
  if (matches(['main', 'problem', 'complaint'])) return 'chiefComplaint'

  return null
}

function SelfView({ language }: { language: LanguageKey }) {
  const copy = content[language].talk
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<SelfViewStatus>('loading')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('blocked')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraStream(stream)
        setStatus('ready')
      } catch {
        setStatus('blocked')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const width = window.innerWidth
    const height = window.innerHeight
    const box = shellRef.current?.getBoundingClientRect()
    const boxWidth = box?.width ?? 120
    const boxHeight = box?.height ?? 168
    setPosition({
      x: Math.min(Math.max(8, event.clientX - dragOffset.current.x), width - boxWidth - 8),
      y: Math.min(Math.max(70, event.clientY - dragOffset.current.y), height - boxHeight - 8),
    })
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    setDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const hasCustomPosition = position.x !== 0 || position.y !== 0

  return (
    <div
      ref={shellRef}
      className={`self-view ${dragging ? 'dragging' : ''}`}
      data-testid="self-view"
      style={
        hasCustomPosition
          ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto' }
          : undefined
      }
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="self-view-video">
        {status === 'ready' ? (
          <video ref={videoRef} autoPlay muted playsInline aria-label="Local camera preview" />
        ) : (
          <div className="camera-fallback" role="status">
            <span>{status === 'loading' ? copy.cameraOff : copy.cameraDenied}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TalkShell({
  language,
  onBack,
}: {
  language: LanguageKey
  onBack: () => void
}) {
  const copy = content[language].talk
  const [phase, setPhase] = useState<FlowPhase>('speaking')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [useTypedFallback, setUseTypedFallback] = useState(false)
  const [intakeData, setIntakeData] = useState<IntakeData>(() => createEmptyIntake(language))
  const [reflectionText, setReflectionText] = useState('')
  const [summaryEditDraft, setSummaryEditDraft] = useState('')
  const [summaryUseTypedFallback, setSummaryUseTypedFallback] = useState(false)
  const [openEditNote, setOpenEditNote] = useState('')
  const [summaryEditMessage, setSummaryEditMessage] = useState('')
  const speech = useSpeechRecognition({
    language,
    continuous: true,
    initialSilenceTimeoutMs: 8500,
    endOfSpeechTimeoutMs: 2100,
    autoStopOnFinal: false,
  })
  const activeQuestion = copy.questions[questionIndex]
  const activeField = activeQuestion.field
  const totalQuestions = copy.questions.length
  const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100)
  const captureTokenRef = useRef('')
  const hiddenTranscriptRef = useRef<string[]>([])
  const summarySpokenRef = useRef(false)
  const summaryEditAttemptRef = useRef(false)
  const summaryEditTokenRef = useRef('')

  useEffect(() => {
    setIntakeData(createEmptyIntake(language))
    setQuestionIndex(0)
    setTypedAnswer('')
    setUseTypedFallback(false)
    setReflectionText('')
    setSummaryEditDraft('')
    setSummaryUseTypedFallback(false)
    setOpenEditNote('')
    setSummaryEditMessage('')
    hiddenTranscriptRef.current = []
    summarySpokenRef.current = false
    summaryEditAttemptRef.current = false
    summaryEditTokenRef.current = ''
    setPhase('speaking')
    captureTokenRef.current = ''
    speech.reset()
  }, [language])

  function beginListening() {
    setPhase('listening')
    const started = speech.start()
    if (!started) {
      setUseTypedFallback(true)
    }
  }

  useEffect(() => {
    if (phase !== 'speaking') return

    setTypedAnswer('')
    setUseTypedFallback(false)
    captureTokenRef.current = ''
    speech.stop()
    speech.reset()
    playPlaceholderTone()

    let cancelled = false

    void speakUtterance(activeQuestion.text, {
      language,
      onEnd: () => {
        if (!cancelled) {
          beginListening()
        }
      },
      onError: () => {
        if (!cancelled) {
          beginListening()
        }
      },
    }).then((dispatched) => {
      if (!dispatched && !cancelled) {
        beginListening()
      }
    })

    return () => {
      cancelled = true
    }
  }, [phase, questionIndex, activeQuestion.text, language])

  useEffect(() => {
    if (phase !== 'listening') return
    if (speech.status === 'complete' && speech.transcript.trim()) {
      captureAnswer(speech.transcript, 'speech')
      return
    }
    if (
      speech.status === 'unsupported' ||
      speech.lastError?.shouldUseTypedFallback ||
      speech.status === 'error'
    ) {
      setUseTypedFallback(true)
    }
  }, [phase, speech.status, speech.transcript, speech.lastError])

  useEffect(() => {
    if (phase !== 'summary') return

    if (!summarySpokenRef.current) {
      summarySpokenRef.current = true
      void speakUtterance(copy.closingSpoken, { language })
    }

    if (summaryEditAttemptRef.current || summaryEditMessage) return

    summaryEditAttemptRef.current = true
    setSummaryUseTypedFallback(false)
    speech.reset()

    const timer = window.setTimeout(() => {
      const started = speech.start()
      if (!started) {
        setSummaryUseTypedFallback(true)
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [phase, summaryEditMessage, language, copy.closingSpoken])

  useEffect(() => {
    if (phase !== 'summary' || summaryEditMessage) return
    if (speech.status === 'complete' && speech.transcript.trim()) {
      applySummaryEdit(speech.transcript, 'speech')
      return
    }
    if (
      speech.status === 'unsupported' ||
      speech.lastError?.shouldUseTypedFallback ||
      speech.status === 'error'
    ) {
      setSummaryUseTypedFallback(true)
    }
  }, [phase, summaryEditMessage, speech.status, speech.transcript, speech.lastError])

  function captureAnswer(rawAnswer: string, source: IntakeAnswerSource) {
    const answer = rawAnswer.trim()
    if (!answer) return

    const captureToken = `${activeField}:${source}:${answer}`
    if (captureTokenRef.current === captureToken) return
    captureTokenRef.current = captureToken

    speech.stop()
    hiddenTranscriptRef.current = [
      ...hiddenTranscriptRef.current,
      `Doctor: ${activeQuestion.text}\nPatient: ${answer}`,
    ]
    setReflectionText(buildKeywordReflection(answer, language, copy.reflectionDefault))
    setIntakeData((current) => withIntakeAnswer(current, activeField, answer, source))
    setTypedAnswer('')
    setUseTypedFallback(false)
    speech.reset()

    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex((current) => current + 1)
      setPhase('speaking')
      return
    }

    summaryEditAttemptRef.current = false
    setPhase('summary')
  }

  function applySummaryEdit(rawEdit: string, source: IntakeAnswerSource) {
    const edit = rawEdit.trim()
    if (!edit) return

    const editToken = `${source}:${edit}`
    if (summaryEditTokenRef.current === editToken) return
    summaryEditTokenRef.current = editToken

    speech.stop()
    hiddenTranscriptRef.current = [
      ...hiddenTranscriptRef.current,
      `Patient ${source} edit: ${edit}`,
    ]

    const field = inferEditField(edit)
    if (field) {
      setIntakeData((current) => withIntakeAnswer(current, field, edit, source))
      setSummaryEditMessage(copy.editApplied)
    } else {
      setOpenEditNote(edit)
      setSummaryEditMessage(copy.editNoted)
    }

    setSummaryUseTypedFallback(false)
    setSummaryEditDraft('')
    speech.reset()
  }

  function submitTypedAnswer() {
    captureAnswer(typedAnswer, 'typed')
  }

  function restartScript() {
    setQuestionIndex(0)
    setIntakeData(createEmptyIntake(language))
    setTypedAnswer('')
    setUseTypedFallback(false)
    setReflectionText('')
    setSummaryEditDraft('')
    setSummaryUseTypedFallback(false)
    setOpenEditNote('')
    setSummaryEditMessage('')
    hiddenTranscriptRef.current = []
    summarySpokenRef.current = false
    summaryEditAttemptRef.current = false
    summaryEditTokenRef.current = ''
    captureTokenRef.current = ''
    speech.reset()
    cancelSpeechSynthesis()
    setPhase('speaking')
  }

  function renderConversationContent() {
    if (phase === 'summary') {
      return (
        <>
          <p className="eyebrow">{copy.summaryTitle}</p>
          <h2 id="talk-title">{copy.summaryTitle}</h2>
          <p>{copy.closingSpoken}</p>
          <div className="summary-manuscript" data-testid="intake-summary">
            {INTAKE_FIELD_KEYS.map((field, fieldIndex) => {
              const answer = intakeData.answers[field]
              return (
                <article
                  className="summary-line"
                  key={field}
                  style={{ animationDelay: `${fieldIndex * 95}ms` }}
                >
                  <strong>{copy.fieldLabels[field]}</strong>
                  <p>{answer.value || copy.missingAnswer}</p>
                </article>
              )
            })}
            {openEditNote ? (
              <article
                className="summary-line"
                style={{ animationDelay: `${INTAKE_FIELD_KEYS.length * 95}ms` }}
              >
                <strong>{copy.openEditLabel}</strong>
                <p>{openEditNote}</p>
              </article>
            ) : null}
          </div>
          <section className="summary-edit" aria-label={copy.summaryInvitation}>
            <p>{summaryEditMessage || copy.summaryInvitation}</p>
            {!summaryEditMessage ? (
              <>
                <p className="listening-status">
                  {summaryUseTypedFallback
                    ? speech.lastError?.message || copy.fallbackBody
                    : copy.summaryListeningStatus}
                </p>
                {!summaryUseTypedFallback ? (
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => {
                      speech.stop()
                      setSummaryUseTypedFallback(true)
                    }}
                  >
                    {copy.summaryTypeInstead}
                  </button>
                ) : null}
                {summaryUseTypedFallback ? (
                  <div className="typed-fallback">
                    <textarea
                      value={summaryEditDraft}
                      onChange={(event) => setSummaryEditDraft(event.target.value)}
                      placeholder={copy.editPlaceholder}
                      rows={3}
                    />
                    <button
                      type="button"
                      className="primary-action compact"
                      onClick={() => applySummaryEdit(summaryEditDraft, 'typed')}
                      disabled={!summaryEditDraft.trim()}
                    >
                      {copy.applyEdit}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
          <p className="answer-count">
            {Object.values(intakeData.answers).filter((answer) => answer.value).length}/
            {totalQuestions}
          </p>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => setPhase('prescription')}
          >
            {copy.nextQuestion}
          </button>
        </>
      )
    }

    if (phase === 'prescription') {
      return (
        <>
          <p className="eyebrow">{copy.prescriptionTitle}</p>
          <h2 id="talk-title">{copy.prescriptionTitle}</h2>
          <p>{copy.prescriptionBody}</p>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => setPhase('download')}
          >
            {copy.nextQuestion}
          </button>
        </>
      )
    }

    if (phase === 'download') {
      const fileText = encodeURIComponent(
        `TheFamilyDoctor.AI Talk placeholder\n\nLanguage: ${language}\nQuestions walked: ${totalQuestions}\n\nNo patient data was recorded or uploaded.`,
      )

      return (
        <>
          <p className="eyebrow">{copy.downloadTitle}</p>
          <h2 id="talk-title">{copy.downloadTitle}</h2>
          <p>{copy.downloadBody}</p>
          <div className="download-actions">
            <a
              className="primary-action compact"
              href={`data:text/plain;charset=utf-8,${fileText}`}
              download="talk-placeholder.txt"
            >
              {copy.downloadCta}
            </a>
            <button type="button" className="secondary-action" onClick={restartScript}>
              {copy.restart}
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="flow-topline">
          <span>{phase === 'speaking' ? copy.askingLabel : copy.answeringLabel}</span>
          <span>
            {questionIndex + 1}/{totalQuestions}
          </span>
        </div>
        <h2 id="talk-title">{activeQuestion.text}</h2>
        {reflectionText ? <p className="reflection-note">{reflectionText}</p> : null}
        <div className={`shell-meter ${phase === 'listening' ? 'hot' : ''}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="progress-track" aria-label={`Question progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="answer-capture">
          <p className="listening-status" aria-live="polite">
            {useTypedFallback
              ? speech.lastError?.message || copy.fallbackBody
              : phase === 'listening'
                ? copy.listeningStatus
                : copy.preparingStatus}
          </p>
          <button
            type="button"
            className="replay-question"
            onClick={() => {
              cancelSpeechSynthesis()
              setPhase('speaking')
            }}
            aria-label={copy.replayQuestion}
          >
            <Volume2 size={16} aria-hidden="true" />
            <span>{copy.replayQuestion}</span>
          </button>
          {!useTypedFallback ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                speech.stop()
                setUseTypedFallback(true)
              }}
            >
              {copy.typeInstead}
            </button>
          ) : null}
          {(useTypedFallback || speech.lastError?.shouldUseTypedFallback) && (
            <div className="typed-fallback">
              <div className="fallback-copy">
                <strong>{copy.fallbackTitle}</strong>
                <span>{speech.lastError?.message || copy.fallbackBody}</span>
              </div>
              <textarea
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                placeholder={copy.typedPlaceholder}
                rows={3}
              />
              <button
                type="button"
                className="primary-action compact"
                onClick={submitTypedAnswer}
                disabled={!typedAnswer.trim()}
              >
                {copy.confirmAnswer}
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <section className={`talk-shell ${phase}`} aria-labelledby="talk-title">
      <button type="button" className="ghost-action" onClick={onBack} aria-label={copy.back}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <div className="avatar-stage" data-testid="avatar-stage">
        <div className="avatar-orbit" aria-hidden="true" />
        <div className="doctor-avatar" aria-label={copy.avatarStatus}>
          <img src="/doctor-avatar.png" alt="" />
        </div>
      </div>
      <SelfView language={language} />
      <div className="conversation-panel" data-testid="control-area" data-phase={phase}>
        {renderConversationContent()}
      </div>
    </section>
  )
}

function App() {
  const [language, setLanguage] = useState<LanguageKey>('en')
  const [mode, setMode] = useState<'entry' | 'talk'>('entry')
  const copy = content[language]

  function startTalk() {
    primeSpeechSynthesis(language)
    setMode('talk')
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Talk language controls">
        <div className="brand-mark">
          <span className="pulse-dot" aria-hidden="true" />
          <span>TheFamilyDoctor.AI</span>
        </div>
        <div className="language-toggle" aria-label={copy.languageLabel}>
          <Languages size={18} aria-hidden="true" />
          {Object.values(content).map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === language ? 'active' : ''}
              aria-pressed={item.key === language}
              onClick={() => setLanguage(item.key)}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>
      </header>

      {mode === 'entry' ? (
        <section className="entry-screen" aria-labelledby="entry-title">
          <div className="entry-copy">
            <p className="eyebrow">{copy.entry.eyebrow}</p>
            <h1 id="entry-title">{copy.entry.title}</h1>
            <p className="intro">{copy.entry.subtitle}</p>
          </div>

          <div className="entry-actions">
            <button type="button" className="primary-action" onClick={startTalk}>
              <PhoneCall size={22} aria-hidden="true" />
              {copy.entry.cta}
            </button>
            <div className="privacy-strip">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{copy.entry.privacy}</span>
            </div>
          </div>
        </section>
      ) : (
        <TalkShell language={language} onBack={() => setMode('entry')} />
      )}
    </main>
  )
}

export default App

import { ArrowLeft, Languages, PhoneCall, ShieldCheck } from 'lucide-react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import './App.css'
import { content, type LanguageKey } from './content'
import { createEmptyIntake, INTAKE_FIELD_KEYS, withIntakeAnswer } from './intake'
import type { IntakeAnswerSource, IntakeData } from './intake'
import { useSpeechRecognition } from './useSpeechRecognition'

type SelfViewStatus = 'loading' | 'ready' | 'blocked'
type FlowPhase = 'asking' | 'listening' | 'summary' | 'prescription' | 'download'

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
  const [phase, setPhase] = useState<FlowPhase>('asking')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [useTypedFallback, setUseTypedFallback] = useState(false)
  const [intakeData, setIntakeData] = useState<IntakeData>(() => createEmptyIntake(language))
  const [reviewingQuestionIndex, setReviewingQuestionIndex] = useState<number | null>(null)
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

  useEffect(() => {
    setIntakeData(createEmptyIntake(language))
    setQuestionIndex(0)
    setTypedAnswer('')
    setUseTypedFallback(false)
    setReviewingQuestionIndex(null)
    setPhase('asking')
    captureTokenRef.current = ''
    speech.reset()
  }, [language])

  useEffect(() => {
    if (phase !== 'asking') return

    playPlaceholderTone()
    setTypedAnswer('')
    setUseTypedFallback(false)
    captureTokenRef.current = ''
    speech.reset()

    const timer = window.setTimeout(() => {
      setPhase('listening')
      const started = speech.start()
      if (!started) {
        setUseTypedFallback(true)
      }
    }, 450)

    return () => window.clearTimeout(timer)
  }, [phase, questionIndex, reviewingQuestionIndex])

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

  function captureAnswer(rawAnswer: string, source: IntakeAnswerSource) {
    const answer = rawAnswer.trim()
    if (!answer) return

    const captureToken = `${activeField}:${source}:${answer}`
    if (captureTokenRef.current === captureToken) return
    captureTokenRef.current = captureToken

    speech.stop()
    setIntakeData((current) => withIntakeAnswer(current, activeField, answer, source))
    setTypedAnswer('')
    setUseTypedFallback(false)
    speech.reset()

    if (reviewingQuestionIndex !== null) {
      setReviewingQuestionIndex(null)
      setPhase('summary')
      return
    }

    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex((current) => current + 1)
      setPhase('asking')
      return
    }

    setPhase('summary')
  }

  function submitTypedAnswer() {
    captureAnswer(typedAnswer, 'typed')
  }

  function restartScript() {
    setQuestionIndex(0)
    setIntakeData(createEmptyIntake(language))
    setTypedAnswer('')
    setUseTypedFallback(false)
    setReviewingQuestionIndex(null)
    captureTokenRef.current = ''
    speech.reset()
    setPhase('asking')
  }

  function reanswerField(fieldIndex: number) {
    setReviewingQuestionIndex(fieldIndex)
    setQuestionIndex(fieldIndex)
    setTypedAnswer('')
    setUseTypedFallback(false)
    captureTokenRef.current = ''
    speech.reset()
    setPhase('asking')
  }

  function renderConversationContent() {
    if (phase === 'summary') {
      return (
        <>
          <p className="eyebrow">{copy.summaryTitle}</p>
          <h2 id="talk-title">{copy.summaryTitle}</h2>
          <p>{copy.reviewPrompt}</p>
          <div className="summary-list" data-testid="intake-summary">
            {INTAKE_FIELD_KEYS.map((field, fieldIndex) => {
              const answer = intakeData.answers[field]
              return (
                <article className="summary-item" key={field}>
                  <div>
                    <strong>{copy.fieldLabels[field]}</strong>
                    <p>{answer.value || copy.missingAnswer}</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => reanswerField(fieldIndex)}
                  >
                    {copy.reanswer}
                  </button>
                </article>
              )
            })}
          </div>
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
          <span>{phase === 'asking' ? copy.askingLabel : copy.answeringLabel}</span>
          <span>
            {questionIndex + 1}/{totalQuestions}
          </span>
        </div>
        <h2 id="talk-title">{activeQuestion.text}</h2>
        <div className={`shell-meter ${phase === 'listening' ? 'hot' : ''}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="progress-track" aria-label={`Question progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="answer-capture">
          <p className="live-transcript" aria-live="polite">
            {speech.transcript || speech.lastError?.message || copy.noTranscript}
          </p>
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
            <button type="button" className="primary-action" onClick={() => setMode('talk')}>
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

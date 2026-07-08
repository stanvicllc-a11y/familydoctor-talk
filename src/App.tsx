import { ArrowLeft, Languages, PhoneCall, ShieldCheck } from 'lucide-react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import './App.css'
import { content, type LanguageKey } from './content'
import { createEmptyIntake, withIntakeAnswer } from './intake'
import type { IntakeAnswerSource, IntakeData } from './intake'
import { useSpeechRecognition } from './useSpeechRecognition'

type SelfViewStatus = 'loading' | 'ready' | 'blocked'
type FlowPhase =
  | 'asking'
  | 'answering'
  | 'confirming'
  | 'summary'
  | 'prescription'
  | 'download'

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
    // Some browsers block audio until a user gesture; visual state still advances.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
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
      <div className="self-view-label">
        <ShieldCheck size={14} aria-hidden="true" />
        <span>{copy.localVideo}</span>
      </div>
    </div>
  )
}

function SpeechHarness({ language }: { language: LanguageKey }) {
  const copy = content[language].speech
  const speech = useSpeechRecognition({ language })

  return (
    <section className="stt-harness" data-testid="stt-harness" aria-label={copy.harnessTitle}>
      <div className="stt-copy">
        <strong>{copy.harnessTitle}</strong>
        <span>{copy.disclosure}</span>
      </div>
      <div className="stt-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={() => speech.start()}
          disabled={speech.isListening || !speech.isSupported}
        >
          {copy.harnessStart}
        </button>
        <button
          type="button"
          className="secondary-action"
          onClick={speech.stop}
          disabled={!speech.isListening}
        >
          {copy.harnessStop}
        </button>
        <button type="button" className="secondary-action" onClick={speech.reset}>
          {copy.harnessReset}
        </button>
      </div>
      <p className="stt-meta">
        {speech.isSupported
          ? `${speech.recognitionLanguage} · ${speech.status}`
          : copy.unsupported}
      </p>
      <p className="stt-transcript" aria-live="polite">
        {speech.transcript || speech.lastError?.message || copy.harnessPlaceholder}
      </p>
    </section>
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
  const [answerDraft, setAnswerDraft] = useState('')
  const [typedAnswer, setTypedAnswer] = useState('')
  const [useTypedFallback, setUseTypedFallback] = useState(false)
  const [answerSource, setAnswerSource] = useState<IntakeAnswerSource>('speech')
  const [intakeData, setIntakeData] = useState<IntakeData>(() => createEmptyIntake(language))
  const speech = useSpeechRecognition({ language })
  const activeQuestion = copy.questions[questionIndex]
  const activeField = activeQuestion.field
  const totalQuestions = copy.questions.length
  const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100)

  useEffect(() => {
    if (phase === 'asking') {
      playPlaceholderTone()
    }
  }, [phase, questionIndex])

  useEffect(() => {
    setIntakeData(createEmptyIntake(language))
    setQuestionIndex(0)
    setAnswerDraft('')
    setTypedAnswer('')
    setUseTypedFallback(false)
    setAnswerSource('speech')
    setPhase('asking')
    speech.reset()
  }, [language])

  useEffect(() => {
    if (phase === 'answering' && speech.status === 'complete' && speech.transcript) {
      setAnswerDraft(speech.transcript)
      setAnswerSource('speech')
      setUseTypedFallback(false)
      setPhase('confirming')
    }
  }, [phase, speech.status, speech.transcript])

  useEffect(() => {
    if (phase === 'answering' && speech.status === 'unsupported') {
      setUseTypedFallback(true)
    }
  }, [phase, speech.status])

  function beginAnswer() {
    setAnswerDraft('')
    setTypedAnswer('')
    setUseTypedFallback(false)
    speech.reset()
    setPhase('answering')
    const started = speech.start()
    if (!started) {
      setUseTypedFallback(true)
    }
  }

  function finishSpeaking() {
    const transcript = speech.transcript.trim()
    if (transcript) {
      speech.stop()
      setAnswerDraft(transcript)
      setAnswerSource('speech')
      setUseTypedFallback(false)
      setPhase('confirming')
      return
    }
    speech.stop()
  }

  function submitTypedAnswer() {
    const answer = typedAnswer.trim()
    if (!answer) return
    speech.stop()
    setAnswerDraft(answer)
    setAnswerSource('typed')
    setUseTypedFallback(true)
    setPhase('confirming')
  }

  function redoAnswer() {
    setAnswerDraft('')
    setTypedAnswer('')
    setUseTypedFallback(false)
    speech.reset()
    setPhase('answering')
    const started = speech.start()
    if (!started) {
      setUseTypedFallback(true)
    }
  }

  function confirmAnswer() {
    const answer = answerDraft.trim()
    if (!answer) return
    setIntakeData((current) =>
      withIntakeAnswer(current, activeField, answer, answerSource),
    )
    speech.reset()
    advanceFromAnswer()
  }

  function advanceFromAnswer() {
    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex((current) => current + 1)
      setPhase('asking')
      return
    }

    setPhase('summary')
  }

  function restartScript() {
    setQuestionIndex(0)
    setIntakeData(createEmptyIntake(language))
    setAnswerDraft('')
    setTypedAnswer('')
    setUseTypedFallback(false)
    setAnswerSource('speech')
    speech.reset()
    setPhase('asking')
  }

  function renderConversationContent() {
    if (phase === 'summary') {
      return (
        <>
          <p className="eyebrow">{copy.summaryTitle}</p>
          <h2 id="talk-title">{copy.summaryTitle}</h2>
          <p>{copy.summaryBody}</p>
          <p className="answer-count">
            {
              Object.values(intakeData.answers).filter((answer) => answer.value).length
            }/{totalQuestions}
          </p>
          <button type="button" className="primary-action compact" onClick={() => setPhase('prescription')}>
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
          <button type="button" className="primary-action compact" onClick={() => setPhase('download')}>
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
          <span>
            {phase === 'asking'
              ? copy.askingLabel
              : phase === 'confirming'
                ? copy.confirmPrompt
                : copy.answeringLabel}
          </span>
          <span>
            {questionIndex + 1}/{totalQuestions}
          </span>
        </div>
        <h2 id="talk-title">{activeQuestion.text}</h2>
        {phase !== 'confirming' ? (
          <div className={`shell-meter ${phase === 'answering' ? 'hot' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        <div className="progress-track" aria-label={`Question progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        {phase === 'asking' && (
          <>
            <p className="speech-disclosure">{content[language].speech.disclosure}</p>
            <button type="button" className="primary-action compact" onClick={beginAnswer}>
              {copy.startSpeaking}
            </button>
          </>
        )}
        {phase === 'answering' && (
          <div className="answer-capture">
            <p className="live-transcript" aria-live="polite">
              {speech.transcript || speech.lastError?.message || copy.noTranscript}
            </p>
            {!useTypedFallback && (
              <div className="answer-actions">
                <button type="button" className="primary-action compact" onClick={finishSpeaking}>
                  {copy.doneSpeaking}
                </button>
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
              </div>
            )}
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
        )}
        {phase === 'confirming' && (
          <div className="confirm-answer">
            <p className="captured-answer">{answerDraft}</p>
            <div className="answer-actions">
              <button type="button" className="primary-action compact" onClick={confirmAnswer}>
                {copy.confirmAnswer}
              </button>
              <button type="button" className="secondary-action" onClick={redoAnswer}>
                {copy.redoAnswer}
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="talk-shell" aria-labelledby="talk-title">
      <button
        type="button"
        className="ghost-action"
        onClick={onBack}
        aria-label={copy.back}
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <div className="avatar-stage" data-testid="avatar-stage">
        <div className="avatar-orbit" aria-hidden="true" />
        <div className="doctor-avatar" aria-label={copy.avatarStatus}>
          <div className="avatar-head" />
          <div className="avatar-body" />
          <div className="avatar-mouth" />
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
            <button
              type="button"
              className="primary-action"
              onClick={() => setMode('talk')}
            >
              <PhoneCall size={22} aria-hidden="true" />
              {copy.entry.cta}
            </button>
            <div className="privacy-strip">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{copy.entry.privacy}</span>
            </div>
          </div>
          <SpeechHarness language={language} />
        </section>
      ) : (
        <TalkShell language={language} onBack={() => setMode('entry')} />
      )}
    </main>
  )
}

export default App

import { ArrowLeft, Languages, PhoneCall, ShieldCheck } from 'lucide-react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import './App.css'
import { content, type LanguageKey } from './content'

type SelfViewStatus = 'loading' | 'ready' | 'blocked'

function SelfView({ language }: { language: LanguageKey }) {
  const copy = content[language].talk
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<SelfViewStatus>('loading')
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

function TalkShell({
  language,
  onBack,
}: {
  language: LanguageKey
  onBack: () => void
}) {
  const copy = content[language].talk

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
      <div className="conversation-panel" data-testid="control-area">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="talk-title">{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="shell-meter" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="shell-status">
          <strong>{copy.controlTitle}</strong>
          <span>{copy.controlBody}</span>
        </div>
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
        </section>
      ) : (
        <TalkShell language={language} onBack={() => setMode('entry')} />
      )}
    </main>
  )
}

export default App

import {
  ArrowLeft,
  Check,
  Keyboard,
  Mic,
  Pencil,
  PhoneCall,
  Send,
  Volume2,
  X,
} from 'lucide-react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import './App.css'
import { content, type LanguageKey } from './content'
import { createEmptyIntake, INTAKE_FIELD_KEYS, withIntakeAnswer } from './intake'
import type { AvatarClipId, IntakeAnswerSource, IntakeData, IntakeFieldKey, IntakeQuestion } from './intake'
import { ProductionChrome, type ChromePatient } from './ProductionChrome'
import { DUMMY_PHONE, fetchDummyPatients, loginDummyAccountOnce } from './productionApi'
import {
  cancelSpeechSynthesis,
  primeSpeechSynthesis,
  speakUtterance,
} from './speechSynthesis'
import { useSpeechRecognition } from './useSpeechRecognition'

type SelfViewStatus = 'loading' | 'ready' | 'blocked'
type FlowPhase = 'speaking' | 'listening' | 'summary' | 'submitted'
type AppMode = 'entry' | 'permissions' | 'talk'
type TalkPermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'

const SILENCE_ADVANCE_MS = 1500
const TTS_SAFETY_BUFFER_MS = 1800
const AVATAR_IDLE_SRC = '/talk-avatars/idle_raj_en.mp4'
const AVATAR_LISTENING_SRC = '/talk-avatars/raj_listening_loop_en.mp4'
const AVATAR_CLIP_SRC: Partial<Record<AvatarClipId, string>> = {
  g1: '/talk-avatars/raj_g1_en.mp4',
  q_duration: '/talk-avatars/raj_q_duration_en.mp4',
  q_severity: '/talk-avatars/raj_q_severity_en.mp4',
  q_betterworse: '/talk-avatars/raj_q_betterworse_en.mp4',
  q_showme: '/talk-avatars/raj_q_showme_en.mp4',
  q_ahh: '/talk-avatars/raj_q_ahh_en.mp4',
  q_contacts: '/talk-avatars/raj_q_contacts_en.mp4',
  q_ros: '/talk-avatars/raj_q_ros_en.mp4',
  q_hxintro: '/talk-avatars/raj_q_hxintro_en.mp4',
  q_allergies: '/talk-avatars/raj_q_allergies_en.mp4',
  q_meds: '/talk-avatars/raj_q_meds_en.mp4',
  q_conditions: '/talk-avatars/raj_q_conditions_en.mp4',
}

const FALLBACK_PATIENTS: ChromePatient[] = [
  {
    id: 'self',
    isPrimary: true,
    name: 'Test Patient',
    code: 'MRN-RZP005',
  },
  {
    id: 'family-demo',
    isPrimary: false,
    name: 'Family Member',
    code: 'MRN-FAMILY',
    relationship: 'child',
  },
]

const TEXT_LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Punjabi',
]

type ChoiceKey = 'talk' | 'text'

type AvatarAsset =
  | { kind: 'clip'; clipId: AvatarClipId; src: string }
  | { kind: 'listening'; src: string; missingClipId?: AvatarClipId }
  | { kind: 'idle'; src: string; missingClipId?: AvatarClipId }

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

async function getPermissionState(name: PermissionName) {
  if (!navigator.permissions?.query) return 'prompt' as PermissionState

  try {
    const status = await navigator.permissions.query({ name })
    return status.state
  } catch {
    return 'prompt' as PermissionState
  }
}

async function requestTalkMediaStream(existingStream: MediaStream | null) {
  if (existingStream?.active) {
    return { status: 'granted' as const, stream: existingStream }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return { status: 'unsupported' as const, stream: null }
  }

  const [cameraState, microphoneState] = await Promise.all([
    getPermissionState('camera' as PermissionName),
    getPermissionState('microphone' as PermissionName),
  ])

  if (cameraState === 'denied' || microphoneState === 'denied') {
    return { status: 'denied' as const, stream: null }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true,
    })
    return { status: 'granted' as const, stream }
  } catch {
    return { status: 'denied' as const, stream: null }
  }
}

async function unlockSessionMediaPlayback() {
  const attempts: Array<Promise<unknown>> = []

  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (AudioContextClass) {
    try {
      const audio = new AudioContextClass()
      attempts.push(audio.resume().finally(() => audio.close()))
    } catch {
      // Browser support varies; the video unlock below is the main path.
    }
  }

  try {
    const video = document.createElement('video')
    video.src = AVATAR_LISTENING_SRC
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.style.position = 'fixed'
    video.style.width = '1px'
    video.style.height = '1px'
    video.style.opacity = '0'
    video.style.pointerEvents = 'none'
    document.body.appendChild(video)
    attempts.push(
      video.play().then(() => {
        video.pause()
        video.currentTime = 0
      }).finally(() => {
        video.remove()
      }),
    )
  } catch {
    // The avatar layer has its own per-video fallback if this cannot run.
  }

  const results = await Promise.allSettled(attempts)
  return results.some((result) => result.status === 'fulfilled')
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

function estimateSpeechSafetyMs(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(3500, words * 430 + TTS_SAFETY_BUFFER_MS)
}

function resolveAvatarAsset(language: LanguageKey, question?: IntakeQuestion): AvatarAsset {
  if (language !== 'en' || !question?.clipId) {
    return { kind: 'idle', src: AVATAR_IDLE_SRC }
  }

  const clipSrc = AVATAR_CLIP_SRC[question.clipId]
  if (!clipSrc) {
    return { kind: 'listening', src: AVATAR_LISTENING_SRC, missingClipId: question.clipId }
  }

  return { kind: 'clip', clipId: question.clipId, src: clipSrc }
}

function avatarAssetKey(asset: AvatarAsset) {
  return `${asset.kind}:${asset.src}:${asset.kind === 'clip' ? asset.clipId : asset.missingClipId || asset.kind}`
}

function avatarLabel(asset: AvatarAsset, active: boolean) {
  if (asset.kind === 'clip' && active) return `Raj filmed clip ${asset.clipId}`
  if (asset.kind === 'listening') return asset.missingClipId ? `Raj listening avatar loop for ${asset.missingClipId}` : 'Raj listening avatar loop'
  return 'Raj idle avatar loop'
}

function AvatarVideoLayer({
  asset,
  active,
  mediaUnlocked,
  onReady,
  onClipEnded,
  layer,
}: {
  asset: AvatarAsset
  active: boolean
  mediaUnlocked: boolean
  onReady?: () => void
  onClipEnded: () => void
  layer: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onClipEndedRef = useRef(onClipEnded)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onClipEndedRef.current = onClipEnded
  }, [onClipEnded])

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let hasFrame = video.readyState >= 2
    let playbackStarted = false

    function notifyReady() {
      if (cancelled || !hasFrame || !playbackStarted) return
      video.dataset.painted = 'true'
      window.requestAnimationFrame(() => {
        if (!cancelled) onReadyRef.current?.()
      })
    }

    function markFrameReady() {
      hasFrame = true
      notifyReady()
    }

    video.load()
    if (hasFrame) notifyReady()
    video.addEventListener('loadeddata', markFrameReady, { once: true })
    video.addEventListener('canplay', markFrameReady, { once: true })

    const play = video.play()
    if (play && typeof play.catch === 'function') {
      play
        .then(() => {
          playbackStarted = true
          notifyReady()
        })
        .catch(() => {
          if (asset.kind === 'clip' && active) {
            video.dataset.autoplayBlocked = 'true'
          }
          video.muted = true
          video
            .play()
            .then(() => {
              playbackStarted = true
              notifyReady()
            })
            .catch(() => {
              if (asset.kind === 'clip' && active) {
                window.setTimeout(() => onClipEndedRef.current(), 900)
              }
            })
        })
    } else {
      playbackStarted = true
      notifyReady()
    }

    return () => {
      cancelled = true
      video.removeEventListener('loadeddata', markFrameReady)
      video.removeEventListener('canplay', markFrameReady)
    }
  }, [asset.src, asset.kind, active, mediaUnlocked])

  return (
    <video
      key={`${layer}:${avatarAssetKey(asset)}`}
      ref={videoRef}
      src={asset.src}
      className={`doctor-avatar-video ${layer}`}
      autoPlay
      muted={asset.kind !== 'clip' || !active}
      loop={asset.kind !== 'clip' || !active}
      playsInline
      preload="auto"
      disablePictureInPicture
      controls={false}
      aria-label={avatarLabel(asset, active)}
      data-avatar-mode={asset.kind}
      data-avatar-clip={asset.kind === 'clip' ? asset.clipId : asset.missingClipId || asset.kind}
      data-media-unlocked={mediaUnlocked ? 'true' : 'false'}
      data-painted="false"
      onEnded={() => {
        if (asset.kind === 'clip' && active) onClipEnded()
      }}
    />
  )
}

function DoctorAvatar({
  asset,
  active,
  mediaUnlocked,
  preloadSrc,
  onClipEnded,
}: {
  asset: AvatarAsset
  active: boolean
  mediaUnlocked: boolean
  preloadSrc?: string
  onClipEnded: () => void
}) {
  const [currentAsset, setCurrentAsset] = useState(asset)
  const [previousAsset, setPreviousAsset] = useState<AvatarAsset | null>(null)
  const [fadeArmed, setFadeArmed] = useState(true)
  const currentAssetRef = useRef(asset)
  const transitionTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const currentKey = avatarAssetKey(currentAssetRef.current)
    const nextKey = avatarAssetKey(asset)
    if (currentKey === nextKey) {
      currentAssetRef.current = asset
      return
    }

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    setPreviousAsset(currentAssetRef.current)
    currentAssetRef.current = asset
    setCurrentAsset(asset)
    setFadeArmed(false)

    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current)
        transitionTimerRef.current = null
      }
    }
  }, [asset])

  function finishIncomingPaint() {
    if (!previousAsset) return
    setFadeArmed(true)
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current)
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setPreviousAsset(null)
      transitionTimerRef.current = null
    }, 380)
  }

  return (
    <>
      {previousAsset ? (
        <AvatarVideoLayer
          asset={previousAsset}
          active={false}
          mediaUnlocked={mediaUnlocked}
          layer={`previous ${fadeArmed ? 'fade-out' : 'hold'}`}
          onClipEnded={() => undefined}
        />
      ) : null}
      <AvatarVideoLayer
        asset={currentAsset}
        active={active}
        mediaUnlocked={mediaUnlocked}
        onReady={finishIncomingPaint}
        layer={previousAsset ? `current ${fadeArmed ? 'fade-in' : 'hold'}` : 'current'}
        onClipEnded={onClipEnded}
      />
      {preloadSrc ? (
        <video className="avatar-preload" src={preloadSrc} preload="auto" muted playsInline aria-hidden="true" />
      ) : null}
    </>
  )
}

function SelfView({
  language,
  mediaStream,
  permissionStatus,
}: {
  language: LanguageKey
  mediaStream: MediaStream | null
  permissionStatus: TalkPermissionStatus
}) {
  const copy = content[language].talk
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const status: SelfViewStatus = mediaStream ? 'ready' : permissionStatus === 'idle' || permissionStatus === 'requesting' ? 'loading' : 'blocked'

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream
    }
  }, [mediaStream])

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
  mediaStream,
  permissionStatus,
  mediaUnlocked,
  onBack,
}: {
  language: LanguageKey
  mediaStream: MediaStream | null
  permissionStatus: TalkPermissionStatus
  mediaUnlocked: boolean
  onBack: () => void
}) {
  const copy = content[language].talk
  const [phase, setPhase] = useState<FlowPhase>('speaking')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [useTypedFallback, setUseTypedFallback] = useState(false)
  const [typedPanelOpen, setTypedPanelOpen] = useState(false)
  const [intakeData, setIntakeData] = useState<IntakeData>(() => createEmptyIntake(language))
  const [reflectionText, setReflectionText] = useState('')
  const [openEditNote, setOpenEditNote] = useState('')
  const [summaryEditMessage, setSummaryEditMessage] = useState('')
  const [editingSummaryField, setEditingSummaryField] = useState<IntakeFieldKey | null>(null)
  const [inlineEditDraft, setInlineEditDraft] = useState('')
  const speech = useSpeechRecognition({
    language,
    continuous: true,
    initialSilenceTimeoutMs: 8500,
    endOfSpeechTimeoutMs: SILENCE_ADVANCE_MS,
    autoStopOnFinal: false,
  })
  const activeQuestion = copy.questions[questionIndex]
  const activeField = activeQuestion.field
  const activeAvatarAsset = resolveAvatarAsset(language, activeQuestion)
  const nextQuestion = copy.questions[questionIndex + 1]
  const nextQuestionAsset = nextQuestion ? resolveAvatarAsset(language, nextQuestion) : null
  const displayedAvatarAsset: AvatarAsset =
    phase === 'speaking'
      ? activeAvatarAsset
      : phase === 'listening'
        ? { kind: 'listening', src: AVATAR_LISTENING_SRC }
        : { kind: 'idle', src: AVATAR_IDLE_SRC }
  const preloadAvatarSrc =
    phase === 'speaking'
      ? AVATAR_LISTENING_SRC
      : phase === 'listening'
        ? nextQuestionAsset?.src || AVATAR_IDLE_SRC
        : activeAvatarAsset.src
  const totalQuestions = copy.questions.length
  const progress = Math.round(((questionIndex + 1) / totalQuestions) * 100)
  const captureTokenRef = useRef('')
  const hiddenTranscriptRef = useRef<string[]>([])
  const activeTurnRef = useRef({
    field: activeField,
    questionIndex,
    questionText: activeQuestion.text,
  })

  useEffect(() => {
    activeTurnRef.current = {
      field: activeField,
      questionIndex,
      questionText: activeQuestion.text,
    }
  }, [activeField, activeQuestion.text, questionIndex])

  useEffect(() => {
    setIntakeData(createEmptyIntake(language))
    setQuestionIndex(0)
    setTypedAnswer('')
    setUseTypedFallback(false)
    setTypedPanelOpen(false)
    setReflectionText('')
    setInlineEditDraft('')
    setEditingSummaryField(null)
    setOpenEditNote('')
    setSummaryEditMessage('')
    hiddenTranscriptRef.current = []
    setPhase('speaking')
    captureTokenRef.current = ''
    speech.reset()
  }, [language])

  function beginListening() {
    setPhase('listening')
    const started = speech.start()
    if (!started) {
      setUseTypedFallback(true)
      setTypedPanelOpen(true)
    }
  }

  function handleAvatarClipEnded() {
    if (phase === 'speaking' && activeAvatarAsset.kind === 'clip') {
      beginListening()
    }
  }

  useEffect(() => {
    if (phase !== 'speaking') return

    setTypedAnswer('')
    setUseTypedFallback(false)
    captureTokenRef.current = ''
    speech.stop()
    speech.reset()

    let cancelled = false
    let listeningStarted = false
    const safetyTimer = window.setTimeout(() => {
      if (cancelled || listeningStarted) return
      cancelSpeechSynthesis()
      listeningStarted = true
      beginListening()
    }, activeAvatarAsset.kind === 'clip' ? 60000 : estimateSpeechSafetyMs(activeQuestion.text))

    function beginListeningOnce() {
      if (cancelled || listeningStarted) return
      window.clearTimeout(safetyTimer)
      listeningStarted = true
      beginListening()
    }

    if (activeAvatarAsset.kind === 'clip') {
      cancelSpeechSynthesis()
      return () => {
        cancelled = true
        window.clearTimeout(safetyTimer)
      }
    }

    playPlaceholderTone()
    void speakUtterance(activeQuestion.text, {
      language,
      onEnd: beginListeningOnce,
      onError: beginListeningOnce,
    }).then((dispatched) => {
      if (!dispatched) {
        beginListeningOnce()
      }
    })

    return () => {
      cancelled = true
      window.clearTimeout(safetyTimer)
    }
  }, [phase, questionIndex, activeQuestion.text, language, activeAvatarAsset.kind, activeAvatarAsset.src])

  useEffect(() => {
    if (phase !== 'listening') return
    if (speech.status === 'complete' && speech.transcript.trim()) {
      captureAnswer(speech.transcript, 'speech', activeTurnRef.current)
      return
    }
    if (
      speech.status === 'unsupported' ||
      speech.lastError?.shouldUseTypedFallback ||
      speech.status === 'error'
    ) {
      setUseTypedFallback(true)
      setTypedPanelOpen(true)
    }
  }, [phase, speech.status, speech.transcript, speech.lastError])

  function captureAnswer(
    rawAnswer: string,
    source: IntakeAnswerSource,
    turn = activeTurnRef.current,
  ) {
    const answer = rawAnswer.trim()
    if (!answer) return

    const captureToken = `${turn.field}:${source}:${answer}`
    if (captureTokenRef.current === captureToken) return
    captureTokenRef.current = captureToken

    speech.stop()
    hiddenTranscriptRef.current = [
      ...hiddenTranscriptRef.current,
      `Doctor: ${turn.questionText}\nPatient: ${answer}`,
    ]
    setReflectionText(buildKeywordReflection(answer, language, copy.reflectionDefault))
    setIntakeData((current) => withIntakeAnswer(current, turn.field, answer, source))
    setTypedAnswer('')
    setUseTypedFallback(false)
    setTypedPanelOpen(false)
    speech.reset()

    if (turn.questionIndex < totalQuestions - 1) {
      setQuestionIndex(turn.questionIndex + 1)
      setPhase('speaking')
      return
    }

    setPhase('summary')
  }

  function submitTypedAnswer() {
    captureAnswer(typedAnswer, 'typed', activeTurnRef.current)
    setTypedPanelOpen(false)
  }

  function restartScript() {
    setQuestionIndex(0)
    setIntakeData(createEmptyIntake(language))
    setTypedAnswer('')
    setUseTypedFallback(false)
    setTypedPanelOpen(false)
    setReflectionText('')
    setInlineEditDraft('')
    setEditingSummaryField(null)
    setOpenEditNote('')
    setSummaryEditMessage('')
    hiddenTranscriptRef.current = []
    captureTokenRef.current = ''
    speech.reset()
    cancelSpeechSynthesis()
    setPhase('speaking')
  }

  function startInlineEdit(field: IntakeFieldKey) {
    setEditingSummaryField(field)
    setInlineEditDraft(intakeData.answers[field].value)
    setSummaryEditMessage('')
  }

  function saveInlineEdit() {
    if (!editingSummaryField) return
    setIntakeData((current) =>
      withIntakeAnswer(current, editingSummaryField, inlineEditDraft, 'typed'),
    )
    setSummaryEditMessage(copy.editApplied)
    setEditingSummaryField(null)
    setInlineEditDraft('')
  }

  function submitSummary() {
    speech.stop()
    speech.reset()
    cancelSpeechSynthesis()
    setPhase('submitted')
  }

  function renderConversationContent() {
    if (phase === 'summary') {
      return (
        <>
          <div className="summary-head">
            <p className="eyebrow">{copy.summaryTitle}</p>
            <h2 id="talk-title">{copy.summaryTitle}</h2>
            <p>{copy.closingSpoken}</p>
          </div>
          <div className="summary-manuscript" data-testid="intake-summary">
            {INTAKE_FIELD_KEYS.map((field, fieldIndex) => {
              const answer = intakeData.answers[field]
              const editing = editingSummaryField === field
              const label = copy.fieldLabels[field]
              return (
                <article
                  className={`summary-line ${editing ? 'editing' : ''}`}
                  key={field}
                  data-summary-field={field}
                  style={{ animationDelay: `${fieldIndex * 95}ms` }}
                >
                  <div className="summary-line-head">
                    <strong>{label}</strong>
                    <button
                      type="button"
                      className="icon-only-action"
                      onClick={() => startInlineEdit(field)}
                      aria-label={`Edit ${label}`}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                  </div>
                  {editing ? (
                    <div className="inline-summary-edit">
                      <textarea
                        value={inlineEditDraft}
                        onChange={(event) => setInlineEditDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                            event.preventDefault()
                            saveInlineEdit()
                          }
                        }}
                        rows={3}
                        aria-label={`Edit ${label}`}
                        data-testid={`summary-edit-${field}`}
                      />
                      <div>
                        <button
                          type="button"
                          className="icon-text-action solid"
                          onPointerDown={(event) => {
                            event.preventDefault()
                            saveInlineEdit()
                          }}
                          onClick={saveInlineEdit}
                        >
                          <Check size={15} aria-hidden="true" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          className="icon-text-action"
                          onClick={() => {
                            setEditingSummaryField(null)
                            setInlineEditDraft('')
                          }}
                        >
                          <X size={15} aria-hidden="true" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{answer.value || copy.missingAnswer}</p>
                  )}
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
          <section className="summary-submit-bar" aria-label={copy.summaryInvitation}>
            <p>{summaryEditMessage || copy.summaryInvitation}</p>
            <button
              type="button"
              className="primary-action compact"
              onPointerDown={(event) => {
                event.preventDefault()
                submitSummary()
              }}
              onClick={submitSummary}
              data-testid="summary-submit"
            >
              Submit
            </button>
          </section>
          <p className="answer-count">
            {Object.values(intakeData.answers).filter((answer) => answer.value).length}/
            {totalQuestions}
          </p>
        </>
      )
    }

    if (phase === 'submitted') {
      return (
        <>
          <p className="eyebrow">Submitted</p>
          <h2 id="talk-title">Submitted</h2>
          <p>Submitted — the existing payment/checkout flow continues here in production.</p>
          <button type="button" className="secondary-action" onClick={restartScript}>
            {copy.restart}
          </button>
        </>
      )
    }

    return (
      <div className="turn-ui" data-turn-state={phase}>
        <div className="flow-topline" aria-label={`Question ${questionIndex + 1} of ${totalQuestions}`}>
          <span>{phase === 'speaking' ? copy.askingLabel : copy.answeringLabel}</span>
          <span>
            {questionIndex + 1}/{totalQuestions}
          </span>
        </div>
        <div className="turn-cue" aria-live="polite">
          <div className={`cue-icon ${phase === 'listening' ? 'listening' : 'speaking'}`} aria-hidden="true">
            {phase === 'listening' ? <Mic size={26} /> : <Volume2 size={26} />}
          </div>
          <div className="cue-copy">
            <h2 id="talk-title">{phase === 'listening' ? copy.speakNowCue : copy.waitCue}</h2>
            <p>
              {useTypedFallback
                ? speech.lastError?.message || copy.fallbackBody
                : phase === 'listening'
                  ? copy.listeningHint
                  : copy.speakingHint}
            </p>
          </div>
          <div className={`shell-meter ${phase === 'listening' ? 'hot' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="progress-track" aria-label={`Question progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        {reflectionText ? <p className="reflection-note">{reflectionText}</p> : null}
        <div className="turn-actions">
          <button
            type="button"
            className="icon-text-action"
            onClick={() => {
              cancelSpeechSynthesis()
              setPhase('speaking')
            }}
            aria-label={copy.replayQuestion}
          >
            <Volume2 size={16} aria-hidden="true" />
            <span>{copy.replayQuestion}</span>
          </button>
          <button
            type="button"
            className="icon-text-action"
            onClick={() => {
              speech.stop()
              setUseTypedFallback(true)
              setTypedPanelOpen(true)
            }}
          >
            <Keyboard size={16} aria-hidden="true" />
            <span>{copy.typeInstead}</span>
          </button>
        </div>
        {typedPanelOpen ? (
          <div className="typed-answer-sheet" role="dialog" aria-label={copy.fallbackTitle}>
            <div className="typed-sheet-header">
              <strong>{copy.fallbackTitle}</strong>
              <button
                type="button"
                className="sheet-close"
                onClick={() => {
                  setTypedPanelOpen(false)
                  if (!speech.lastError?.shouldUseTypedFallback) {
                    setUseTypedFallback(false)
                  }
                }}
                aria-label="Close typed answer"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <textarea
              value={typedAnswer}
              onChange={(event) => setTypedAnswer(event.target.value)}
              placeholder={copy.typedPlaceholder}
              rows={3}
              autoFocus
            />
            <button
              type="button"
              className="primary-action compact"
              onClick={submitTypedAnswer}
              disabled={!typedAnswer.trim()}
            >
              <Send size={16} aria-hidden="true" />
              {copy.confirmAnswer}
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <section className={`talk-shell ${phase}`} aria-labelledby="talk-title">
      <button type="button" className="ghost-action" onClick={onBack} aria-label={copy.back}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <div className="avatar-stage" data-testid="avatar-stage">
        <div className="doctor-avatar" aria-label={copy.avatarStatus}>
          <DoctorAvatar
            asset={displayedAvatarAsset}
            active={phase === 'speaking'}
            mediaUnlocked={mediaUnlocked}
            preloadSrc={preloadAvatarSrc}
            onClipEnded={handleAvatarClipEnded}
          />
        </div>
      </div>
      <SelfView language={language} mediaStream={mediaStream} permissionStatus={permissionStatus} />
      <div className="conversation-panel" data-testid="control-area" data-phase={phase}>
        {renderConversationContent()}
      </div>
    </section>
  )
}

function App() {
  const [language, setLanguage] = useState<LanguageKey>('en')
  const [mode, setMode] = useState<AppMode>('entry')
  const [selectedPatientId, setSelectedPatientId] = useState('self')
  const [patients, setPatients] = useState<ChromePatient[]>(FALLBACK_PATIENTS)
  const [authStatus, setAuthStatus] = useState<'connecting' | 'ready' | 'error'>('connecting')
  const [authMessage, setAuthMessage] = useState('Connecting dummy patient account...')
  const [talkPermissionStatus, setTalkPermissionStatus] = useState<TalkPermissionStatus>('idle')
  const [talkPermissionMessage, setTalkPermissionMessage] = useState('Preparing camera and microphone...')
  const [talkMediaStream, setTalkMediaStream] = useState<MediaStream | null>(null)
  const [mediaUnlocked, setMediaUnlocked] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<ChoiceKey | null>(null)
  const [textLanguage, setTextLanguage] = useState(TEXT_LANGUAGES[0])

  useEffect(() => {
    let cancelled = false

    async function hydrateDummyAccount() {
      setAuthStatus('connecting')
      setAuthMessage('Connecting dummy patient account...')

      try {
        const verified = await loginDummyAccountOnce()
        if (cancelled) return

        const token = verified.token
        if (!token) throw new Error('Dummy OTP verification did not return a token')

        const loaded = await fetchDummyPatients(token)
        if (cancelled) return

        if (loaded.members.length > 0) {
          setPatients(loaded.members)
          setSelectedPatientId(loaded.selectedId)
        }
        setAuthStatus('ready')
        setAuthMessage(`Connected to real backend dummy account ${DUMMY_PHONE}`)
      } catch (error) {
        if (cancelled) return
        setAuthStatus('error')
        setAuthMessage(error instanceof Error ? error.message : 'Dummy backend connection failed')
      }
    }

    void hydrateDummyAccount()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      talkMediaStream?.getTracks().forEach((track) => track.stop())
    }
  }, [talkMediaStream])

  async function startTalk() {
    setMode('permissions')
    setTalkPermissionStatus('requesting')
    setTalkPermissionMessage('Allow camera and microphone once to start Talk.')
    const unlocked = await unlockSessionMediaPlayback()
    setMediaUnlocked(unlocked)
    primeSpeechSynthesis(language)

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))

    const result = await requestTalkMediaStream(talkMediaStream)
    setTalkPermissionStatus(result.status)

    if (result.status === 'granted') {
      setTalkMediaStream(result.stream)
      setTalkPermissionMessage('Camera and microphone are ready.')
      setMode('talk')
      return
    }

    setTalkPermissionMessage(
      result.status === 'unsupported'
        ? 'This browser cannot open camera or microphone here. You can continue with typed answers.'
        : 'Camera or microphone was blocked. You can continue with typed answers.',
    )
  }

  function continueWithoutMedia() {
    setMode('talk')
  }

  function handleTextSelected() {
    setSelectedChoice('text')
    // TODO(TALK-8): connect the production Text intake route here during the production merge.
  }

  const talkChoiceClass = `choice-option talk ${selectedChoice === 'talk' ? 'selected' : selectedChoice === 'text' ? 'dimmed' : ''}`
  const textChoiceClass = `choice-option text ${selectedChoice === 'text' ? 'selected' : selectedChoice === 'talk' ? 'dimmed' : ''}`

  return (
    <ProductionChrome
      members={patients}
      selectedId={selectedPatientId}
      activeNav="consult"
      onSwitchPatient={setSelectedPatientId}
    >
      <main className="app-shell">
        {mode === 'entry' ? (
          <section className="choice-screen" aria-labelledby="entry-title">
            <h1 id="entry-title" className="sr-only">
              Choose Talk or Text
            </h1>
            <p className={`sr-only backend-status ${authStatus}`} data-testid="backend-status">
              {authMessage}
            </p>
            <div className="choice-grid" data-testid="choice-grid">
              <article className={talkChoiceClass} data-testid="choice-talk">
                <button
                  type="button"
                  className="choice-box talk-box"
                  onClick={() => {
                    setSelectedChoice('talk')
                    void startTalk()
                  }}
                  onFocus={() => setSelectedChoice('talk')}
                >
                  <video
                    src={AVATAR_LISTENING_SRC}
                    className="choice-avatar-video"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                  />
                  <span className="choice-label">Talk</span>
                  <PhoneCall size={22} aria-hidden="true" />
                </button>
                <label className="choice-select-label">
                  <span>Language</span>
                  <select
                    value={language}
                    onFocus={() => setSelectedChoice('talk')}
                    onChange={(event) => {
                      setSelectedChoice('talk')
                      setLanguage(event.target.value as LanguageKey)
                    }}
                    aria-label="Talk language"
                  >
                    <option value="en">English</option>
                    <option value="hinglish">Hindi</option>
                  </select>
                </label>
              </article>

              <article className={textChoiceClass} data-testid="choice-text">
                <button
                  type="button"
                  className="choice-box text-box"
                  onClick={handleTextSelected}
                  onFocus={() => setSelectedChoice('text')}
                >
                  <video
                    src={AVATAR_IDLE_SRC}
                    className="choice-text-still"
                    muted
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                  />
                  <span className="choice-label">Text</span>
                  <div className="text-preview" aria-hidden="true">
                    <span>What brings you in today?</span>
                    <span>How long has this been going on?</span>
                    <span>Any allergies or medicines?</span>
                  </div>
                  <Keyboard size={22} aria-hidden="true" />
                </button>
                <label className="choice-select-label">
                  <span>Language</span>
                  <select
                    value={textLanguage}
                    onFocus={() => setSelectedChoice('text')}
                    onChange={(event) => {
                      setSelectedChoice('text')
                      setTextLanguage(event.target.value)
                    }}
                    aria-label="Text language"
                  >
                    {TEXT_LANGUAGES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            </div>
          </section>
        ) : mode === 'permissions' ? (
          <section className="permission-screen" aria-labelledby="permission-title">
            <div className="permission-panel" data-testid="permission-panel" data-permission-status={talkPermissionStatus}>
              <p className="eyebrow">Talk setup</p>
              <h1 id="permission-title">Camera and microphone</h1>
              <p className="intro">{talkPermissionMessage}</p>
              {talkPermissionStatus === 'requesting' ? (
                <div className="permission-meter" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
              {talkPermissionStatus === 'denied' || talkPermissionStatus === 'unsupported' ? (
                <button type="button" className="primary-action" onClick={continueWithoutMedia}>
                  <Keyboard size={20} aria-hidden="true" />
                  Continue with typed answers
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <TalkShell
            language={language}
            mediaStream={talkMediaStream}
            permissionStatus={talkPermissionStatus}
            mediaUnlocked={mediaUnlocked}
            onBack={() => setMode('entry')}
          />
        )}
      </main>
    </ProductionChrome>
  )
}

export default App

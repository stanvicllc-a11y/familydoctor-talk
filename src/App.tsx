import {
  ArrowLeft,
  Check,
  Keyboard,
  Mic,
  Pencil,
  PhoneCall,
  Send,
  ShieldCheck,
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

type AvatarAsset =
  | { kind: 'clip'; clipId: AvatarClipId; src: string }
  | { kind: 'listening'; src: string; missingClipId?: AvatarClipId }
  | { kind: 'idle'; src: string; missingClipId?: AvatarClipId }

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
  if (matches(['started', 'since', 'duration', 'kab se'])) return 'duration'
  if (matches(['worse', 'better', 'same'])) return 'betterWorse'
  if (matches(['severe', 'severity', 'bad', 'impact'])) return 'severity'
  if (matches(['rash', 'swelling', 'visible', 'photo', 'show'])) return 'showMe'
  if (matches(['throat', 'mouth', 'ahh', 'tonsil'])) return 'throatCheck'
  if (matches(['fever', 'cough', 'pain', 'vomit', 'breath', 'symptom', 'dard'])) {
    return 'associatedSymptoms'
  }
  if (matches(['travel', 'food', 'khaya'])) return 'recentTravel'
  if (matches(['sick', 'contact', 'around', 'aas-paas'])) return 'sickContacts'
  if (matches(['history'])) return 'historyIntro'
  if (matches(['condition', 'diabetes', 'pressure', 'asthma'])) return 'conditions'
  if (matches(['surgery', 'operation'])) return 'surgeries'
  if (matches(['pregnant', 'pregnancy'])) return 'pregnancy'
  if (matches(['main', 'problem', 'complaint'])) return 'chiefComplaint'

  return null
}

function buildSummaryText(
  intakeData: IntakeData,
  language: LanguageKey,
  labels: Record<IntakeFieldKey, string>,
  missingAnswer: string,
  openEditLabel: string,
  openEditNote: string,
) {
  const lines = [
    'TheFamilyDoctor.AI Talk intake summary',
    `Language: ${language}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    ...INTAKE_FIELD_KEYS.flatMap((field) => [
      labels[field],
      intakeData.answers[field].value || missingAnswer,
      '',
    ]),
  ]

  if (openEditNote) {
    lines.push(openEditLabel, openEditNote, '')
  }

  lines.push(
    'Placeholder note: this staging file was generated locally in the browser from in-memory answers. No backend write or prescription generation occurred.',
  )

  return lines.join('\n')
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
  onClipEnded,
  layer,
}: {
  asset: AvatarAsset
  active: boolean
  onClipEnded: () => void
  layer: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.load()
    const play = video.play()
    if (play && typeof play.catch === 'function') {
      play.catch(() => {
        // Browser autoplay policy can still require a tap on some devices.
      })
    }
  }, [asset.src, asset.kind, active])

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
      aria-label={avatarLabel(asset, active)}
      data-avatar-mode={asset.kind}
      data-avatar-clip={asset.kind === 'clip' ? asset.clipId : asset.missingClipId || asset.kind}
      onEnded={() => {
        if (asset.kind === 'clip' && active) onClipEnded()
      }}
    />
  )
}

function DoctorAvatar({
  asset,
  active,
  preloadSrc,
  onClipEnded,
}: {
  asset: AvatarAsset
  active: boolean
  preloadSrc?: string
  onClipEnded: () => void
}) {
  const [currentAsset, setCurrentAsset] = useState(asset)
  const [previousAsset, setPreviousAsset] = useState<AvatarAsset | null>(null)
  const [fadeArmed, setFadeArmed] = useState(true)
  const currentAssetRef = useRef(asset)

  useEffect(() => {
    const currentKey = avatarAssetKey(currentAssetRef.current)
    const nextKey = avatarAssetKey(asset)
    if (currentKey === nextKey) {
      currentAssetRef.current = asset
      return
    }

    setPreviousAsset(currentAssetRef.current)
    currentAssetRef.current = asset
    setCurrentAsset(asset)
    setFadeArmed(false)

    const raf = window.requestAnimationFrame(() => setFadeArmed(true))
    const timer = window.setTimeout(() => setPreviousAsset(null), 320)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [asset])

  return (
    <>
      {previousAsset ? (
        <AvatarVideoLayer
          asset={previousAsset}
          active={false}
          layer={`previous ${fadeArmed ? 'fade-out' : 'hold'}`}
          onClipEnded={() => undefined}
        />
      ) : null}
      <AvatarVideoLayer
        asset={currentAsset}
        active={active}
        layer={previousAsset ? `current ${fadeArmed ? 'fade-in' : 'hold'}` : 'current'}
        onClipEnded={onClipEnded}
      />
      {preloadSrc ? (
        <video className="avatar-preload" src={preloadSrc} preload="auto" muted playsInline aria-hidden="true" />
      ) : null}
    </>
  )
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
  const [typedPanelOpen, setTypedPanelOpen] = useState(false)
  const [intakeData, setIntakeData] = useState<IntakeData>(() => createEmptyIntake(language))
  const [reflectionText, setReflectionText] = useState('')
  const [summaryEditDraft, setSummaryEditDraft] = useState('')
  const [summaryUseTypedFallback, setSummaryUseTypedFallback] = useState(false)
  const [openEditNote, setOpenEditNote] = useState('')
  const [summaryEditMessage, setSummaryEditMessage] = useState('')
  const [summaryEditListening, setSummaryEditListening] = useState(false)
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
  const summarySpokenRef = useRef(false)
  const summaryEditAttemptRef = useRef(false)
  const summaryEditTokenRef = useRef('')

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
    setSummaryEditDraft('')
    setInlineEditDraft('')
    setEditingSummaryField(null)
    setSummaryUseTypedFallback(false)
    setOpenEditNote('')
    setSummaryEditMessage('')
    setSummaryEditListening(false)
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

  useEffect(() => {
    if (phase !== 'summary') return
    let cancelled = false

    function beginSummaryEditListening() {
      if (cancelled || summaryEditAttemptRef.current || summaryEditMessage) return
      summaryEditAttemptRef.current = true
      setSummaryEditListening(true)
      setSummaryUseTypedFallback(false)
      speech.reset()
      const started = speech.start()
      if (!started) {
        setSummaryUseTypedFallback(true)
      }
    }

    if (!summarySpokenRef.current) {
      summarySpokenRef.current = true
      setSummaryEditListening(false)
      const safetyTimer = window.setTimeout(() => {
        cancelSpeechSynthesis()
        beginSummaryEditListening()
      }, estimateSpeechSafetyMs(copy.closingSpoken))

      void speakUtterance(copy.closingSpoken, {
        language,
        onEnd: () => {
          window.clearTimeout(safetyTimer)
          beginSummaryEditListening()
        },
        onError: () => {
          window.clearTimeout(safetyTimer)
          beginSummaryEditListening()
        },
      }).then((dispatched) => {
        if (!dispatched) {
          window.clearTimeout(safetyTimer)
          beginSummaryEditListening()
        }
      })

      return () => {
        cancelled = true
        window.clearTimeout(safetyTimer)
      }
    }

    beginSummaryEditListening()

    return () => {
      cancelled = true
    }
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
    setSummaryEditListening(false)
    speech.reset()
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
    setSummaryEditDraft('')
    setInlineEditDraft('')
    setEditingSummaryField(null)
    setSummaryUseTypedFallback(false)
    setOpenEditNote('')
    setSummaryEditMessage('')
    setSummaryEditListening(false)
    hiddenTranscriptRef.current = []
    summarySpokenRef.current = false
    summaryEditAttemptRef.current = false
    summaryEditTokenRef.current = ''
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
            preloadSrc={preloadAvatarSrc}
            onClipEnded={handleAvatarClipEnded}
          />
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
  const [selectedPatientId, setSelectedPatientId] = useState('self')
  const [patients, setPatients] = useState<ChromePatient[]>(FALLBACK_PATIENTS)
  const [authStatus, setAuthStatus] = useState<'connecting' | 'ready' | 'error'>('connecting')
  const [authMessage, setAuthMessage] = useState('Connecting dummy patient account...')
  const copy = content[language]

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

  function startTalk() {
    primeSpeechSynthesis(language)
    setMode('talk')
  }

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
            <div className="choice-copy">
              <p className="eyebrow">{copy.entry.eyebrow}</p>
              <h1 id="entry-title">{copy.entry.title}</h1>
              <p className="intro">{copy.entry.subtitle}</p>
              <p className={`backend-status ${authStatus}`} data-testid="backend-status">
                {authMessage}
              </p>
            </div>

            <div className="choice-grid" data-testid="choice-grid">
              <article className="choice-card active" data-testid="choice-talk">
                <button type="button" className="choice-main" onClick={startTalk}>
                  <span className="choice-icon">
                    <PhoneCall size={24} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Talk</strong>
                    <small>English / Hindi</small>
                  </span>
                  <Send size={19} aria-hidden="true" />
                </button>
                <div className="language-toggle compact" aria-label={copy.languageLabel}>
                  {Object.values(content).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={item.key === language ? 'active' : ''}
                      aria-pressed={item.key === language}
                      onClick={() => setLanguage(item.key)}
                    >
                      {item.key === 'hinglish' ? 'Hindi' : item.shortLabel}
                    </button>
                  ))}
                </div>
              </article>

              <button
                type="button"
                className="choice-card disabled"
                disabled
                aria-disabled="true"
                data-testid="choice-text"
              >
                <span className="choice-icon muted">
                  <Keyboard size={24} aria-hidden="true" />
                </span>
                <span>
                  <strong>Text</strong>
                  <small>Coming soon</small>
                </span>
                <X size={18} aria-hidden="true" />
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
    </ProductionChrome>
  )
}

export default App

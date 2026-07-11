import {
  ArrowLeft,
  Camera,
  Check,
  FileText,
  Keyboard,
  Mic,
  Paperclip,
  Pencil,
  PhoneCall,
  Send,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import {
  type PointerEvent,
  type RefObject,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
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

// A locally-captured upload attached to the flow/consult state. LOCAL-ONLY for
// now (object-URL preview, no backend call). `kind` records how the real image
// pipeline should treat it at integration:
//   'clinical' = body-area photo -> multimodal diagnosis (no OCR)
//   'report'   = lab/report doc  -> v3.192 smart routing (OCR text vs multimodal)
type FlowUpload = {
  id: string
  source: 'showme' | 'summary'
  kind: 'clinical' | 'report'
  name: string
  mime: string
  url: string
  isImage: boolean
}

const SILENCE_ADVANCE_MS = 1500
const TTS_SAFETY_BUFFER_MS = 1800
const AVATAR_IDLE_SRC = '/talk-avatars/idle_raj_en.mp4'
const AVATAR_LISTENING_SRC = '/talk-avatars/raj_listening_loop_en.mp4'
type AvatarClipLang = 'en' | 'hi'

// Per-language filmed clip sources. A step with a real clip for the active
// language plays it (its own audio, TTS suppressed); a step with no clip for
// that language falls back to the listening loop + TTS (see resolveAvatarAsset),
// so a partially-filmed language still runs end-to-end.
const AVATAR_CLIP_SRC: Record<AvatarClipLang, Partial<Record<AvatarClipId, string>>> = {
  en: {
    g1: '/talk-avatars/raj_g1_en.mp4',
    q_duration: '/talk-avatars/raj_q_duration_en.mp4',
    q_severity: '/talk-avatars/raj_q_severity_en.mp4',
    q_betterworse: '/talk-avatars/raj_q_betterworse_en.mp4',
    q_showme: '/talk-avatars/raj_q_showme_en.mp4',
    q_ahh: '/talk-avatars/raj_q_ahh_en.mp4',
    q_contacts: '/talk-avatars/raj_q_contacts_en.mp4',
    q_travel: '/talk-avatars/raj_q_travel_en.mp4',
    q_ros: '/talk-avatars/raj_q_ros_en.mp4',
    q_hxintro: '/talk-avatars/raj_q_hxintro_en.mp4',
    q_allergies: '/talk-avatars/raj_q_allergies_en.mp4',
    q_meds: '/talk-avatars/raj_q_meds_en.mp4',
    q_conditions: '/talk-avatars/raj_q_conditions_en.mp4',
    q_surgeries: '/talk-avatars/raj_q_surgeries_en.mp4',
    q_pregnancy: '/talk-avatars/raj_q_pregnancy_en.mp4',
  },
  hi: {
    g1: '/talk-avatars/raj_g1_hi.mp4',
    q_duration: '/talk-avatars/raj_q_duration_hi.mp4',
    q_severity: '/talk-avatars/raj_q_severity_hi.mp4',
    q_betterworse: '/talk-avatars/raj_q_betterworse_hi.mp4',
    q_showme: '/talk-avatars/raj_q_showme_hi.mp4',
    q_ahh: '/talk-avatars/raj_q_ahh_hi.mp4',
    q_contacts: '/talk-avatars/raj_q_contacts_hi.mp4',
    q_travel: '/talk-avatars/raj_q_travel_hi.mp4',
    q_ros: '/talk-avatars/raj_q_ros_hi.mp4',
    q_hxintro: '/talk-avatars/raj_q_hxintro_hi.mp4',
    q_allergies: '/talk-avatars/raj_q_allergies_hi.mp4',
    // The Hindi script merges medicines + conditions into ONE filmed clip
    // (raj_q_conditionsmeds_hi). It plays on the medicines step; the conditions
    // step has no separate Hindi clip and falls back to the listening loop + TTS.
    q_meds: '/talk-avatars/raj_q_conditionsmeds_hi.mp4',
    q_surgeries: '/talk-avatars/raj_q_surgeries_hi.mp4',
    q_pregnancy: '/talk-avatars/raj_q_pregnancy_hi.mp4',
  },
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

// All 12 languages for the (visually complete, not-yet-wired) Text intake.
const TEXT_LANGUAGES = [
  'English',
  'Hindi',
  'Bengali',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Odia',
  'Punjabi',
  'Tamil',
  'Telugu',
  'Urdu',
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

async function unlockSessionAudio() {
  // Video autoplay is unlocked separately by AvatarEngine.unlock(), which must
  // run on the SAME persistent <video> elements that later play the clips.
  // Here we only resume the AudioContext so the TTS fallback (Hinglish path)
  // can speak without a second gesture.
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return
  try {
    const audio = new AudioContextClass()
    await audio.resume().finally(() => audio.close())
  } catch {
    // Browser support varies; not fatal to the avatar flow.
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

function estimateSpeechSafetyMs(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(3500, words * 430 + TTS_SAFETY_BUFFER_MS)
}

// Pregnancy is only clinically relevant for female patients of child-bearing age.
// Matches the production diagnosis rule (female + ~12-55, inclusive). If sex or age
// is unknown, DEFAULT TO SKIP (safer than wrongly asking).
const PREGNANCY_MIN_AGE = 12
const PREGNANCY_MAX_AGE = 55
function shouldAskPregnancy(gender?: string, age?: number): boolean {
  if (!gender || typeof age !== 'number' || !Number.isFinite(age)) return false
  const isFemale = gender.trim().toLowerCase() === 'female'
  return isFemale && age >= PREGNANCY_MIN_AGE && age <= PREGNANCY_MAX_AGE
}

function resolveAvatarAsset(language: LanguageKey, question?: IntakeQuestion): AvatarAsset {
  if (!question?.clipId) {
    return { kind: 'idle', src: AVATAR_IDLE_SRC }
  }

  const langCode: AvatarClipLang = language === 'en' ? 'en' : 'hi'
  const clipSrc = AVATAR_CLIP_SRC[langCode][question.clipId]
  if (!clipSrc) {
    return { kind: 'listening', src: AVATAR_LISTENING_SRC, missingClipId: question.clipId }
  }

  return { kind: 'clip', clipId: question.clipId, src: clipSrc }
}

// --- iOS-safe avatar engine ---------------------------------------------------
// The core fix. iOS Safari grants programmatic autoplay to a <video> element
// ONLY if that same element called .play() during a real user gesture. So we
// keep TWO persistent elements that are (a) mounted before the Talk tap, (b)
// unlocked inside that tap, and (c) never remounted. Clips are shown by swapping
// .src on the hidden buffer element and crossfading opacity between the pair —
// no element is ever created after the gesture, which kills BOTH the play button
// and the per-clip remount flash.

type AvatarCommand = {
  src: string
  muted: boolean
  loop: boolean
  token: string
  onEnded?: () => void
}

export type AvatarEngineHandle = {
  unlock: () => void
  play: (command: AvatarCommand) => void
  hide: () => void
}

function describeError(error: unknown) {
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name?: unknown }).name ?? error)
  }
  return String(error)
}

const AvatarEngine = forwardRef<AvatarEngineHandle, { onDebug?: (message: string) => void }>(
  function AvatarEngine({ onDebug }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const videoARef = useRef<HTMLVideoElement | null>(null)
    const videoBRef = useRef<HTMLVideoElement | null>(null)
    // Which element is currently shown ('a' | 'b'); the other is the buffer.
    const frontRef = useRef<'a' | 'b'>('a')
    const currentTokenRef = useRef('')

    useImperativeHandle(ref, () => ({
      unlock() {
        // MUST run synchronously inside the Talk-tap handler. The listening loop
        // is silent, so we unlock UNMUTED to give iOS the strongest activation
        // signal (which is what later allows the UNMUTED question clips to play).
        for (const node of [videoARef.current, videoBRef.current]) {
          if (!node) continue
          try {
            node.muted = false
            const promise = node.play()
            if (promise && typeof promise.then === 'function') {
              promise
                .then(() => {
                  node.pause()
                  node.currentTime = 0
                  node.muted = true
                })
                .catch((error: unknown) => {
                  onDebug?.(`unlock ${describeError(error)}`)
                  node.muted = true
                  const retry = node.play()
                  if (retry && typeof retry.then === 'function') {
                    retry
                      .then(() => {
                        node.pause()
                        node.currentTime = 0
                      })
                      .catch(() => undefined)
                  }
                })
            }
          } catch (error) {
            onDebug?.(`unlock ${describeError(error)}`)
          }
        }
      },
      play(command: AvatarCommand) {
        const container = containerRef.current
        container?.classList.add('is-visible')

        // Already showing this clip (e.g. loop held across speaking->listening).
        if (command.token === currentTokenRef.current) return
        currentTokenRef.current = command.token

        const frontKey = frontRef.current
        const front = frontKey === 'a' ? videoARef.current : videoBRef.current
        const back = frontKey === 'a' ? videoBRef.current : videoARef.current
        if (!front || !back) return

        const myToken = command.token
        back.onended = null
        back.loop = command.loop
        back.muted = command.muted
        // Only reload the file when the buffer isn't already holding it — this
        // keeps the listening loop warm instead of re-fetching every turn.
        if (back.dataset.clipSrc !== command.src) {
          back.dataset.clipSrc = command.src
          back.src = command.src
        }
        if (command.onEnded && !command.loop) {
          back.onended = () => {
            if (currentTokenRef.current === myToken) command.onEnded?.()
          }
        }

        const reveal = () => {
          if (currentTokenRef.current !== myToken) return
          back.classList.add('is-front')
          front.classList.remove('is-front')
          frontRef.current = frontKey === 'a' ? 'b' : 'a'
          // Pause the outgoing element once the opacity crossfade has finished.
          window.setTimeout(() => {
            if (frontRef.current !== frontKey) {
              front.onended = null
              try {
                front.pause()
              } catch {
                // ignore
              }
            }
          }, 340)
        }

        const attempt = (mutedFallback: boolean) => {
          let promise: Promise<void> | undefined
          try {
            promise = back.play() as Promise<void> | undefined
          } catch (error) {
            onDebug?.(`play ${describeError(error)}`)
          }
          if (promise && typeof promise.then === 'function') {
            promise.then(reveal).catch((error: unknown) => {
              onDebug?.(`play ${command.token} ${describeError(error)}`)
              if (!mutedFallback) {
                // Element wasn't allowed to play with sound — show it muted so
                // Raj at least moves, and surface the reason via onDebug.
                back.muted = true
                attempt(true)
              } else if (command.onEnded && !command.loop) {
                // Last resort: never strand the flow if a clip cannot play here.
                window.setTimeout(() => {
                  if (currentTokenRef.current === myToken) command.onEnded?.()
                }, 900)
              }
            })
          } else {
            reveal()
          }
        }

        // Reveal only once the buffer has a frame, so there is no flash/seam.
        if (back.readyState >= 2) {
          attempt(false)
        } else {
          const onCanPlay = () => {
            back.removeEventListener('canplay', onCanPlay)
            if (currentTokenRef.current === myToken) attempt(false)
          }
          back.addEventListener('canplay', onCanPlay)
        }
      },
      hide() {
        containerRef.current?.classList.remove('is-visible')
        currentTokenRef.current = ''
        for (const node of [videoARef.current, videoBRef.current]) {
          if (!node) continue
          node.onended = null
          try {
            node.pause()
          } catch {
            // ignore
          }
        }
      },
    }))

    return (
      <div className="avatar-engine" ref={containerRef} data-testid="avatar-engine" aria-hidden="true">
        <video
          ref={videoARef}
          className="avatar-engine-video"
          src={AVATAR_LISTENING_SRC}
          data-clip-src={AVATAR_LISTENING_SRC}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
        />
        <video
          ref={videoBRef}
          className="avatar-engine-video"
          src={AVATAR_LISTENING_SRC}
          data-clip-src={AVATAR_LISTENING_SRC}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
        />
      </div>
    )
  },
)

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
  engineRef,
  patientGender,
  patientAge,
  onBack,
}: {
  language: LanguageKey
  mediaStream: MediaStream | null
  permissionStatus: TalkPermissionStatus
  engineRef: RefObject<AvatarEngineHandle | null>
  patientGender?: string
  patientAge?: number
  onBack: () => void
}) {
  const copy = content[language].talk
  const askPregnancy = shouldAskPregnancy(patientGender, patientAge)
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
  // Locally-attached uploads (show-me clinical photo + summary photos/reports).
  const [uploads, setUploads] = useState<FlowUpload[]>([])
  const uploadsRef = useRef<FlowUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingUploadRef = useRef<{ source: FlowUpload['source']; kind: FlowUpload['kind'] } | null>(null)
  const speech = useSpeechRecognition({
    language,
    continuous: true,
    initialSilenceTimeoutMs: 8500,
    endOfSpeechTimeoutMs: SILENCE_ADVANCE_MS,
    autoStopOnFinal: false,
  })
  // The pregnancy step is dropped entirely (not shown, spoken, or in the summary)
  // for patients where it is not clinically relevant.
  const visibleQuestions = copy.questions.filter(
    (question) => question.field !== 'pregnancy' || askPregnancy,
  )
  const visibleFieldKeys = INTAKE_FIELD_KEYS.filter(
    (field) => field !== 'pregnancy' || askPregnancy,
  )
  const clampedIndex = Math.min(questionIndex, visibleQuestions.length - 1)
  const activeQuestion = visibleQuestions[clampedIndex]
  const activeField = activeQuestion.field
  const activeAvatarAsset = resolveAvatarAsset(language, activeQuestion)
  const totalQuestions = visibleQuestions.length
  const progress = Math.round(((clampedIndex + 1) / totalQuestions) * 100)
  const captureTokenRef = useRef('')
  const hiddenTranscriptRef = useRef<string[]>([])
  const activeTurnRef = useRef({
    field: activeField,
    questionIndex: clampedIndex,
    questionText: activeQuestion.text,
  })

  useEffect(() => {
    activeTurnRef.current = {
      field: activeField,
      questionIndex: clampedIndex,
      questionText: activeQuestion.text,
    }
  }, [activeField, activeQuestion.text, clampedIndex])

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    clearUploads()
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

  // Drive the persistent AvatarEngine. useLayoutEffect so the engine is made
  // visible (and the crossfade begins) before the browser paints the Talk
  // screen — no light flash, no seam. Both engine elements were already
  // unlocked in the Talk-tap gesture, so unmuted clips are allowed to play.
  useLayoutEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (phase === 'summary' || phase === 'submitted') {
      engine.hide()
      return
    }
    if (phase === 'speaking' && activeAvatarAsset.kind === 'clip') {
      engine.play({
        src: activeAvatarAsset.src,
        muted: false,
        loop: false,
        token: `clip:${clampedIndex}`,
        onEnded: handleAvatarClipEnded,
      })
    } else {
      // Listening, or a question with no filmed clip (TTS path): Raj nods on the
      // silent listening loop. It's interruptible — the next `play()` cuts it.
      engine.play({
        src: AVATAR_LISTENING_SRC,
        muted: true,
        loop: true,
        token: 'loop',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIndex, activeAvatarAsset.kind, activeAvatarAsset.src])

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

  // --- Local-only uploads (photos / reports) ---------------------------------
  function openUploadPicker(source: FlowUpload['source'], kind: FlowUpload['kind'], accept: string) {
    pendingUploadRef.current = { source, kind }
    const input = fileInputRef.current
    if (!input) return
    input.accept = accept
    input.value = ''
    input.click()
  }

  function handleUploadChosen(fileList: FileList | null) {
    const file = fileList?.[0]
    const meta = pendingUploadRef.current
    if (!file || !meta) return
    const isImage = file.type.startsWith('image/')
    const upload: FlowUpload = {
      id: `${meta.source}-${Date.now()}`,
      source: meta.source,
      kind: meta.kind,
      name: file.name,
      mime: file.type,
      url: URL.createObjectURL(file),
      isImage,
    }
    // Attach to flow/consult state ONLY. No network call here.
    // TODO(integration): send clinical image to multimodal diagnosis pipeline
    //   (show-me photos, kind='clinical'); route summary uploads via the v3.192
    //   image pipeline (OCR-vs-multimodal) — see Stage 4 hook.
    setUploads((prev) => {
      let base = prev
      if (meta.source === 'showme') {
        // The show-me step holds a single clinical photo — replace the previous.
        const old = prev.find((u) => u.source === 'showme')
        if (old) URL.revokeObjectURL(old.url)
        base = prev.filter((u) => u.source !== 'showme')
      }
      return [...base, upload]
    })
    pendingUploadRef.current = null
  }

  function removeUpload(id: string) {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((u) => u.id !== id)
    })
  }

  function clearUploads() {
    setUploads((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u.url))
      return []
    })
  }

  // Revoke any object URLs when the Talk shell unmounts.
  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.url))
    }
  }, [])

  function restartScript() {
    clearUploads()
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

  // Prominent "Add a photo" on the show-me step. accept="image/*" WITHOUT capture
  // so mobile offers BOTH the camera and the photo library. Local-only.
  function renderShowMePhoto() {
    const photo = uploads.find((u) => u.source === 'showme')
    return (
      <div className="clinical-uploader" data-testid="showme-uploader">
        {photo ? (
          <div className="upload-thumb-row">
            <img className="upload-thumb" src={photo.url} alt={copy.photoAttached} />
            <div className="upload-thumb-meta">
              <span className="upload-thumb-name">{copy.photoAttached}</span>
              <div className="upload-thumb-actions">
                <button
                  type="button"
                  className="upload-mini-btn"
                  onClick={() => openUploadPicker('showme', 'clinical', 'image/*')}
                >
                  <Camera size={14} aria-hidden="true" />
                  <span>{copy.replacePhoto}</span>
                </button>
                <button
                  type="button"
                  className="upload-mini-btn danger"
                  onClick={() => removeUpload(photo.id)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>{copy.removePhoto}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="photo-add-btn"
            onClick={() => openUploadPicker('showme', 'clinical', 'image/*')}
            data-testid="showme-add-photo"
          >
            <Camera size={20} aria-hidden="true" />
            <span>{copy.addPhoto}</span>
          </button>
        )}
      </div>
    )
  }

  // Optional photo/report uploader on the summary page. accept images AND pdf so a
  // lab/report doc works too (camera/gallery/file). Tagged 'report' -> at
  // integration this routes via the v3.192 smart pipeline (OCR text vs multimodal).
  function renderSummaryUploader() {
    const items = uploads.filter((u) => u.source === 'summary')
    return (
      <section className="summary-upload-card" data-testid="summary-uploader" aria-label={copy.addPhotoOrReport}>
        <span className="summary-card-label">{copy.uploadTitle}</span>
        {items.length ? (
          <div className="summary-upload-items">
            {items.map((item) => (
              <div className="summary-upload-item" key={item.id}>
                {item.isImage ? (
                  <img className="upload-thumb" src={item.url} alt={item.name} />
                ) : (
                  <span className="doc-chip">
                    <FileText size={15} aria-hidden="true" />
                    <span className="doc-chip-name">{item.name}</span>
                  </span>
                )}
                <button
                  type="button"
                  className="summary-remove-btn"
                  onClick={() => removeUpload(item.id)}
                  aria-label={`${copy.removePhoto} ${item.name}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>{copy.removePhoto}</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="summary-upload-add"
          onClick={() => openUploadPicker('summary', 'report', 'image/*,application/pdf')}
          data-testid="summary-add-upload"
        >
          <Paperclip size={16} aria-hidden="true" />
          <span>{items.length ? copy.addAnother : copy.addPhotoOrReport}</span>
        </button>
        {/* TODO(integration): route summary upload via v3.192 image pipeline
            (OCR-vs-multimodal): text-bearing report -> OCR to text; clinical photo
            -> multimodal; genuinely unreadable -> soft re-upload prompt. */}
      </section>
    )
  }

  function renderConversationContent() {
    if (phase === 'summary') {
      const answeredCount = visibleFieldKeys.filter((field) => intakeData.answers[field].value).length
      return (
        <div className="summary-view" data-testid="intake-summary">
          <header className="summary-head">
            <h2 id="talk-title">{copy.reviewTitle}</h2>
            <p className="summary-sub">{copy.closingSpoken}</p>
            <p className="summary-progress">
              {copy.answeredFormat.replace('{n}', String(answeredCount)).replace('{t}', String(totalQuestions))}
            </p>
          </header>

          <div className="summary-list">
            {visibleFieldKeys.map((field) => {
              const answer = intakeData.answers[field]
              const editing = editingSummaryField === field
              const label = copy.fieldLabels[field]
              return (
                <article
                  className={`summary-card ${editing ? 'editing' : ''}`}
                  key={field}
                  data-summary-field={field}
                >
                  <div className="summary-card-top">
                    <span className="summary-card-label">{label}</span>
                    {!editing ? (
                      <button
                        type="button"
                        className="summary-edit-btn"
                        onClick={() => startInlineEdit(field)}
                        aria-label={`${copy.editAction} ${label}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        <span>{copy.editAction}</span>
                      </button>
                    ) : null}
                  </div>
                  {editing ? (
                    <div className="summary-edit-area">
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
                        autoFocus
                        aria-label={`${copy.editAction} ${label}`}
                        data-testid={`summary-edit-${field}`}
                      />
                      <div className="summary-edit-actions">
                        <button
                          type="button"
                          className="summary-btn primary"
                          onPointerDown={(event) => {
                            event.preventDefault()
                            saveInlineEdit()
                          }}
                          onClick={saveInlineEdit}
                        >
                          <Check size={15} aria-hidden="true" />
                          <span>{copy.saveAction}</span>
                        </button>
                        <button
                          type="button"
                          className="summary-btn"
                          onClick={() => {
                            setEditingSummaryField(null)
                            setInlineEditDraft('')
                          }}
                        >
                          <X size={15} aria-hidden="true" />
                          <span>{copy.cancelAction}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`summary-card-answer ${answer.value ? '' : 'empty'}`}>
                      {answer.value || copy.missingAnswer}
                    </p>
                  )}
                </article>
              )
            })}
            {openEditNote ? (
              <article className="summary-card" data-summary-field="openEdit">
                <div className="summary-card-top">
                  <span className="summary-card-label">{copy.openEditLabel}</span>
                </div>
                <p className="summary-card-answer">{openEditNote}</p>
              </article>
            ) : null}
            {renderSummaryUploader()}
          </div>

          <div className="summary-footer">
            <p className="summary-note">{summaryEditMessage || copy.summaryInvitation}</p>
            <button
              type="button"
              className="summary-submit"
              onPointerDown={(event) => {
                event.preventDefault()
                submitSummary()
              }}
              onClick={submitSummary}
              data-testid="summary-submit"
            >
              {copy.submitAction}
            </button>
          </div>
        </div>
      )
    }

    if (phase === 'submitted') {
      return (
        <div className="summary-done" data-testid="intake-submitted">
          <div className="summary-done-badge" aria-hidden="true">
            <Check size={30} />
          </div>
          <p className="eyebrow">{copy.submittedEyebrow}</p>
          <h2 id="talk-title">{copy.submittedTitle}</h2>
          <p className="summary-done-copy">{copy.submittedBody}</p>
          <button type="button" className="secondary-action" onClick={restartScript}>
            {copy.restart}
          </button>
        </div>
      )
    }

    return (
      <div className="turn-ui" data-turn-state={phase}>
        <div className="flow-topline" aria-label={`Question ${clampedIndex + 1} of ${totalQuestions}`}>
          <span>{phase === 'speaking' ? copy.askingLabel : copy.answeringLabel}</span>
          <span>
            {clampedIndex + 1}/{totalQuestions}
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
        {activeField === 'showMe' ? renderShowMePhoto() : null}
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
      {/* The avatar itself is the persistent AvatarEngine rendered behind the
          Talk shell (App root). This shell only holds the overlays. */}
      <SelfView language={language} mediaStream={mediaStream} permissionStatus={permissionStatus} />
      <div className="conversation-panel" data-testid="control-area" data-phase={phase}>
        {renderConversationContent()}
      </div>
      {/* Shared hidden picker for all local-only uploads (show-me + summary). */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="visually-hidden-input"
        onChange={(event) => handleUploadChosen(event.target.files)}
        aria-hidden="true"
        tabIndex={-1}
      />
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
  const [selectedChoice, setSelectedChoice] = useState<ChoiceKey | null>(null)
  const [textLanguage, setTextLanguage] = useState(TEXT_LANGUAGES[0])
  const avatarEngineRef = useRef<AvatarEngineHandle>(null)

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
    // NOTE: avatarEngineRef.current.unlock() is called SYNCHRONOUSLY in the Talk
    // tap handler (below) — it must run inside the user gesture, before any await.
    const t = content[language].talk
    setMode('permissions')
    setTalkPermissionStatus('requesting')
    setTalkPermissionMessage(t.permAllow)
    await unlockSessionAudio()
    primeSpeechSynthesis(language)

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))

    const result = await requestTalkMediaStream(talkMediaStream)
    setTalkPermissionStatus(result.status)

    if (result.status === 'granted') {
      setTalkMediaStream(result.stream)
      setTalkPermissionMessage(t.permReady)
      setMode('talk')
      return
    }

    setTalkPermissionMessage(result.status === 'unsupported' ? t.permUnsupported : t.permBlocked)
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
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0]
  const talkCopy = content[language].talk

  return (
    <ProductionChrome
      members={patients}
      selectedId={selectedPatientId}
      activeNav="consult"
      onSwitchPatient={setSelectedPatientId}
    >
      {/* Persistent, always-mounted so its two <video> elements exist BEFORE the
          Talk tap and can be unlocked inside that gesture. Sits behind the shell.
          onDebug logs .play() rejections to the console — visible on a real iPhone
          via Mac Safari Web Inspector (Develop -> [iPhone] -> Console). */}
      <AvatarEngine ref={avatarEngineRef} onDebug={(message) => console.warn('[avatar]', message)} />
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
                    // Unlock the persistent avatar elements INSIDE the gesture —
                    // this is the whole fix. Must be synchronous, before awaits.
                    avatarEngineRef.current?.unlock()
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
                </button>
                <span className="choice-label">
                  <PhoneCall size={17} aria-hidden="true" />
                  Talk
                </span>
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
                  {/* #t=0.5 seeks the file so a real Raj frame paints as a still */}
                  <video
                    src={`${AVATAR_IDLE_SRC}#t=0.5`}
                    className="choice-text-still"
                    muted
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                  />
                  <div className="text-preview" aria-hidden="true">
                    <span>What brings you in?</span>
                    <span>How long has it been?</span>
                    <span>Any allergies?</span>
                  </div>
                </button>
                <span className="choice-label">
                  <Keyboard size={17} aria-hidden="true" />
                  Text
                </span>
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
              <p className="eyebrow">{talkCopy.permEyebrow}</p>
              <h1 id="permission-title">{talkCopy.permTitle}</h1>
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
                  {talkCopy.permContinueTyped}
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <TalkShell
            language={language}
            mediaStream={talkMediaStream}
            permissionStatus={talkPermissionStatus}
            engineRef={avatarEngineRef}
            patientGender={selectedPatient?.gender}
            patientAge={selectedPatient?.age}
            onBack={() => {
              avatarEngineRef.current?.hide()
              setMode('entry')
            }}
          />
        )}
      </main>
    </ProductionChrome>
  )
}

export default App

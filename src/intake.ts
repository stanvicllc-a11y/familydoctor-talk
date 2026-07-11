import type { LanguageKey } from './content'

export type IntakeFieldKey =
  | 'chiefComplaint'
  | 'duration'
  | 'severity'
  | 'betterWorse'
  | 'showMe'
  | 'throatCheck'
  | 'sickContacts'
  | 'recentTravel'
  | 'associatedSymptoms'
  | 'historyIntro'
  | 'allergies'
  | 'currentMedications'
  | 'conditions'
  | 'surgeries'
  | 'pregnancy'

export type AvatarClipId =
  | 'g1'
  | 'q_duration'
  | 'q_severity'
  | 'q_betterworse'
  | 'q_showme'
  | 'q_ahh'
  | 'q_contacts'
  | 'q_travel'
  | 'q_ros'
  | 'q_hxintro'
  | 'q_allergies'
  | 'q_meds'
  | 'q_conditions'
  | 'q_surgeries'
  | 'q_pregnancy'

export type IntakeAnswerSource = 'speech' | 'typed'

export type IntakeFieldAnswer = {
  value: string
  rawTranscript: string
  source: IntakeAnswerSource
  capturedAt: string
}

export type IntakeData = {
  language: LanguageKey
  startedAt: string
  updatedAt: string
  answers: Record<IntakeFieldKey, IntakeFieldAnswer>
}

export type IntakeQuestion = {
  field: IntakeFieldKey
  text: string
  clipId?: AvatarClipId
}

export const INTAKE_FIELD_KEYS: IntakeFieldKey[] = [
  'chiefComplaint',
  'duration',
  'severity',
  'betterWorse',
  'showMe',
  'throatCheck',
  'sickContacts',
  'recentTravel',
  'associatedSymptoms',
  'historyIntro',
  'allergies',
  'currentMedications',
  'conditions',
  'surgeries',
  'pregnancy',
]

export function createEmptyIntake(language: LanguageKey): IntakeData {
  const now = new Date().toISOString()
  const blankAnswer: IntakeFieldAnswer = {
    value: '',
    rawTranscript: '',
    source: 'speech',
    capturedAt: '',
  }

  return {
    language,
    startedAt: now,
    updatedAt: now,
    answers: Object.fromEntries(
      INTAKE_FIELD_KEYS.map((field) => [field, { ...blankAnswer }]),
    ) as Record<IntakeFieldKey, IntakeFieldAnswer>,
  }
}

export function withIntakeAnswer(
  intake: IntakeData,
  field: IntakeFieldKey,
  rawTranscript: string,
  source: IntakeAnswerSource,
): IntakeData {
  const now = new Date().toISOString()
  const value = rawTranscript.trim()

  return {
    ...intake,
    updatedAt: now,
    answers: {
      ...intake.answers,
      [field]: {
        value,
        rawTranscript: value,
        source,
        capturedAt: now,
      },
    },
  }
}

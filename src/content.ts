export type LanguageKey = 'en' | 'hinglish'

type LanguageContent = {
  key: LanguageKey
  shortLabel: string
  languageLabel: string
  entry: {
    eyebrow: string
    title: string
    subtitle: string
    cta: string
    privacy: string
  }
  talk: {
    eyebrow: string
    title: string
    body: string
    back: string
  }
}

export const content: Record<LanguageKey, LanguageContent> = {
  en: {
    key: 'en',
    shortLabel: 'English',
    languageLabel: 'Choose language',
    entry: {
      eyebrow: 'Talk staging',
      title: 'Talk to a doctor',
      subtitle:
        'A private voice-first intake shell for testing the future consultation flow.',
      cta: 'Talk to a doctor',
      privacy: 'Stage build only: no recording, no upload, no backend writes.',
    },
    talk: {
      eyebrow: 'Placeholder Talk screen',
      title: 'Conversation shell is ready for Stage 2',
      body: 'The next stage adds the avatar surface, local self-view camera box, and scripted turn-taking flow.',
      back: 'Back to entry screen',
    },
  },
  hinglish: {
    key: 'hinglish',
    shortLabel: 'Hinglish',
    languageLabel: 'Language chuniye',
    entry: {
      eyebrow: 'Talk staging',
      title: 'Doctor se baat karein',
      subtitle:
        'Future consultation flow ke liye private voice-first intake shell.',
      cta: 'Doctor se baat karein',
      privacy: 'Stage build only: recording nahi, upload nahi, backend write nahi.',
    },
    talk: {
      eyebrow: 'Placeholder Talk screen',
      title: 'Conversation shell Stage 2 ke liye ready hai',
      body: 'Next stage mein avatar surface, local self-view camera box, aur scripted turn-taking flow add hoga.',
      back: 'Entry screen par wapas',
    },
  },
}

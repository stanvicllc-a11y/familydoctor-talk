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
    localVideo: string
    cameraOff: string
    cameraDenied: string
    avatarStatus: string
    controlTitle: string
    controlBody: string
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
      eyebrow: 'Talk shell',
      title: 'Dr. Maya is getting ready',
      body: 'Stage 2 shell placeholder',
      back: 'Back to entry screen',
      localVideo: 'Your video is local only and is not recorded.',
      cameraOff: 'Camera preview unavailable',
      cameraDenied: 'Camera permission denied. You can continue with preview off.',
      avatarStatus: 'Avatar placeholder',
      controlTitle: 'Intake shell',
      controlBody: 'Question flow arrives in Stage 2b.',
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
      eyebrow: 'Talk shell',
      title: 'Dr. Maya ready ho rahi hain',
      body: 'Stage 2 shell placeholder',
      back: 'Entry screen par wapas',
      localVideo: 'Aapka video sirf local hai, record nahi hota.',
      cameraOff: 'Camera preview available nahi hai',
      cameraDenied: 'Camera permission denied. Preview off ke saath continue kar sakte hain.',
      avatarStatus: 'Avatar placeholder',
      controlTitle: 'Intake shell',
      controlBody: 'Question flow Stage 2b mein aayega.',
    },
  },
}

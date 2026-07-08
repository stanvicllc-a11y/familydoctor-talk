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
    askingLabel: string
    answeringLabel: string
    tapToAnswer: string
    simulateAnswer: string
    nextQuestion: string
    summaryTitle: string
    summaryBody: string
    prescriptionTitle: string
    prescriptionBody: string
    downloadTitle: string
    downloadBody: string
    downloadCta: string
    restart: string
    questions: string[]
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
      controlBody: 'Placeholder turn-taking is active.',
      askingLabel: 'Doctor is asking',
      answeringLabel: 'Mic placeholder active',
      tapToAnswer: 'Tap to answer',
      simulateAnswer: 'Simulate answer',
      nextQuestion: 'Next question',
      summaryTitle: 'Placeholder summary',
      summaryBody:
        'This screen will later summarize the real intake. For now it proves the handoff after the scripted questions.',
      prescriptionTitle: 'Placeholder prescription',
      prescriptionBody:
        'No prescription is generated in this staging shell. This is only the future review surface.',
      downloadTitle: 'Download placeholder',
      downloadBody:
        'The download button creates a local placeholder text file. No patient data is uploaded.',
      downloadCta: 'Download placeholder',
      restart: 'Restart script',
      questions: [
        'What brings you in today?',
        'How long have you had these symptoms?',
        'Do you have fever, chills, or body aches?',
        'Are you having chest pain, breathing trouble, or severe weakness?',
        'Have you taken any medicine for this problem?',
        'Do you have any allergies to medicines?',
        'Do you have diabetes, blood pressure, asthma, or any long-term condition?',
        'Are you pregnant, breastfeeding, or caring for a child patient?',
        'Have you seen a doctor for this issue before?',
        'Is there anything else you want the doctor to know?',
      ],
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
      controlBody: 'Placeholder turn-taking active hai.',
      askingLabel: 'Doctor pooch rahe hain',
      answeringLabel: 'Mic placeholder active',
      tapToAnswer: 'Answer dene ke liye tap karein',
      simulateAnswer: 'Answer simulate karein',
      nextQuestion: 'Next question',
      summaryTitle: 'Placeholder summary',
      summaryBody:
        'Baad mein yahan real intake ka summary dikhega. Abhi yeh scripted questions ke baad handoff prove karta hai.',
      prescriptionTitle: 'Placeholder prescription',
      prescriptionBody:
        'Is staging shell mein prescription generate nahi hota. Yeh sirf future review surface hai.',
      downloadTitle: 'Download placeholder',
      downloadBody:
        'Download button ek local placeholder text file banata hai. Patient data upload nahi hota.',
      downloadCta: 'Placeholder download karein',
      restart: 'Script restart karein',
      questions: [
        'Aaj aapko kya problem ho rahi hai?',
        'Yeh symptoms kab se hain?',
        'Aapko fever, chills, ya body pain hai?',
        'Chest pain, saans lene mein dikkat, ya bahut zyada weakness hai?',
        'Is problem ke liye koi medicine li hai?',
        'Kisi medicine se allergy hai?',
        'Diabetes, blood pressure, asthma, ya koi long-term condition hai?',
        'Kya aap pregnant hain, breastfeeding kar rahi hain, ya child patient ke liye baat kar rahe hain?',
        'Is issue ke liye pehle doctor ko dikhaya hai?',
        'Doctor ko aur kuch important batana chahenge?',
      ],
    },
  },
}

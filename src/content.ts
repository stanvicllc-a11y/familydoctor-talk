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
  speech: {
    disclosure: string
    harnessTitle: string
    harnessStart: string
    harnessStop: string
    harnessReset: string
    harnessPlaceholder: string
    unsupported: string
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
    startSpeaking: string
    doneSpeaking: string
    typeInstead: string
    typedPlaceholder: string
    confirmPrompt: string
    confirmAnswer: string
    redoAnswer: string
    fallbackTitle: string
    fallbackBody: string
    noTranscript: string
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
    speech: {
      disclosure:
        'Your voice is turned into text so the doctor can understand you. Your audio is not saved by this app.',
      harnessTitle: 'Speech test',
      harnessStart: 'Start mic test',
      harnessStop: 'Done',
      harnessReset: 'Reset',
      harnessPlaceholder: 'Transcript appears here.',
      unsupported:
        'Speech recognition is not available in this browser. You can still type answers later in the flow.',
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
      startSpeaking: 'Start speaking',
      doneSpeaking: "I'm finished",
      typeInstead: 'Type instead',
      typedPlaceholder: 'Type your answer here',
      confirmPrompt: 'Did I get that right?',
      confirmAnswer: 'Yes, continue',
      redoAnswer: 'Record again',
      fallbackTitle: 'Type your answer',
      fallbackBody:
        'Speech is not working here. You can type this answer and continue safely.',
      noTranscript: "I didn't catch that. Please try again or type instead.",
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
    speech: {
      disclosure:
        'Aapki awaaz ko text mein badla jaata hai taaki doctor samajh sake. Yeh app aapka audio save nahi karti.',
      harnessTitle: 'Speech test',
      harnessStart: 'Mic test start karein',
      harnessStop: 'Done',
      harnessReset: 'Reset',
      harnessPlaceholder: 'Transcript yahan dikhega.',
      unsupported:
        'Is browser mein speech recognition available nahi hai. Flow mein baad mein type karke answer de sakte hain.',
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
      startSpeaking: 'Bolna start karein',
      doneSpeaking: 'Main bol chuka/chuki hoon',
      typeInstead: 'Type karein',
      typedPlaceholder: 'Apna answer yahan type karein',
      confirmPrompt: 'Kya maine sahi samjha?',
      confirmAnswer: 'Haan, continue',
      redoAnswer: 'Dobara record karein',
      fallbackTitle: 'Apna answer type karein',
      fallbackBody:
        'Yahan speech kaam nahi kar rahi. Aap answer type karke safely continue kar sakte hain.',
      noTranscript: 'Mujhe clear nahi mila. Dobara boliye ya type karein.',
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

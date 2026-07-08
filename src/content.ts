import type { IntakeFieldKey, IntakeQuestion } from './intake'

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
    cameraOff: string
    cameraDenied: string
    avatarStatus: string
    controlTitle: string
    controlBody: string
    askingLabel: string
    answeringLabel: string
    preparingStatus: string
    listeningStatus: string
    reflectionDefault: string
    tapToAnswer: string
    simulateAnswer: string
    typeInstead: string
    typedPlaceholder: string
    confirmAnswer: string
    fallbackTitle: string
    fallbackBody: string
    noTranscript: string
    nextQuestion: string
    summaryTitle: string
    summaryBody: string
    closingSpoken: string
    summaryInvitation: string
    summaryListeningStatus: string
    summaryTypeInstead: string
    editPlaceholder: string
    applyEdit: string
    editApplied: string
    editNoted: string
    openEditLabel: string
    prescriptionTitle: string
    prescriptionBody: string
    downloadTitle: string
    downloadBody: string
    downloadCta: string
    restart: string
    missingAnswer: string
    fieldLabels: Record<IntakeFieldKey, string>
    questions: IntakeQuestion[]
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
      title: 'Dr. Arjun is ready',
      body: 'Stage 2 shell placeholder',
      back: 'Back to entry screen',
      cameraOff: 'Camera preview unavailable',
      cameraDenied: 'Camera permission denied. You can continue with preview off.',
      avatarStatus: 'Warm male doctor avatar',
      controlTitle: 'Intake shell',
      controlBody: 'Placeholder turn-taking is active.',
      askingLabel: 'Doctor is asking',
      answeringLabel: 'Listening',
      preparingStatus: 'Dr. Arjun is getting the next question ready.',
      listeningStatus: 'Listening. Speak naturally, then pause when you are finished.',
      reflectionDefault: 'Thank you. I am keeping that in the picture.',
      tapToAnswer: 'Tap to answer',
      simulateAnswer: 'Simulate answer',
      typeInstead: 'Type instead',
      typedPlaceholder: 'Type your answer here',
      confirmAnswer: 'Yes, continue',
      fallbackTitle: 'Type your answer',
      fallbackBody:
        'Speech is not working here. You can type this answer and continue safely.',
      noTranscript: "I didn't catch that. Please try again or type instead.",
      nextQuestion: 'Next question',
      summaryTitle: 'Intake summary',
      summaryBody:
        'This screen will later summarize the real intake. For now it proves the handoff after the scripted questions.',
      closingSpoken:
        'Thank you. I have a careful summary now. Before we continue, is there anything you want to change or add?',
      summaryInvitation: 'Anything you want to change or add before we continue?',
      summaryListeningStatus: 'Listening for one change or addition.',
      summaryTypeInstead: 'Type a change',
      editPlaceholder: 'Say or type one change or addition',
      applyEdit: 'Apply change',
      editApplied: 'I added that to the matching part of your summary.',
      editNoted: 'I noted that as an extra change for the doctor.',
      openEditLabel: 'Patient change or addition',
      prescriptionTitle: 'Placeholder prescription',
      prescriptionBody:
        'No prescription is generated in this staging shell. This is only the future review surface.',
      downloadTitle: 'Download placeholder',
      downloadBody:
        'The download button creates a local placeholder text file. No patient data is uploaded.',
      downloadCta: 'Download placeholder',
      restart: 'Restart script',
      missingAnswer: 'No answer captured yet',
      fieldLabels: {
        chiefComplaint: 'Main problem',
        duration: 'Duration',
        severity: 'Severity and impact',
        associatedSymptoms: 'Other symptoms',
        triedRemedies: 'Tried remedies or medicines',
        allergies: 'Allergies',
        currentMedications: 'Current medicines',
        recentTravel: 'Recent travel or unusual food',
        sickContacts: 'Sick contacts',
        pastHistory: 'Long-term conditions or past surgeries',
      },
      questions: [
        {
          field: 'chiefComplaint',
          text: 'What is the main problem you want help with today?',
        },
        {
          field: 'duration',
          text: 'When did this start, and has it been getting better or worse?',
        },
        {
          field: 'severity',
          text: 'How bad is it, and how is it affecting your day?',
        },
        {
          field: 'associatedSymptoms',
          text: 'What other symptoms have you noticed, like fever, cough, pain, vomiting, or breathing trouble?',
        },
        {
          field: 'triedRemedies',
          text: 'What medicines or home remedies have you already tried for this?',
        },
        {
          field: 'allergies',
          text: 'Do you have any allergies to medicines or foods?',
        },
        {
          field: 'currentMedications',
          text: 'What medicines or supplements do you take regularly?',
        },
        {
          field: 'recentTravel',
          text: 'Have you travelled recently or eaten anything unusual?',
        },
        {
          field: 'sickContacts',
          text: 'Has anyone around you been sick with similar symptoms?',
        },
        {
          field: 'pastHistory',
          text: 'Do you have any long-term conditions or past surgeries the doctor should know about?',
        },
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
      title: 'Dr. Arjun ready hain',
      body: 'Stage 2 shell placeholder',
      back: 'Entry screen par wapas',
      cameraOff: 'Camera preview available nahi hai',
      cameraDenied: 'Camera permission denied. Preview off ke saath continue kar sakte hain.',
      avatarStatus: 'Warm male doctor avatar',
      controlTitle: 'Intake shell',
      controlBody: 'Placeholder turn-taking active hai.',
      askingLabel: 'Doctor pooch rahe hain',
      answeringLabel: 'Sun rahe hain',
      preparingStatus: 'Dr. Arjun next question ready kar rahe hain.',
      listeningStatus: 'Main sun raha hoon. Natural boliye, phir finish hone par thoda pause karein.',
      reflectionDefault: 'Thank you. Main is baat ko dhyaan mein rakh raha hoon.',
      tapToAnswer: 'Answer dene ke liye tap karein',
      simulateAnswer: 'Answer simulate karein',
      typeInstead: 'Type karein',
      typedPlaceholder: 'Apna answer yahan type karein',
      confirmAnswer: 'Haan, continue',
      fallbackTitle: 'Apna answer type karein',
      fallbackBody:
        'Yahan speech kaam nahi kar rahi. Aap answer type karke safely continue kar sakte hain.',
      noTranscript: 'Mujhe clear nahi mila. Dobara boliye ya type karein.',
      nextQuestion: 'Next question',
      summaryTitle: 'Intake summary',
      summaryBody:
        'Baad mein yahan real intake ka summary dikhega. Abhi yeh scripted questions ke baad handoff prove karta hai.',
      closingSpoken:
        'Thank you. Mere paas ab careful summary hai. Continue karne se pehle, kuch change ya add karna hai?',
      summaryInvitation: 'Continue karne se pehle kuch change ya add karna hai?',
      summaryListeningStatus: 'Ek change ya addition ke liye sun raha hoon.',
      summaryTypeInstead: 'Change type karein',
      editPlaceholder: 'Ek change ya addition boliye ya type karein',
      applyEdit: 'Change apply karein',
      editApplied: 'Maine yeh matching summary part mein add kar diya.',
      editNoted: 'Maine yeh doctor ke liye extra change ke roop mein note kar liya.',
      openEditLabel: 'Patient change ya addition',
      prescriptionTitle: 'Placeholder prescription',
      prescriptionBody:
        'Is staging shell mein prescription generate nahi hota. Yeh sirf future review surface hai.',
      downloadTitle: 'Download placeholder',
      downloadBody:
        'Download button ek local placeholder text file banata hai. Patient data upload nahi hota.',
      downloadCta: 'Placeholder download karein',
      restart: 'Script restart karein',
      missingAnswer: 'Abhi answer capture nahi hua',
      fieldLabels: {
        chiefComplaint: 'Main problem',
        duration: 'Duration',
        severity: 'Severity aur impact',
        associatedSymptoms: 'Aur symptoms',
        triedRemedies: 'Try ki hui remedy ya medicines',
        allergies: 'Allergies',
        currentMedications: 'Current medicines',
        recentTravel: 'Recent travel ya unusual food',
        sickContacts: 'Sick contacts',
        pastHistory: 'Long-term conditions ya past surgeries',
      },
      questions: [
        {
          field: 'chiefComplaint',
          text: 'Aaj sabse main problem kya hai jiske liye help chahiye?',
        },
        {
          field: 'duration',
          text: 'Yeh kab se start hua, aur better ho raha hai ya worse?',
        },
        {
          field: 'severity',
          text: 'Kitna severe hai, aur aapke day par kya effect ho raha hai?',
        },
        {
          field: 'associatedSymptoms',
          text: 'Aur kya symptoms hain, jaise fever, cough, pain, vomiting, ya breathing problem?',
        },
        {
          field: 'triedRemedies',
          text: 'Iske liye ab tak kaunsi medicine ya home remedy try ki hai?',
        },
        {
          field: 'allergies',
          text: 'Kisi medicine ya food se allergy hai?',
        },
        {
          field: 'currentMedications',
          text: 'Aap regular kaunsi medicines ya supplements lete hain?',
        },
        {
          field: 'recentTravel',
          text: 'Recently travel kiya hai ya kuch unusual khaya hai?',
        },
        {
          field: 'sickContacts',
          text: 'Aapke aas-paas kisi ko similar symptoms ya sickness hai?',
        },
        {
          field: 'pastHistory',
          text: 'Koi long-term condition ya past surgery hai jo doctor ko pata honi chahiye?',
        },
      ],
    },
  },
}

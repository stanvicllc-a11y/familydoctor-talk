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
    replayQuestion: string
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
    summaryPreparingStatus: string
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
      replayQuestion: 'Replay question',
      tapToAnswer: 'Tap to answer',
      simulateAnswer: 'Simulate answer',
      typeInstead: 'Type instead',
      typedPlaceholder: 'Type your answer here',
      confirmAnswer: 'Continue',
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
      summaryPreparingStatus: 'Dr. Arjun will listen for one change after the summary.',
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
      downloadTitle: 'Download summary',
      downloadBody:
        'The download button creates a local summary text file from this session. No patient data is uploaded.',
      downloadCta: 'Download summary',
      restart: 'Restart script',
      missingAnswer: '(not provided)',
      fieldLabels: {
        chiefComplaint: 'Main problem',
        duration: 'Duration',
        severity: 'Severity and impact',
        betterWorse: 'Better or worse',
        showMe: 'Visible symptoms or photos',
        throatCheck: 'Mouth or throat check',
        sickContacts: 'Sick contacts',
        recentTravel: 'Recent travel or unusual food',
        associatedSymptoms: 'Other symptoms',
        historyIntro: 'Medical history review',
        allergies: 'Allergies',
        currentMedications: 'Current medicines',
        conditions: 'Long-term conditions',
        surgeries: 'Past surgeries',
      },
      questions: [
        {
          field: 'chiefComplaint',
          text: 'What is the main problem you want help with today?',
          clipId: 'g1',
        },
        {
          field: 'duration',
          text: 'When did this start?',
          clipId: 'q_duration',
        },
        {
          field: 'severity',
          text: 'How bad is it, and how is it affecting your day?',
          clipId: 'q_severity',
        },
        {
          field: 'betterWorse',
          text: 'Has it been getting better, worse, or staying about the same?',
          clipId: 'q_betterworse',
        },
        {
          field: 'showMe',
          text: 'If there is anything visible, like a rash or swelling, can you show me or describe it?',
          clipId: 'q_showme',
        },
        {
          field: 'throatCheck',
          text: 'If your mouth or throat is involved, please say ahh or describe what you see.',
          clipId: 'q_ahh',
        },
        {
          field: 'sickContacts',
          text: 'Has anyone around you been sick with similar symptoms?',
          clipId: 'q_contacts',
        },
        {
          field: 'recentTravel',
          text: 'Have you travelled recently or eaten anything unusual?',
          clipId: 'q_travel',
        },
        {
          field: 'associatedSymptoms',
          text: 'What other symptoms have you noticed, like fever, cough, pain, vomiting, or breathing trouble?',
          clipId: 'q_ros',
        },
        {
          field: 'historyIntro',
          text: 'Now I want to confirm your medical history before the doctor reviews this.',
          clipId: 'q_hxintro',
        },
        {
          field: 'allergies',
          text: 'Do you have any allergies to medicines or foods?',
          clipId: 'q_allergies',
        },
        {
          field: 'currentMedications',
          text: 'What medicines or supplements do you take regularly?',
          clipId: 'q_meds',
        },
        {
          field: 'conditions',
          text: 'Do you have any long-term medical conditions?',
          clipId: 'q_conditions',
        },
        {
          field: 'surgeries',
          text: 'Have you had any surgeries the doctor should know about?',
          clipId: 'q_surgeries',
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
      replayQuestion: 'Question dobara sunayein',
      tapToAnswer: 'Answer dene ke liye tap karein',
      simulateAnswer: 'Answer simulate karein',
      typeInstead: 'Type karein',
      typedPlaceholder: 'Apna answer yahan type karein',
      confirmAnswer: 'Continue karein',
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
      summaryPreparingStatus: 'Summary ke baad Dr. Arjun ek change ke liye sunenge.',
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
      downloadTitle: 'Summary download',
      downloadBody:
        'Download button is session ka local summary text file banata hai. Patient data upload nahi hota.',
      downloadCta: 'Summary download karein',
      restart: 'Script restart karein',
      missingAnswer: '(not provided)',
      fieldLabels: {
        chiefComplaint: 'Main problem',
        duration: 'Duration',
        severity: 'Severity aur impact',
        betterWorse: 'Better ya worse',
        showMe: 'Visible symptoms ya photos',
        throatCheck: 'Mouth ya throat check',
        sickContacts: 'Sick contacts',
        recentTravel: 'Recent travel ya unusual food',
        associatedSymptoms: 'Aur symptoms',
        historyIntro: 'Medical history review',
        allergies: 'Allergies',
        currentMedications: 'Current medicines',
        conditions: 'Long-term conditions',
        surgeries: 'Past surgeries',
      },
      questions: [
        {
          field: 'chiefComplaint',
          text: 'Aaj sabse main problem kya hai jiske liye help chahiye?',
        },
        {
          field: 'duration',
          text: 'Yeh kab se start hua?',
        },
        {
          field: 'severity',
          text: 'Kitna severe hai, aur aapke day par kya effect ho raha hai?',
        },
        {
          field: 'betterWorse',
          text: 'Yeh better ho raha hai, worse ho raha hai, ya lagbhag same hai?',
        },
        {
          field: 'showMe',
          text: 'Agar kuch visible hai, jaise rash ya swelling, to mujhe dikhaiye ya describe kijiye.',
        },
        {
          field: 'throatCheck',
          text: 'Agar mouth ya throat involved hai, please ahh boliye ya jo dikh raha hai describe kijiye.',
        },
        {
          field: 'sickContacts',
          text: 'Aapke aas-paas kisi ko similar symptoms ya sickness hai?',
        },
        {
          field: 'recentTravel',
          text: 'Recently travel kiya hai ya kuch unusual khaya hai?',
        },
        {
          field: 'associatedSymptoms',
          text: 'Aur kya symptoms hain, jaise fever, cough, pain, vomiting, ya breathing problem?',
        },
        {
          field: 'historyIntro',
          text: 'Ab doctor review se pehle main aapki medical history confirm karna chahta hoon.',
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
          field: 'conditions',
          text: 'Kya aapko koi long-term medical conditions hain?',
        },
        {
          field: 'surgeries',
          text: 'Kya aapki koi past surgeries hui hain jo doctor ko pata honi chahiye?',
        },
      ],
    },
  },
}

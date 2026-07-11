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
    waitCue: string
    speakNowCue: string
    speakingHint: string
    listeningHint: string
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
    // --- UI strings localized in Stage 2 (used across the Talk flow) ---
    permEyebrow: string
    permTitle: string
    permPreparing: string
    permAllow: string
    permReady: string
    permUnsupported: string
    permBlocked: string
    permContinueTyped: string
    reviewTitle: string
    answeredFormat: string // tokens: {n} answered, {t} total
    editAction: string
    saveAction: string
    cancelAction: string
    submitAction: string
    addPhoto: string
    photoAttached: string
    replacePhoto: string
    removePhoto: string
    uploadTitle: string
    addPhotoOrReport: string
    addAnother: string
    submittedEyebrow: string
    submittedTitle: string
    submittedBody: string
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
      waitCue: 'Please wait',
      speakNowCue: 'Speak now',
      speakingHint: "I'm talking. Please wait until it is your turn so your answer is not missed.",
      listeningHint: 'Your turn. Speak naturally, then pause when you are finished.',
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
      permEyebrow: 'Talk setup',
      permTitle: 'Camera and microphone',
      permPreparing: 'Preparing camera and microphone...',
      permAllow: 'Allow camera and microphone once to start Talk.',
      permReady: 'Camera and microphone are ready.',
      permUnsupported: 'This browser cannot open camera or microphone here. You can continue with typed answers.',
      permBlocked: 'Camera or microphone was blocked. You can continue with typed answers.',
      permContinueTyped: 'Continue with typed answers',
      reviewTitle: 'Review your information',
      answeredFormat: '{n} of {t} answered',
      editAction: 'Edit',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      submitAction: 'Submit',
      addPhoto: 'Add a photo',
      photoAttached: 'Photo attached',
      replacePhoto: 'Replace',
      removePhoto: 'Remove',
      uploadTitle: 'Add a photo or report (optional)',
      addPhotoOrReport: 'Add a photo or report',
      addAnother: 'Add another',
      submittedEyebrow: 'Submitted',
      submittedTitle: 'Thank you',
      submittedBody: 'Submitted — the existing payment/checkout flow continues here in production.',
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
        pregnancy: 'Pregnancy',
      },
      questions: [
        {
          field: 'chiefComplaint',
          text: "Hello, I'm Raj, your AI Health Assistant. I'm here to listen and take good care of you. So tell me — what brings you in today? What's the main problem you're feeling right now?",
          clipId: 'g1',
        },
        {
          field: 'duration',
          text: 'And how long has this been going on for?',
          clipId: 'q_duration',
        },
        {
          field: 'severity',
          text: 'How bad is it for you — on a scale of 1 to 10?',
          clipId: 'q_severity',
        },
        {
          field: 'betterWorse',
          text: 'Does anything make it better or worse, and are there any other symptoms along with it?',
          clipId: 'q_betterworse',
        },
        {
          field: 'showMe',
          text: "If it's something I can see — like your throat, your skin, or the area that's troubling you — go ahead and show me, and I'll take a look.",
          clipId: 'q_showme',
        },
        {
          field: 'throatCheck',
          text: "If your throat is bothering you, open your mouth wide and say 'ahhh' — let me have a look.",
          clipId: 'q_ahh',
        },
        {
          field: 'sickContacts',
          text: 'Has anyone around you been unwell recently — someone at home or at work with something similar?',
          clipId: 'q_contacts',
        },
        {
          field: 'recentTravel',
          text: 'Have you travelled anywhere in the last month or so?',
          clipId: 'q_travel',
        },
        {
          field: 'associatedSymptoms',
          text: "Are you having any other symptoms as well — things like fever, chills, body aches, headache, cough, stomach upset, or anything on your skin? Tell me anything you've noticed, even small things.",
          clipId: 'q_ros',
        },
        {
          field: 'historyIntro',
          text: 'Now let me quickly understand your medical background, so I can take care of you safely.',
          clipId: 'q_hxintro',
        },
        {
          field: 'allergies',
          text: 'This is important — do you have any allergies? For example, to any medicines like penicillin, or to anything else? Please tell me everything you know of.',
          clipId: 'q_allergies',
        },
        {
          field: 'currentMedications',
          text: 'Are you currently taking any medicines regularly — anything for blood pressure, sugar, thyroid, or anything else?',
          clipId: 'q_meds',
        },
        {
          field: 'conditions',
          text: 'Do you have any ongoing health conditions — like diabetes, high blood pressure, asthma, thyroid, or heart problems?',
          clipId: 'q_conditions',
        },
        {
          field: 'surgeries',
          text: 'Have you had any surgeries or operations in the past?',
          clipId: 'q_surgeries',
        },
        {
          field: 'pregnancy',
          text: 'And just to be safe, since it matters for your treatment — is there any chance you might be pregnant right now?',
          clipId: 'q_pregnancy',
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
      waitCue: 'Kripya rukein',
      speakNowCue: 'Ab boliye',
      speakingHint: 'Main bol raha hoon. Kripya apni baat tab boliye jab aapki baari aaye.',
      listeningHint: 'Aapki baari. Aaraam se boliye, phir baat poori hone par thoda rukein.',
      tapToAnswer: 'Answer dene ke liye tap karein',
      simulateAnswer: 'Answer simulate karein',
      typeInstead: 'Type karein',
      typedPlaceholder: 'Apna answer yahan type karein',
      confirmAnswer: 'Aage badhein',
      fallbackTitle: 'Apna jawab type karein',
      fallbackBody:
        'Yahan awaaz kaam nahi kar rahi. Aap jawab likhkar aaraam se aage badh sakte hain.',
      noTranscript: 'Mujhe clear nahi mila. Dobara boliye ya type karein.',
      nextQuestion: 'Next question',
      summaryTitle: 'Intake summary',
      summaryBody:
        'Baad mein yahan real intake ka summary dikhega. Abhi yeh scripted questions ke baad handoff prove karta hai.',
      closingSpoken:
        'Dhanyavaad. Ab mere paas aapki puri jaankari hai. Aage badhne se pehle, kuch badalna ya jodna ho to bataiye.',
      summaryInvitation: 'Aage badhne se pehle kuch badalna ya jodna hai?',
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
      missingAnswer: '(nahi diya gaya)',
      permEyebrow: 'Talk setup',
      permTitle: 'Camera aur microphone',
      permPreparing: 'Camera aur microphone taiyaar ho raha hai...',
      permAllow: 'Talk shuru karne ke liye ek baar camera aur microphone allow karein.',
      permReady: 'Camera aur microphone taiyaar hain.',
      permUnsupported: 'Yeh browser yahan camera ya microphone nahi khol sakta. Aap type karke continue kar sakte hain.',
      permBlocked: 'Camera ya microphone block ho gaya. Aap type karke continue kar sakte hain.',
      permContinueTyped: 'Type karke continue karein',
      reviewTitle: 'Apni jaankari review karein',
      answeredFormat: '{t} me se {n} bhare',
      editAction: 'Badlein',
      saveAction: 'Save karein',
      cancelAction: 'Cancel karein',
      submitAction: 'Submit karein',
      addPhoto: 'Photo add karein',
      photoAttached: 'Photo lag gaya',
      replacePhoto: 'Badlein',
      removePhoto: 'Hatayein',
      uploadTitle: 'Photo ya report add karein (optional)',
      addPhotoOrReport: 'Photo ya report add karein',
      addAnother: 'Aur add karein',
      submittedEyebrow: 'Ho gaya',
      submittedTitle: 'Dhanyavaad',
      submittedBody: 'Submit ho gaya — production mein yahan se payment aur checkout flow aage badhta hai.',
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
        pregnancy: 'Pregnancy',
      },
      questions: [
        {
          field: 'chiefComplaint',
          text: 'Aaj sabse main problem kya hai jiske liye help chahiye?',
          clipId: 'g1',
        },
        {
          field: 'duration',
          text: 'Yeh kab se start hua?',
          clipId: 'q_duration',
        },
        {
          field: 'severity',
          text: 'Kitna severe hai, aur aapke day par kya effect ho raha hai?',
          clipId: 'q_severity',
        },
        {
          field: 'betterWorse',
          text: 'Yeh better ho raha hai, worse ho raha hai, ya lagbhag same hai?',
          clipId: 'q_betterworse',
        },
        {
          field: 'showMe',
          text: 'Agar kuch visible hai, jaise rash ya swelling, to mujhe dikhaiye ya describe kijiye.',
          clipId: 'q_showme',
        },
        {
          field: 'throatCheck',
          text: 'Agar mouth ya throat involved hai, please ahh boliye ya jo dikh raha hai describe kijiye.',
          clipId: 'q_ahh',
        },
        {
          field: 'sickContacts',
          text: 'Aapke aas-paas kisi ko similar symptoms ya sickness hai?',
          clipId: 'q_contacts',
        },
        {
          field: 'recentTravel',
          text: 'Recently travel kiya hai ya kuch unusual khaya hai?',
          clipId: 'q_travel',
        },
        {
          field: 'associatedSymptoms',
          text: 'Aur kya symptoms hain, jaise fever, cough, pain, vomiting, ya breathing problem?',
          clipId: 'q_ros',
        },
        {
          field: 'historyIntro',
          text: 'Ab doctor review se pehle main aapki medical history confirm karna chahta hoon.',
          clipId: 'q_hxintro',
        },
        {
          field: 'allergies',
          text: 'Kisi medicine ya food se allergy hai?',
          clipId: 'q_allergies',
        },
        {
          field: 'currentMedications',
          // Hindi: the filmed clip for this step (raj_q_conditionsmeds_hi) asks
          // about medicines AND long-term conditions together.
          text: 'Aap regular kaunsi medicines ya supplements lete hain?',
          clipId: 'q_meds',
        },
        {
          field: 'conditions',
          // No separate Hindi clip (merged into the medicines clip above) -> this
          // step falls back to the listening loop + TTS reading this line.
          text: 'Kya aapko koi long-term medical conditions hain?',
          clipId: 'q_conditions',
        },
        {
          field: 'surgeries',
          text: 'Kya aapki koi past surgeries hui hain jo doctor ko pata honi chahiye?',
          clipId: 'q_surgeries',
        },
        {
          field: 'pregnancy',
          text: 'Safety ke liye, kya pregnancy ka koi chance hai?',
          clipId: 'q_pregnancy',
        },
      ],
    },
  },
}

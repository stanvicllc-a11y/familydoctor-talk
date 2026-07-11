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
    shortLabel: 'हिंदी',
    languageLabel: 'भाषा चुनें',
    entry: {
      eyebrow: 'टॉक स्टेजिंग',
      title: 'डॉक्टर से बात करें',
      subtitle:
        'भविष्य के परामर्श फ़्लो के लिए एक निजी, वॉइस-फ़र्स्ट इनटेक शेल।',
      cta: 'डॉक्टर से बात करें',
      privacy: 'सिर्फ़ स्टेज बिल्ड: कोई रिकॉर्डिंग नहीं, कोई अपलोड नहीं, कोई बैकएंड राइट नहीं।',
    },
    talk: {
      eyebrow: 'टॉक शेल',
      title: 'डॉ. अर्जुन तैयार हैं',
      body: 'स्टेज 2 शेल प्लेसहोल्डर',
      back: 'एंट्री स्क्रीन पर वापस',
      cameraOff: 'कैमरा प्रीव्यू उपलब्ध नहीं है',
      cameraDenied: 'कैमरा की अनुमति नहीं मिली। आप प्रीव्यू बंद रखकर आगे बढ़ सकते हैं।',
      avatarStatus: 'गर्मजोशी वाला पुरुष डॉक्टर अवतार',
      controlTitle: 'इनटेक शेल',
      controlBody: 'प्लेसहोल्डर टर्न-टेकिंग चालू है।',
      askingLabel: 'डॉक्टर पूछ रहे हैं',
      answeringLabel: 'सुन रहे हैं',
      preparingStatus: 'डॉ. अर्जुन अगला सवाल तैयार कर रहे हैं।',
      listeningStatus: 'मैं सुन रहा हूँ। आराम से बोलिए, फिर बात पूरी होने पर थोड़ा रुकें।',
      reflectionDefault: 'धन्यवाद। मैं यह बात ध्यान में रख रहा हूँ।',
      replayQuestion: 'सवाल दोबारा सुनें',
      waitCue: 'कृपया रुकें',
      speakNowCue: 'अब बोलिए',
      speakingHint: 'मैं बोल रहा हूँ। कृपया अपनी बात तब बोलिए जब आपकी बारी आए।',
      listeningHint: 'आपकी बारी। आराम से बोलिए, फिर बात पूरी होने पर थोड़ा रुकें।',
      tapToAnswer: 'जवाब देने के लिए टैप करें',
      simulateAnswer: 'जवाब सिम्युलेट करें',
      typeInstead: 'टाइप करें',
      typedPlaceholder: 'अपना जवाब यहाँ टाइप करें',
      confirmAnswer: 'आगे बढ़ें',
      fallbackTitle: 'अपना जवाब टाइप करें',
      fallbackBody:
        'यहाँ आवाज़ काम नहीं कर रही। आप जवाब लिखकर आराम से आगे बढ़ सकते हैं।',
      noTranscript: 'मुझे साफ़ नहीं सुनाई दिया। दोबारा बोलिए या टाइप करें।',
      nextQuestion: 'अगला सवाल',
      summaryTitle: 'इनटेक सारांश',
      summaryBody:
        'बाद में यहाँ असली इनटेक का सारांश दिखेगा। अभी यह स्क्रिप्टेड सवालों के बाद हैंडऑफ़ दिखाता है।',
      closingSpoken:
        'धन्यवाद। अब मेरे पास आपकी पूरी जानकारी है। आगे बढ़ने से पहले, कुछ बदलना या जोड़ना हो तो बताइए।',
      summaryInvitation: 'आगे बढ़ने से पहले कुछ बदलना या जोड़ना है?',
      summaryPreparingStatus: 'सारांश के बाद डॉ. अर्जुन एक बदलाव के लिए सुनेंगे।',
      summaryListeningStatus: 'किसी बदलाव या जोड़ के लिए सुन रहा हूँ।',
      summaryTypeInstead: 'बदलाव टाइप करें',
      editPlaceholder: 'कोई बदलाव या जोड़ बोलिए या टाइप करें',
      applyEdit: 'बदलाव लागू करें',
      editApplied: 'मैंने यह आपके सारांश के सही हिस्से में जोड़ दिया।',
      editNoted: 'मैंने यह डॉक्टर के लिए एक अतिरिक्त बदलाव के रूप में नोट कर लिया।',
      openEditLabel: 'मरीज़ का बदलाव या जोड़',
      prescriptionTitle: 'प्लेसहोल्डर प्रिस्क्रिप्शन',
      prescriptionBody:
        'इस स्टेजिंग शेल में कोई प्रिस्क्रिप्शन नहीं बनता। यह सिर्फ़ भविष्य की रिव्यू सतह है।',
      downloadTitle: 'सारांश डाउनलोड',
      downloadBody:
        'डाउनलोड बटन इस सेशन की एक लोकल सारांश टेक्स्ट फ़ाइल बनाता है। मरीज़ का डेटा अपलोड नहीं होता।',
      downloadCta: 'सारांश डाउनलोड करें',
      restart: 'स्क्रिप्ट दोबारा शुरू करें',
      missingAnswer: '(नहीं बताया)',
      permEyebrow: 'टॉक सेटअप',
      permTitle: 'कैमरा और माइक्रोफ़ोन',
      permPreparing: 'कैमरा और माइक्रोफ़ोन तैयार हो रहा है...',
      permAllow: 'टॉक शुरू करने के लिए एक बार कैमरा और माइक्रोफ़ोन की अनुमति दें।',
      permReady: 'कैमरा और माइक्रोफ़ोन तैयार हैं।',
      permUnsupported: 'यह ब्राउज़र यहाँ कैमरा या माइक्रोफ़ोन नहीं खोल सकता। आप टाइप करके आगे बढ़ सकते हैं।',
      permBlocked: 'कैमरा या माइक्रोफ़ोन ब्लॉक हो गया। आप टाइप करके आगे बढ़ सकते हैं।',
      permContinueTyped: 'टाइप करके आगे बढ़ें',
      reviewTitle: 'अपनी जानकारी देख लें',
      answeredFormat: '{t} में से {n} भरे',
      editAction: 'बदलें',
      saveAction: 'सेव करें',
      cancelAction: 'रद्द करें',
      submitAction: 'सबमिट करें',
      addPhoto: 'फ़ोटो जोड़ें',
      photoAttached: 'फ़ोटो जुड़ गई',
      replacePhoto: 'बदलें',
      removePhoto: 'हटाएं',
      uploadTitle: 'फ़ोटो या रिपोर्ट जोड़ें (वैकल्पिक)',
      addPhotoOrReport: 'फ़ोटो या रिपोर्ट जोड़ें',
      addAnother: 'एक और जोड़ें',
      submittedEyebrow: 'हो गया',
      submittedTitle: 'धन्यवाद',
      submittedBody: 'सबमिट हो गया — प्रोडक्शन में यहाँ से पेमेंट और चेकआउट फ़्लो आगे बढ़ता है।',
      fieldLabels: {
        chiefComplaint: 'मुख्य तकलीफ़',
        duration: 'कब से है',
        severity: 'गंभीरता और असर',
        betterWorse: 'बेहतर या बदतर',
        showMe: 'दिखने वाले लक्षण या फ़ोटो',
        throatCheck: 'मुँह या गले की जाँच',
        sickContacts: 'बीमार संपर्क',
        recentTravel: 'हाल की यात्रा या अलग खाना',
        associatedSymptoms: 'और लक्षण',
        historyIntro: 'मेडिकल हिस्ट्री की समीक्षा',
        allergies: 'एलर्जी',
        currentMedications: 'मौजूदा दवाइयां',
        conditions: 'लंबे समय की बीमारियाँ',
        surgeries: 'पिछली सर्जरी',
        pregnancy: 'गर्भावस्था',
      },
      questions: [
        {
          field: 'chiefComplaint',
          text: 'आज सबसे बड़ी तकलीफ़ क्या है जिसके लिए मदद चाहिए?',
          clipId: 'g1',
        },
        {
          field: 'duration',
          text: 'यह कब से शुरू हुआ?',
          clipId: 'q_duration',
        },
        {
          field: 'severity',
          text: 'यह कितना ज़्यादा है, और आपके दिन पर क्या असर पड़ रहा है?',
          clipId: 'q_severity',
        },
        {
          field: 'betterWorse',
          text: 'यह बेहतर हो रहा है, बदतर हो रहा है, या लगभग एक जैसा है?',
          clipId: 'q_betterworse',
        },
        {
          field: 'showMe',
          text: 'अगर कुछ दिख रहा है, जैसे रैश या सूजन, तो मुझे दिखाइए या बता दीजिए।',
          clipId: 'q_showme',
        },
        {
          field: 'throatCheck',
          text: 'अगर मुँह या गला शामिल है, तो कृपया "आ" बोलिए या जो दिख रहा है बता दीजिए।',
          clipId: 'q_ahh',
        },
        {
          field: 'sickContacts',
          text: 'आपके आस-पास किसी को ऐसे ही लक्षण या बीमारी है?',
          clipId: 'q_contacts',
        },
        {
          field: 'recentTravel',
          text: 'हाल में कहीं यात्रा की है या कुछ अलग खाया है?',
          clipId: 'q_travel',
        },
        {
          field: 'associatedSymptoms',
          text: 'और क्या लक्षण हैं, जैसे बुखार, खांसी, दर्द, उल्टी, या साँस की तकलीफ़?',
          clipId: 'q_ros',
        },
        {
          field: 'historyIntro',
          text: 'अब डॉक्टर की समीक्षा से पहले मैं आपकी मेडिकल हिस्ट्री पक्की करना चाहता हूँ।',
          clipId: 'q_hxintro',
        },
        {
          field: 'allergies',
          text: 'किसी दवा या खाने से एलर्जी है?',
          clipId: 'q_allergies',
        },
        {
          field: 'currentMedications',
          // Hindi: the filmed clip for this step (raj_q_conditionsmeds_hi) asks
          // about medicines AND long-term conditions together.
          text: 'आप नियमित रूप से कौन-सी दवाइयां या सप्लीमेंट लेते हैं?',
          clipId: 'q_meds',
        },
        {
          field: 'conditions',
          // No separate Hindi clip (merged into the medicines clip above) -> this
          // step falls back to the listening loop + TTS reading this line.
          text: 'क्या आपको कोई लंबे समय की बीमारी है?',
          clipId: 'q_conditions',
        },
        {
          field: 'surgeries',
          text: 'क्या आपकी कोई पिछली सर्जरी हुई है जो डॉक्टर को पता होनी चाहिए?',
          clipId: 'q_surgeries',
        },
        {
          field: 'pregnancy',
          text: 'सुरक्षा के लिए, क्या गर्भावस्था की कोई संभावना है?',
          clipId: 'q_pregnancy',
        },
      ],
    },
  },
}

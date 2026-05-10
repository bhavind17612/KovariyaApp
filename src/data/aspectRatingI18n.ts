/**
 * Internationalisation strings for the Aspect Rating Sheet.
 * Covers: UI labels, aspect names, scale options, reason chips.
 */

export type SupportedLanguage = 'en' | 'hi' | 'gu' | 'mr' | 'ta' | 'te';

export const LANGUAGE_META: Record<SupportedLanguage, { label: string; nativeLabel: string; flag: string }> = {
  en: { label: 'English',   nativeLabel: 'English',    flag: '🇬🇧' },
  hi: { label: 'Hindi',     nativeLabel: 'हिन्दी',       flag: '🇮🇳' },
  gu: { label: 'Gujarati',  nativeLabel: 'ગુજરાતી',     flag: '🇮🇳' },
  mr: { label: 'Marathi',   nativeLabel: 'मराठी',       flag: '🇮🇳' },
  ta: { label: 'Tamil',     nativeLabel: 'தமிழ்',       flag: '🇮🇳' },
  te: { label: 'Telugu',    nativeLabel: 'తెలుగు',      flag: '🇮🇳' },
};

// ── UI strings ────────────────────────────────────────────────────────────────
export type RatingSheetStrings = {
  howWasBehaviour: string;
  sheetHint: string;
  sectionRating: string;
  ratingHint: string;
  sectionReasons: string;
  reasonHintPositive: string;
  reasonHintNeeds: string;
  sectionNote: string;
  notePlaceholder: string;
  voiceNoteAttached: string;
  voiceNoteRecord: string;
  saveEntry: string;
  save: string;
  saveAndNext: string;
  toastMaxReasons: string;
  stepLabel: (current: number, total: number) => string;
};

const UI_STRINGS: Record<SupportedLanguage, RatingSheetStrings> = {
  en: {
    howWasBehaviour: 'How was behaviour today?',
    sheetHint: 'Select a rating and add at least 2 reason chips, a text note, or a voice note to save. You can log this multiple times today.',
    sectionRating: 'Rating',
    ratingHint: 'Tap a score to choose points',
    sectionReasons: 'Reasons',
    reasonHintPositive: 'Positive',
    reasonHintNeeds: 'Needs work',
    sectionNote: 'Add note (optional)',
    notePlaceholder: 'Other reason or extra notes.',
    voiceNoteAttached: 'Voice note attached',
    voiceNoteRecord: 'Record voice note (optional)',
    saveEntry: 'Save entry',
    save: 'Save',
    saveAndNext: 'Save & Next',
    toastMaxReasons: 'You can pick up to two reasons — remove one to choose another.',
    stepLabel: (c, t) => `Step ${c} of ${t}`,
  },
  hi: {
    howWasBehaviour: 'आज का व्यवहार कैसा था?',
    sheetHint: 'रेटिंग चुनें और कम से कम 2 कारण, एक नोट या वॉइस नोट जोड़ें। आप आज इसे कई बार लॉग कर सकते हैं।',
    sectionRating: 'रेटिंग',
    ratingHint: 'अंक चुनने के लिए टैप करें',
    sectionReasons: 'कारण',
    reasonHintPositive: 'सकारात्मक',
    reasonHintNeeds: 'सुधार की जरूरत',
    sectionNote: 'नोट जोड़ें (वैकल्पिक)',
    notePlaceholder: 'अन्य कारण या अतिरिक्त नोट।',
    voiceNoteAttached: 'वॉइस नोट जोड़ा गया',
    voiceNoteRecord: 'वॉइस नोट रिकॉर्ड करें (वैकल्पिक)',
    saveEntry: 'सेव करें',
    save: 'सेव',
    saveAndNext: 'सेव & अगला',
    toastMaxReasons: 'आप अधिकतम दो कारण चुन सकते हैं — एक हटाएं।',
    stepLabel: (c, t) => `चरण ${c} / ${t}`,
  },
  gu: {
    howWasBehaviour: 'આજનું વર્તન કેવું હતું?',
    sheetHint: 'રેટિંગ પસંદ કરો અને ઓછામાં ઓછા 2 કારણ, એક નોંધ અથવા વૉઇસ નોટ ઉમેરો. આજે ઘણી વખત નોંધ કરી શકો છો.',
    sectionRating: 'રેટિંગ',
    ratingHint: 'ગુણ પસંદ કરવા ટૅપ કરો',
    sectionReasons: 'કારણો',
    reasonHintPositive: 'સકારાત્મક',
    reasonHintNeeds: 'સુધારો જરૂરી',
    sectionNote: 'નોંધ ઉમેરો (વૈકલ્પિક)',
    notePlaceholder: 'અન્ય કારણ અથવા વધારાની નોંધ.',
    voiceNoteAttached: 'વૉઇસ નોટ જોડ્યું',
    voiceNoteRecord: 'વૉઇસ નોટ રેકોર્ડ કરો (વૈકલ્પિક)',
    saveEntry: 'સેવ કરો',
    save: 'સેવ',
    saveAndNext: 'સેવ & આગળ',
    toastMaxReasons: 'તમે મહત્તમ બે કારણ પસંદ કરી શકો છો — એક દૂર કરો.',
    stepLabel: (c, t) => `પગલું ${c} / ${t}`,
  },
  mr: {
    howWasBehaviour: 'आजचे वर्तन कसे होते?',
    sheetHint: 'रेटिंग निवडा आणि किमान 2 कारणे, एक नोट किंवा व्हॉइस नोट जोडा. आज अनेकदा नोंद करता येते.',
    sectionRating: 'रेटिंग',
    ratingHint: 'गुण निवडण्यासाठी टॅप करा',
    sectionReasons: 'कारणे',
    reasonHintPositive: 'सकारात्मक',
    reasonHintNeeds: 'सुधारणा हवी',
    sectionNote: 'नोट जोडा (पर्यायी)',
    notePlaceholder: 'इतर कारण किंवा अतिरिक्त नोट.',
    voiceNoteAttached: 'व्हॉइस नोट जोडले',
    voiceNoteRecord: 'व्हॉइस नोट रेकॉर्ड करा (पर्यायी)',
    saveEntry: 'सेव्ह करा',
    save: 'सेव्ह',
    saveAndNext: 'सेव्ह & पुढे',
    toastMaxReasons: 'जास्तीत जास्त दोन कारणे निवडता येतात — एक काढा.',
    stepLabel: (c, t) => `पायरी ${c} / ${t}`,
  },
  ta: {
    howWasBehaviour: 'இன்றைய நடத்தை எப்படி இருந்தது?',
    sheetHint: 'மதிப்பீடு தேர்ந்தெடுத்து குறைந்தது 2 காரணங்கள், குறிப்பு அல்லது குரல் குறிப்பு சேர்க்கவும். இன்று பலமுறை பதிவு செய்யலாம்.',
    sectionRating: 'மதிப்பீடு',
    ratingHint: 'மதிப்பெண் தேர்ந்தெடுக்க தட்டவும்',
    sectionReasons: 'காரணங்கள்',
    reasonHintPositive: 'நேர்மறை',
    reasonHintNeeds: 'மேம்பாடு தேவை',
    sectionNote: 'குறிப்பு சேர்க்கவும் (விருப்பம்)',
    notePlaceholder: 'மற்ற காரணங்கள் அல்லது கூடுதல் குறிப்பு.',
    voiceNoteAttached: 'குரல் குறிப்பு இணைக்கப்பட்டது',
    voiceNoteRecord: 'குரல் குறிப்பு பதிவு செய்யவும் (விருப்பம்)',
    saveEntry: 'சேமிக்கவும்',
    save: 'சேமி',
    saveAndNext: 'சேமி & அடுத்து',
    toastMaxReasons: 'இரண்டு காரணங்கள் மட்டுமே தேர்வு செய்யலாம் — ஒன்றை நீக்கவும்.',
    stepLabel: (c, t) => `படி ${c} / ${t}`,
  },
  te: {
    howWasBehaviour: 'ఈ రోజు ప్రవర్తన ఎలా ఉంది?',
    sheetHint: 'రేటింగ్ ఎంచుకుని కనీసం 2 కారణాలు, నోట్ లేదా వాయిస్ నోట్ జోడించండి. ఈ రోజు అనేకసార్లు లాగ్ చేయవచ్చు.',
    sectionRating: 'రేటింగ్',
    ratingHint: 'పాయింట్లు ఎంచుకోవడానికి నొక్కండి',
    sectionReasons: 'కారణాలు',
    reasonHintPositive: 'సానుకూల',
    reasonHintNeeds: 'మెరుగుదల అవసరం',
    sectionNote: 'నోట్ జోడించండి (ఐచ్ఛికం)',
    notePlaceholder: 'ఇతర కారణాలు లేదా అదనపు నోట్లు.',
    voiceNoteAttached: 'వాయిస్ నోట్ జోడించబడింది',
    voiceNoteRecord: 'వాయిస్ నోట్ రికార్డ్ చేయండి (ఐచ్ఛికం)',
    saveEntry: 'సేవ్ చేయండి',
    save: 'సేవ్',
    saveAndNext: 'సేవ్ & తదుపరి',
    toastMaxReasons: 'రెండు కారణాలు మాత్రమే ఎంచుకోవచ్చు — ఒకటి తీసివేయండి.',
    stepLabel: (c, t) => `దశ ${c} / ${t}`,
  },
};

// ── Aspect name translations ───────────────────────────────────────────────────
const ASPECT_NAMES: Record<string, Record<SupportedLanguage, string>> = {
  respect:        { en: 'Respect',      hi: 'सम्मान',      gu: 'આદર',         mr: 'आदर',        ta: 'மரியாதை',     te: 'గౌరవం' },
  responsibility: { en: 'Responsibility', hi: 'जिम्मेदारी', gu: 'જવાબદારી',   mr: 'जबाबदारी',   ta: 'பொறுப்பு',   te: 'బాధ్యత' },
  kindness:       { en: 'Kindness',     hi: 'दयालुता',     gu: 'દયાળુપણું',   mr: 'दयाळूपणा',   ta: 'கருணை',      te: 'దయ' },
  discipline:     { en: 'Discipline',   hi: 'अनुशासन',     gu: 'શિસ્ત',       mr: 'शिस्त',      ta: 'ஒழுக்கம்',   te: 'క్రమశిక్షణ' },
  civic:          { en: 'Civic Sense',  hi: 'नागरिक बोध', gu: 'નાગરિક ભાવ',  mr: 'नागरी भाव',  ta: 'குடிமை உணர்வு', te: 'పౌర స్పృహ' },
};

// ── Scale option translations ──────────────────────────────────────────────────
const SCALE_LABELS: Record<number, Record<SupportedLanguage, string>> = {
  4:  { en: 'Excellent',           hi: 'उत्कृष्ट',       gu: 'ઉત્કૃષ્ટ',     mr: 'उत्कृष्ट',     ta: 'சிறந்தது',     te: 'అద్భుతం' },
  2:  { en: 'Strong',              hi: 'मजबूत',           gu: 'મજબૂત',        mr: 'मजबूत',        ta: 'வலிமையான',    te: 'బలంగా' },
  1:  { en: 'Improving',           hi: 'सुधार हो रहा है', gu: 'સુધર રહ્યું',  mr: 'सुधारत आहे',  ta: 'மேம்படுகிறது', te: 'మెరుగవుతోంది' },
  [-1]: { en: 'Inconsistent',      hi: 'अनिश्चित',        gu: 'અસ્થિર',       mr: 'अनियमित',     ta: 'ஒத்திசைவற்ற', te: 'అస్థిరంగా' },
  [-2]: { en: 'Below Expectations', hi: 'अपेक्षा से कम', gu: 'અपेक्षा से कम', mr: 'अपेक्षेपेक्षा कमी', ta: 'எதிர்பார்ப்பிற்கு கீழே', te: 'అంచనాలు తక్కువగా' },
  [-4]: { en: 'Needs Attention',   hi: 'ध्यान चाहिए',    gu: 'ધ્યાન જોઈએ',  mr: 'लक्ष हवे',    ta: 'கவனம் தேவை',  te: 'శ్రద్ధ అవసరం' },
};

// ── Reason chip translations ───────────────────────────────────────────────────
const REASON_CHIP_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  // Positive
  p0: { en: 'Listened well',      hi: 'ध्यान से सुना',   gu: 'ધ્યાનથી સાંભળ્યું', mr: 'लक्ष देऊन ऐकले',  ta: 'கவனமாகக் கேட்டது',  te: 'శ్రద్ధగా విన్నారు' },
  p1: { en: 'Showed empathy',     hi: 'सहानुभूति दिखाई', gu: 'સહાનુભૂતિ બતાવી',   mr: 'सहानुभूती दाखवली', ta: 'அனுதாபம் காட்டியது', te: 'సానుభూతి చూపారు' },
  p2: { en: 'Took responsibility', hi: 'जिम्मेदारी ली',  gu: 'જવાબદારી લીધી',     mr: 'जबाबदारी स्वीकारली', ta: 'பொறுப்பேற்றது',     te: 'బాధ్యత తీసుకున్నారు' },
  p3: { en: 'Helpful at home',    hi: 'घर में मददगार',   gu: 'ઘરે મદદગાર',        mr: 'घरी मदत केली',    ta: 'வீட்டில் உதவியது',   te: 'ఇంట్లో సహాయపడ్డారు' },
  p4: { en: 'Polite tone',        hi: 'विनम्र स्वर',     gu: 'વિનમ્ર ભાષા',        mr: 'विनम्र स्वर',      ta: 'பண்பான தொனி',       te: 'మర్యాదగా మాట్లాడారు' },
  p5: { en: 'Finished tasks',     hi: 'काम पूरा किया',   gu: 'કામ પૂર્ણ કર્યું',   mr: 'काम पूर्ण केले',   ta: 'பணிகளை முடித்தது',   te: 'పనులు పూర్తి చేసారు' },
  p6: { en: 'Positive attitude',  hi: 'सकारात्मक सोच',  gu: 'સકારાત્મક વલણ',      mr: 'सकारात्मक दृष्टिकोन', ta: 'நேர்மறை மனோபாவம்', te: 'సానుకూల వైఖరి' },
  // Negative
  n0: { en: 'Dismissive',         hi: 'उपेक्षा करना',    gu: 'ઉપેક્ષા કરવી',      mr: 'दुर्लक्ष करणे',    ta: 'அலட்சியம்',         te: 'నిరాదరణ' },
  n1: { en: 'Interrupting',       hi: 'बात काटना',       gu: 'વાત કાપવી',          mr: 'मध्येच बोलणे',     ta: 'குறுக்கிடுதல்',     te: 'అడ్డు పడడం' },
  n2: { en: 'Avoiding chores',    hi: 'काम से बचना',     gu: 'કામ ટાળવું',         mr: 'कामापासून दूर',    ta: 'வீட்டு வேலை தவிர்த்தல்', te: 'పనులు తప్పించుకోవడం' },
  n3: { en: 'Raised voice',       hi: 'आवाज उठाना',      gu: 'ઊંચા સ્વરે બોલવું', mr: 'आवाज चढवणे',       ta: 'குரல் உயர்த்தல்',   te: 'గొంతు పెంచారు' },
  n4: { en: 'Defensive',          hi: 'बचाव की मुद्रा',  gu: 'રક્ષણાત્મક',         mr: 'बचावात्मक',        ta: 'தற்காப்பு நிலை',    te: 'రక్షణాత్మకంగా' },
  n5: { en: 'Rushed / careless',  hi: 'जल्दबाजी/लापरवाही', gu: 'ઉતાવળ/બેદરકારી', mr: 'घाई/निष्काळजीपणा', ta: 'அவசரம் / கவனக்குறைவு', te: 'తొందరపాటు/అజాగ్రత్త' },
  n6: { en: 'Withdrawn',          hi: 'खुद में खोना',    gu: 'ખૂટી ગયેલ',          mr: 'माघार',            ta: 'ஒதுங்கிவிடுதல்',   te: 'వెనక్కి తగ్గడం' },
};

// ── Public helpers ─────────────────────────────────────────────────────────────
export function getUIStrings(lang: SupportedLanguage): RatingSheetStrings {
  return UI_STRINGS[lang];
}

export function getAspectName(aspectId: string, lang: SupportedLanguage): string {
  return ASPECT_NAMES[aspectId]?.[lang] ?? aspectId;
}

export function getScaleLabel(value: number, lang: SupportedLanguage): string {
  return SCALE_LABELS[value]?.[lang] ?? String(value);
}

export function getReasonChipLabel(chipId: string, lang: SupportedLanguage): string {
  return REASON_CHIP_LABELS[chipId]?.[lang] ?? chipId;
}

// The server accepts only these codes; client text never becomes a prompt instruction.
export const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", step: "Step", finalAnswer: "Final Answer", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", step: "Paso", finalAnswer: "Respuesta final", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", step: "Étape", finalAnswer: "Réponse finale", dir: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", step: "Passo", finalAnswer: "Resposta final", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", step: "Schritt", finalAnswer: "Endergebnis", dir: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", step: "Шаг", finalAnswer: "Ответ", dir: "ltr" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", step: "Крок", finalAnswer: "Відповідь", dir: "ltr" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbekcha", step: "Qadam", finalAnswer: "Yakuniy javob", dir: "ltr" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", step: "Adım", finalAnswer: "Sonuç", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", step: "الخطوة", finalAnswer: "الإجابة النهائية", dir: "rtl" },
  { code: "fa", name: "Persian", nativeName: "فارسی", step: "گام", finalAnswer: "پاسخ نهایی", dir: "rtl" },
  { code: "ur", name: "Urdu", nativeName: "اردو", step: "مرحلہ", finalAnswer: "حتمی جواب", dir: "rtl" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", step: "चरण", finalAnswer: "अंतिम उत्तर", dir: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", step: "ধাপ", finalAnswer: "চূড়ান্ত উত্তর", dir: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "中文", step: "步骤", finalAnswer: "最终答案", dir: "ltr" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", step: "Langkah", finalAnswer: "Jawaban akhir", dir: "ltr" },
] as const;

export type Locale = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LANGUAGE_STORAGE_KEY = "mathsolver_language";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LANGUAGES.some(({ code }) => code === value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getLanguage(value: unknown) {
  const locale = resolveLocale(value);
  return LANGUAGES.find(({ code }) => code === locale)!;
}

export function detectBrowserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function buildLanguageInstruction(value: unknown, format: "solution" | "json"): string {
  // Preserve the existing behavior for older/mobile clients with no preference.
  if (value === undefined) return "";
  const language = getLanguage(value);
  return `\n\nRESPONSE LANGUAGE:\nWrite all learner-facing explanations in ${language.name}, using simple, clear language, even when the problem or earlier messages are in another language. Preserve mathematical notation, LaTeX, variables, and the problem's meaning. ${
    format === "solution"
      ? `Use bold step headers in the form **${language.step} 1: ...** with Western digits (1, 2, 3), and end with **${language.finalAnswer}**. These localized labels replace the English step and final-answer labels above. Preserve the horizontal rules and math delimiters.`
      : "Translate titles, question text, option descriptions, and explanations. Keep JSON property names, structure, and numeric answer indexes unchanged; do not translate LaTeX commands."
  }`;
}

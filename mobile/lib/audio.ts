import * as Speech from "expo-speech";

const LANGUAGE_TO_BCP47: Record<string, string> = {
  chinese: "zh-CN",
  mandarin: "zh-CN",
  japanese: "ja-JP",
  korean: "ko-KR",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  italian: "it-IT",
  portuguese: "pt-BR",
  arabic: "ar-SA",
  hindi: "hi-IN",
  russian: "ru-RU",
};

export function languageToBcp47(language: string): string {
  return LANGUAGE_TO_BCP47[language.toLowerCase()] ?? "zh-CN";
}

export function speakText(text: string, language: string, rate = 1.0): void {
  Speech.stop();
  Speech.speak(text, {
    language: languageToBcp47(language),
    rate,
    pitch: 1.0,
  });
}


export function stopSpeaking(): void {
  Speech.stop();
}

import { Platform } from "react-native";
import * as Speech from "expo-speech";

let audioModeConfigured = false;

async function ensureAudioModeConfigured(): Promise<void> {
  if (Platform.OS !== "ios" || audioModeConfigured) return;

  try {
    const { Audio } = await import("expo-av");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    audioModeConfigured = true;
  } catch (error) {
    console.warn("Failed to configure iOS audio mode:", error);
    // audioModeConfigured stays false so the next speak call retries
  }
}

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

let webSpeakTimer: ReturnType<typeof setTimeout> | null = null;

export async function speakText(text: string, language: string, rate = 1.0): Promise<void> {
  const bcp47 = languageToBcp47(language);

  if (Platform.OS === "web") {
    if (webSpeakTimer) clearTimeout(webSpeakTimer);
    Speech.stop();
    webSpeakTimer = setTimeout(() => {
      webSpeakTimer = null;
      Speech.speak(text, { language: bcp47, rate, pitch: 1.0 });
    }, 100);
  } else {
    await ensureAudioModeConfigured();
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) Speech.stop();
    Speech.speak(text, { language: bcp47, rate });
  }
}

export function stopSpeaking(): void {
  if (webSpeakTimer) {
    clearTimeout(webSpeakTimer);
    webSpeakTimer = null;
  }
  Speech.stop();
}

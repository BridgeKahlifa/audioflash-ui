import { Platform } from "react-native";
import * as Speech from "expo-speech";

let audioModeConfigurationPromise: Promise<void> | null = null;
let expoAudioModulePromise: Promise<{ setAudioModeAsync: (options: { playsInSilentModeIOS: boolean }) => Promise<void> } | null> | null = null;

async function loadExpoAudioModule(): Promise<{ setAudioModeAsync: (options: { playsInSilentModeIOS: boolean }) => Promise<void> } | null> {
  if (Platform.OS !== "ios") return null;

  if (!expoAudioModulePromise) {
    expoAudioModulePromise = import("expo-av")
      .then((module) => module.Audio ?? null)
      .catch((error) => {
        console.warn("expo-av is unavailable in this build; skipping iOS audio mode setup", error);
        return null;
      });
  }

  return expoAudioModulePromise;
}

async function ensureAudioModeConfigured(): Promise<void> {
  if (Platform.OS !== "ios") return;

  if (!audioModeConfigurationPromise) {
    audioModeConfigurationPromise = loadExpoAudioModule()
      .then(async (audioModule) => {
        if (!audioModule) return;
        await audioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });
      })
      .catch((error) => {
        audioModeConfigurationPromise = null;
        throw error;
      });
  }

  try {
    await audioModeConfigurationPromise;
  } catch (error) {
    console.warn("Failed to configure iOS audio mode", error);
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

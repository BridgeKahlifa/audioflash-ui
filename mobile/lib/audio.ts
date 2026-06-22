import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { captureGlobalHandledException } from "./analytics";

let audioModeConfigured = false;
let iosSpeechRequestId = 0;
let iosSessionKeeper:
  | {
      unloadAsync(): Promise<unknown>;
    }
  | null = null;
let iosSessionSetupPromise: Promise<void> | null = null;

// Expo AV only applies the iOS playback category once an AV object is active.
// A muted looping silent sound keeps that session alive while expo-speech speaks.
const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

async function ensureAudioModeConfigured(): Promise<void> {
  if (Platform.OS !== "ios" || audioModeConfigured) return;

  try {
    const { Audio } = await import("expo-av");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    audioModeConfigured = true;
  } catch (error) {
    captureGlobalHandledException(error, {
      error_context: "audio_configure_ios_mode",
      platform: Platform.OS,
    });
    console.warn("Failed to configure iOS audio mode:", error);
    // audioModeConfigured stays false so the next speak call retries
  }
}

async function ensureIosSpeechSessionActive(): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (iosSessionKeeper) return;
  if (iosSessionSetupPromise) return iosSessionSetupPromise;

  iosSessionSetupPromise = (async () => {
    await ensureAudioModeConfigured();

    const { Audio } = await import("expo-av");
    const sound = new Audio.Sound();

    try {
      await sound.loadAsync(
        { uri: SILENT_WAV_DATA_URI },
        {
          shouldPlay: true,
          isLooping: true,
          isMuted: true,
        },
        false,
      );
      iosSessionKeeper = sound;
    } catch (error) {
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore cleanup failures after a setup failure.
      }
      throw error;
    }
  })();

  try {
    await iosSessionSetupPromise;
  } finally {
    iosSessionSetupPromise = null;
  }
}

async function cleanupIosSpeechSession(requestId: number): Promise<void> {
  if (Platform.OS !== "ios" || requestId !== iosSpeechRequestId) return;

  const sound = iosSessionKeeper;
  iosSessionKeeper = null;

  if (!sound) return;

  try {
    await sound.unloadAsync();
  } catch (error) {
    captureGlobalHandledException(error, {
      error_context: "audio_cleanup_ios_speech_session",
      platform: Platform.OS,
    });
    console.warn("Failed to tear down iOS speech audio session:", error);
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
    const requestId = Platform.OS === "ios" ? ++iosSpeechRequestId : 0;

    if (Platform.OS === "ios") {
      try {
        await ensureIosSpeechSessionActive();
      } catch (error) {
        captureGlobalHandledException(error, {
          error_context: "audio_activate_ios_speech_session",
          platform: Platform.OS,
        });
        console.warn("Failed to activate iOS speech audio session:", error);
      }
    } else {
      await ensureAudioModeConfigured();
    }

    const speaking = await Speech.isSpeakingAsync();
    if (speaking) await Speech.stop();

    Speech.speak(text, {
      language: bcp47,
      rate,
      ...(Platform.OS === "ios"
        ? {
            useApplicationAudioSession: true,
            onDone: () => {
              void cleanupIosSpeechSession(requestId);
            },
            onStopped: () => {
              void cleanupIosSpeechSession(requestId);
            },
            onError: () => {
              void cleanupIosSpeechSession(requestId);
            },
          }
        : {}),
    });
  }
}

export function stopSpeaking(): void {
  if (webSpeakTimer) {
    clearTimeout(webSpeakTimer);
    webSpeakTimer = null;
  }

  if (Platform.OS === "ios") {
    const requestId = ++iosSpeechRequestId;
    void cleanupIosSpeechSession(requestId);
  }

  Speech.stop();
}

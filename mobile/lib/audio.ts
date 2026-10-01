import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { captureGlobalEvent, captureGlobalHandledException } from "./analytics";

let audioModeConfigured = false;
let iosSpeechRequestId = 0;
let iosSessionKeeper:
  | {
      unloadAsync(): Promise<unknown>;
    }
  | null = null;
let iosSessionSetupPromise: Promise<void> | null = null;
let androidSpeechRequestId = 0;

const VOICE_ENUMERATION_TIMEOUT_MS = 3000;
const SPEECH_START_TIMEOUT_MS = 3000;

export type MissingSpeechVoice = {
  language: string;
  locale: string;
};

let missingVoiceHandler: ((requirement: MissingSpeechVoice) => void) | null = null;

export function setMissingSpeechVoiceHandler(
  handler: ((requirement: MissingSpeechVoice) => void) | null,
): void {
  missingVoiceHandler = handler;
}

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

function requiredVoice(language: string): MissingSpeechVoice | null {
  const normalized = language.trim().toLowerCase();
  if (normalized.includes("chinese") || normalized === "mandarin" || normalized.startsWith("zh-")) {
    const locale = normalized.includes("traditional") || normalized.includes("taiwan")
      ? "zh-TW"
      : languageToBcp47(language);
    return { language: "Chinese", locale };
  }
  if (normalized.includes("japanese") || normalized.startsWith("ja-")) {
    return { language: "Japanese", locale: "ja-JP" };
  }
  if (normalized.includes("french") || normalized.startsWith("fr-")) {
    return { language: "French", locale: "fr-FR" };
  }
  if (normalized.includes("spanish") || normalized.startsWith("es-")) {
    return { language: "Spanish", locale: "es-ES" };
  }
  if (normalized.includes("german") || normalized.startsWith("de-")) {
    return { language: "German", locale: "de-DE" };
  }
  return null;
}

function normalizeLocale(locale: string): string {
  return locale.replace(/_/g, "-").toLowerCase();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function ensureSpeechVoiceAvailable(language: string): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const requirement = requiredVoice(language);
  if (!requirement) return true;

  try {
    const voices = await withTimeout(
      Speech.getAvailableVoicesAsync(),
      VOICE_ENUMERATION_TIMEOUT_MS,
      "Android speech voice enumeration",
    );
    const requiredLocale = normalizeLocale(requirement.locale);
    const requiredLanguage = requiredLocale.split("-")[0];
    const available = voices.some((voice) => {
      const voiceLocale = normalizeLocale(voice.language);
      return voiceLocale === requiredLocale || voiceLocale.split("-")[0] === requiredLanguage;
    });

    if (!available) missingVoiceHandler?.(requirement);
    return available;
  } catch (error) {
    captureGlobalHandledException(error, {
      error_context: "audio_check_android_voice",
      language,
    });
    return true;
  }
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
    const androidRequestId = Platform.OS === "android" ? ++androidSpeechRequestId : 0;

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

    let speechStartTimer: ReturnType<typeof setTimeout> | null = null;
    const clearSpeechStartTimer = () => {
      if (!speechStartTimer) return;
      clearTimeout(speechStartTimer);
      speechStartTimer = null;
    };

    if (Platform.OS === "android") {
      speechStartTimer = setTimeout(() => {
        speechStartTimer = null;
        captureGlobalHandledException(new Error("Android speech did not start within 3 seconds"), {
          error_context: "audio_android_speech_start_timeout",
          language,
          locale: bcp47,
          rate,
          request_id: androidRequestId,
          was_speaking_before_request: speaking,
        });
      }, SPEECH_START_TIMEOUT_MS);
    }

    try {
      Speech.speak(text, {
        language: bcp47,
        rate,
        onStart: () => {
          clearSpeechStartTimer();
          if (Platform.OS === "android") {
            captureGlobalEvent("audio_android_speech_started", {
              language,
              locale: bcp47,
              rate,
              request_id: androidRequestId,
            });
          }
        },
        onDone: () => {
          clearSpeechStartTimer();
          if (Platform.OS === "ios") {
            void cleanupIosSpeechSession(requestId);
          } else if (Platform.OS === "android") {
            captureGlobalEvent("audio_android_speech_completed", {
              language,
              locale: bcp47,
              rate,
              request_id: androidRequestId,
            });
          }
        },
        onStopped: () => {
          clearSpeechStartTimer();
          if (Platform.OS === "ios") {
            void cleanupIosSpeechSession(requestId);
          } else if (Platform.OS === "android") {
            captureGlobalEvent("audio_android_speech_stopped", {
              language,
              locale: bcp47,
              rate,
              request_id: androidRequestId,
            });
          }
        },
        onError: (error) => {
          clearSpeechStartTimer();
          if (Platform.OS === "ios") {
            void cleanupIosSpeechSession(requestId);
          } else if (Platform.OS === "android") {
            captureGlobalHandledException(error, {
              error_context: "audio_android_speech_error",
              language,
              locale: bcp47,
              rate,
              request_id: androidRequestId,
            });
          }
        },
        ...(Platform.OS === "ios" ? { useApplicationAudioSession: true } : {}),
      });
    } catch (error) {
      clearSpeechStartTimer();
      captureGlobalHandledException(error, {
        error_context: "audio_speech_request_failed",
        platform: Platform.OS,
        language,
        locale: bcp47,
        rate,
      });
      throw error;
    }
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

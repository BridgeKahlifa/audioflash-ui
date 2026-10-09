import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { requireOptionalNativeModule } from "expo-modules-core";
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
let androidSpeechGeneration = 0;
let androidActiveSpeechRequestId: number | null = null;
let androidDiagnosticsSubscribed = false;

const VOICE_ENUMERATION_TIMEOUT_MS = 3000;
const SPEECH_START_TIMEOUT_MS = 3000;

export type MissingSpeechVoice = {
  language: string;
  locale: string;
  reason?: "missing" | "check_failed" | "playback_failed";
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
  "traditional chinese": "zh-TW",
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
  const normalized = language.trim().toLowerCase();
  const locale = normalized === "zh-tw" || normalized.includes("chinese") && (normalized.includes("traditional") || normalized.includes("taiwan"))
    ? "zh-TW"
    : LANGUAGE_TO_BCP47[normalized] ?? Object.values(LANGUAGE_TO_BCP47).find((value) => value.toLowerCase() === normalized);
  if (!locale) throw new Error(`Unsupported speech language: ${language}`);
  return locale;
}

type NativeSpeechDiagnostic = {
  id?: string;
  phase?: string;
  requestedLocale?: string;
  selectedLocale?: string;
  selectedVoice?: string;
  engine?: string;
  availability?: number;
  setLanguageResult?: number;
  speakResult?: number;
  initStatus?: number;
  interrupted?: boolean;
};

function subscribeToAndroidSpeechDiagnostics(): void {
  if (Platform.OS !== "android" || androidDiagnosticsSubscribed) return;
  const nativeSpeech = requireOptionalNativeModule("ExpoSpeech");
  if (!nativeSpeech) return;
  nativeSpeech.addListener("Exponent.speakingDiagnostic", (diagnostic: NativeSpeechDiagnostic) => {
    captureGlobalEvent("audio_android_native_diagnostic", {
      native_utterance_id: diagnostic.id ?? null,
      phase: diagnostic.phase ?? null,
      requested_locale: diagnostic.requestedLocale ?? null,
      selected_locale: diagnostic.selectedLocale ?? null,
      selected_voice: diagnostic.selectedVoice ?? null,
      engine: diagnostic.engine ?? null,
      availability: diagnostic.availability ?? null,
      set_language_result: diagnostic.setLanguageResult ?? null,
      speak_result: diagnostic.speakResult ?? null,
      init_status: diagnostic.initStatus ?? null,
      interrupted: diagnostic.interrupted ?? null,
    });
  });
  androidDiagnosticsSubscribed = true;
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

    captureGlobalEvent("audio_android_voice_check", {
      language,
      locale: requirement.locale,
      available,
      voice_count: voices.length,
    });
    if (!available) missingVoiceHandler?.({ ...requirement, reason: "missing" });
    return available;
  } catch (error) {
    captureGlobalHandledException(error, {
      error_context: "audio_check_android_voice",
      language,
    });
    missingVoiceHandler?.({ ...requirement, reason: "check_failed" });
    return false;
  }
}

let webSpeakTimer: ReturnType<typeof setTimeout> | null = null;

export async function speakText(text: string, language: string, rate = 1.0): Promise<void> {
  let bcp47: string;
  try {
    bcp47 = languageToBcp47(language);
  } catch (error) {
    captureGlobalHandledException(error, {
      error_context: "audio_unsupported_language",
      language,
      platform: Platform.OS,
    });
    return;
  }

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
    const androidGeneration = Platform.OS === "android" ? ++androidSpeechGeneration : 0;
    if (Platform.OS === "android") subscribeToAndroidSpeechDiagnostics();

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
    if (Platform.OS === "android" && androidGeneration !== androidSpeechGeneration) return;
    const pendingAndroidRequestId = Platform.OS === "android" ? androidActiveSpeechRequestId : null;
    if (speaking || pendingAndroidRequestId !== null) {
      if (Platform.OS === "android") {
        captureGlobalEvent("audio_android_stop_requested", {
          stopped_request_id: pendingAndroidRequestId,
          replacing_request_id: androidRequestId,
          reason: "new_speech_request",
          was_speaking: speaking,
        });
      }
      await Speech.stop();
    }
    if (Platform.OS === "android" && androidGeneration !== androidSpeechGeneration) return;

    const requestedAt = Date.now();
    let started = false;
    let speechStartTimer: ReturnType<typeof setTimeout> | null = null;
    const clearSpeechStartTimer = () => {
      if (!speechStartTimer) return;
      clearTimeout(speechStartTimer);
      speechStartTimer = null;
    };

    if (Platform.OS === "android") {
      androidActiveSpeechRequestId = androidRequestId;
      captureGlobalEvent("audio_android_speech_requested", {
        language,
        locale: bcp47,
        rate,
        request_id: androidRequestId,
        text_length: text.length,
        was_speaking_before_request: speaking,
      });
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
          started = true;
          clearSpeechStartTimer();
          if (Platform.OS === "android") {
            captureGlobalEvent("audio_android_speech_started", {
              language,
              locale: bcp47,
              rate,
              request_id: androidRequestId,
              time_to_start_ms: Date.now() - requestedAt,
            });
          }
        },
        onDone: () => {
          clearSpeechStartTimer();
          if (Platform.OS === "android" && androidActiveSpeechRequestId === androidRequestId) {
            androidActiveSpeechRequestId = null;
          }
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
          if (Platform.OS === "android" && androidActiveSpeechRequestId === androidRequestId) {
            androidActiveSpeechRequestId = null;
          }
          if (Platform.OS === "ios") {
            void cleanupIosSpeechSession(requestId);
          } else if (Platform.OS === "android") {
            captureGlobalEvent("audio_android_speech_stopped", {
              language,
              locale: bcp47,
              rate,
              request_id: androidRequestId,
              started,
              elapsed_ms: Date.now() - requestedAt,
            });
            if (!started) {
              captureGlobalEvent("audio_android_speech_prestart_stopped", {
                language,
                locale: bcp47,
                request_id: androidRequestId,
                elapsed_ms: Date.now() - requestedAt,
              });
            }
          }
        },
        onError: (error) => {
          clearSpeechStartTimer();
          if (Platform.OS === "android" && androidActiveSpeechRequestId === androidRequestId) {
            androidActiveSpeechRequestId = null;
          }
          if (Platform.OS === "ios") {
            void cleanupIosSpeechSession(requestId);
          } else if (Platform.OS === "android") {
            captureGlobalHandledException(error, {
              error_context: "audio_android_speech_error",
              language,
              locale: bcp47,
              rate,
              request_id: androidRequestId,
              started,
            });
            if (!started) missingVoiceHandler?.({ language, locale: bcp47, reason: "playback_failed" });
          }
        },
        ...(Platform.OS === "ios" ? { useApplicationAudioSession: true } : {}),
      });
    } catch (error) {
      clearSpeechStartTimer();
      if (Platform.OS === "android" && androidActiveSpeechRequestId === androidRequestId) {
        androidActiveSpeechRequestId = null;
      }
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
